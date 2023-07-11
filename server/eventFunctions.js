const dbFunctions = require('./db');
const encryption = require('./encryption');
const specials = require('./specials.json');

/**
 *
 * @param {String}username
 * @param {String}sessionToken
 * @return {Promise<void>}
 */
async function validate(username, sessionToken /*password*/) {
    return await dbFunctions.checkSessionCookie(username, sessionToken);
}

/**
 *
 * @param {WebSocket}socket
 * @param {String}username
 * @return {Promise<void>}
 */
async function fetchchats(socket, username) {
    const chats = await dbFunctions.fetchChats(username);
    sendEvent(socket, 'fetchChats', {
        chats: chats,
    });
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{username:string, password:string}>}data
 * @param {Array<WebSocket>}sockets
 * @param {String}type
 * @return {Promise<void>}
 */
async function login(socket, data, sockets, type) {
    if (!data.username || !data.password) {
        return false;
    }
    data.username = data.username.toLowerCase();
    if (
        !(
            data.password.match(/[a-z]/g) &&
            data.password.match(/[A-Z]/g) &&
            data.password.match(/[0-9]/g) &&
            data.password.match(/\W/g) &&
            data.password.length >= 8 &&
            data.password.length <= 32 &&
            data.username.match(/^[a-zA-Z0-9._\-+]*$/g) &&
            data.username.length <= 16
        )
    ) {
        sendEvent(socket, 'login', {
            status: false,
            sessionToken: null,
        });
        return;
    }

    if (type === "login") {
        if(!await dbFunctions.validateUser(data.username, data.password)){
            sendError(socket, "Incorrect username and/or password, please try again.");
            return false;
        }
    } else {
        if(!await dbFunctions.createUser(data.username, data.password)){
            sendError(socket, "Username already exists.");
            return false;
        }
    }
    let loginToken = await dbFunctions.storeSessionCookie(data.username.toLowerCase());

    if (loginToken) {
        for (const s of sockets) {
            if (s.socket === socket) {
                s.username = data.username;
                break;
            }
        }
        sendEvent(socket, 'login', {
            status: true,
            sessionToken: loginToken,
        });
    } else {
        sendEvent(socket, 'login', {
            status: false,
            sessionToken: null,
        });
    }
}

/**
 * remove session Cookies
 * @param{WebSocket}socket
 * @param{string}username
 * @return {Promise<void>}
 */
async function logout(socket, username) {
    const result = await dbFunctions.deleteSessionCookie(username);
    sendEvent(socket, 'logout', {
        status: result
    }).then();
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{users: Array, type:String, name:String}>}data
 * @param {String}username
 * @return {Promise<boolean>}
 */
async function createChat(socket, data, username) {
    for (let i = 0; i < data.users.length; i++) {
        data.users[i] = data.users[i].toLowerCase();

    }
    data.users.push(username);
    if (data.type === "user") {
        if (!await dbFunctions.userExists(data.users[0])) {
            sendError(socket, "User does not exist.");
            return false;
        }
        if (data.users.length !== 2) {
            sendError(socket, "Exactly one other user is needed to create a user chat");
            return false;
        }
        if (await dbFunctions.userChatExists(data.users)) {
            sendError(socket, "Chat already exists.");
            return false;
        }
    } else if (data.name && (data.name.length <= 0 || data.name.length > 16)) {
        sendError(socket, "Length of group name must be between 0 and 16");
        return false;
    }
    const chatID = await dbFunctions.createChat((data.type === "user") ? "userChat" : data.name, data.type, data.users);
    await dbFunctions.addChat(username, chatID);
    if (data.users.length > 0) {
        for (const user of data.users) {
            await dbFunctions.addChat(user, chatID);
        }
    }
    sendEvent(socket, 'createChat', {
        chats: [{ "chatID": chatID, "name": data.name, "type": data.type }]
    });
}

/**
 *
 * @param socket
 * @param {Object<{ChatID:string, message:String}>}data
 * @param {String}username
 * @param {Array<WebSocket>}sockets
 * @param {String}messageType
 * @return {Promise<void>}
 */
async function sendMessage(socket, data, username, sockets, messageType) {
    let type = (messageType === undefined) ? "text" : messageType;
    if (await dbFunctions.addMessage(data.chatID, { "message": data.message, "author": username, "readConfirmation": false, "timeStamp": Date.now(), "type": type })) {
        const groupMembers = (await dbFunctions.fetchGroupUsers(data.chatID)).members;
        for (const groupMember of groupMembers) {
            if (groupMember !== username) {
                await dbFunctions.incrementUnreadMessages(groupMember, data.chatID);
            }
        }

        if(data.message.startsWith('/')){
            let specialName = data.message.substring(1);
            for (const special of specials) {
                if(special.name === specialName){
                    data.message = special.message;
                    type = special.type;
                }
            }
        }
        for (const s of sockets) {
            if (groupMembers.includes(s.username)) {
                sendEvent(s.socket, 'messageNotification', {
                    "chatID": data.chatID,
                    "username": s.username,
                    "message": {
                        message: data.message,
                        author: username,
                        readConfirmation: false,
                        timeStamp: Date.now(),
                        type: type
                    },
                    "type": type
                });
            }
        }
    } else {
        sendError(socket, "Unable to send message!");
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{message:string, file:String, mediaType}>}data
 * @param {String}username
 * @param {Array<WebSocket>}sockets
 * @return {Promise<void>}
 */
async function sendMedia(socket, data, username, sockets) {
    data.message = data.file;
    await sendMessage(socket, data, username, sockets, data.mediaType);
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{chatID:string}>}data
 * @param {String}username
 * @param {Array<WebSocket>}sockets
 * @return {Promise<void>}
 */
async function readChat(socket, data, username, sockets) {
    await dbFunctions.resetUnreadMessages(username, data.chatID);
    for (const s of sockets) {
        if (s.socket !== socket && await dbFunctions.hasChat(s.username, data.chatID)) {
            sendEvent(s.socket, 'messagesRead', {
                chatID: data.chatID
            });
        }
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{chatID:string}>}data
 * @param {String}username
 * @return {Promise<void>}
 */
async function fetchMessages(socket, data, username) {
    const messagesObject = await dbFunctions.fetchMessages(data.chatID, data.start, data.amount);
    if (messagesObject.message) {
        sendEvent(socket, 'fetchMessages', {
            "username": username,
            "chatID": data.chatID,
            "messages": messagesObject.message,
            "next": messagesObject.next,
            "total": messagesObject.total
        });
    } else {
        sendError(socket, "Cannot fetch messages");
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{chatID:string}>}data
 * @return {Promise<void>}
 */
async function fetchGroupUsers(socket, data) {
    const users = await dbFunctions.fetchGroupUsers(data.chatID);
    if (users.members && users.members.length > 0) {
        sendEvent(socket, 'fetchGroupUsers', {
            users: users.members
        });
    } else {
        sendError(socket, "Cannot fetch group users.");
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{chatID:string}>}data
 * @param {String}username
 * @param {Array<WebSocket>}sockets
 * @return {Promise<void>}
 */
async function removeUser(socket, data, username, sockets) {
    const result = await dbFunctions.removeUser(data.chatID, data.username.toLowerCase());
    if (result) {
        sendEvent(socket, 'removeUser', {
            status: true,
            chatID: data.chatID,
            username: data.username
        });
        sendMessage(socket, { chatID: data.chatID, message: `${username} removed ${data.username} from chat` },
            username, sockets, "info");

    } else {
        sendEvent(socket, 'removeUser', {
            status: false,
            chatID: data.chatID,
            username: data.username
        });
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{chatID:string}>}data
 * @param {String}username
 * @param {Array<WebSocket>}sockets
 * @return {Promise<void>}
 */
async function addUser(socket, data, username, sockets) {
    const result = await dbFunctions.addUser(data.chatID, data.username.toLowerCase());
    if (result) {
        sendEvent(socket, 'addUser', {
            status: true,
            chatID: data.chatID
        });
        sendMessage(socket, { chatID: data.chatID, message: `${username} added ${data.username.toLowerCase()} to chat` },
            username, sockets, "info");

    } else {
        sendEvent(socket, 'addUser', {
            status: false,
            chatID: data.chatID
        });
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {String}username
 * @return {Promise<void>}
 */
async function deleteAccount(socket, username) {
    const result = await dbFunctions.deleteAccount(username);
    if (result) {
        sendEvent(socket, 'deleteAccount', {
            status: true,
        });
    } else {
        sendError(socket, "Couldn't delete account.");
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{newName:string}>}data
 * @param {String}username
 * @return {Promise<void>}
 */
async function changeUsername(socket, data, username) {
    const userExists = await dbFunctions.userExists(data.newName);
    if (!userExists) {
        if (await dbFunctions.changeUsername(username, data.newName)) {
            const chatIDs = await dbFunctions.getAllChatIDs(username);
            if (chatIDs && chatIDs.chats) {
                for (const id of chatIDs.chats) {
                    await dbFunctions.addUser(id, newName);
                    await dbFunctions.removeUser(id, username);
                }
            }
            sendEvent(socket, "changeUsername", { "newName": data.newName });
        } else {
            sendError(socket, "An error occured during changing the username. Please try again.");
        }
    } else {
        sendError(socket, "Username already exists");
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{chatID:string, newGroupName:string}>}data
 * @param {String}username
 * @param {Array<WebSocket>}sockets
 * @return {Promise<void>}
 */
async function changeGroupName(socket, data, username, sockets) {
    const chatExists = await dbFunctions.chatExists(data.chatID);
    if (chatExists) {
        if (await dbFunctions.changeGroupName(data.chatID, data.newGroupName)) {
            sendEvent(socket, "changeGroupName", { "chatID": data.chatID, "newGroupName": data.newGroupName });
            const groupMembers = (await dbFunctions.fetchGroupUsers(data.chatID)).members;
            for (const s of sockets) {
                if (groupMembers.includes(s.username)) {
                    sendEvent(s.socket, "changeGroupName", { "chatID": data.chatID, "newGroupName": data.newGroupName });
                }
            }
            sendMessage(socket, { chatID: data.chatID, message: `${username} changed the group name to ${data.newGroupName}` },
                username, sockets, "info");
        } else {
            sendError(socket, "An error occured during changing the group name. Please try again.");
        }
    } else {
        sendError(socket, "Chat does not exist");
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<{oldPassword:string, newPassword:string}>}data
 * @param {String}username
 * @return {Promise<void>}
 */
async function changePassword(socket, data, username) {
    if (await dbFunctions.userPasswordMatches(username, data.oldPassword)) {
        sendEvent(socket, "changePassword", { status: false, message: "You misspelled your password to authenticate" }).then(null);
        return;
    }

    const hash = await encryption.createPasswordHash(data.newPassword);
    const result = await dbFunctions.changePassword(username, hash.hash, hash.salt);
    if (result) {
        sendEvent(socket, "changePassword", { status: true });
    } else {
        sendError(socket, "An error occured during changing the password. Please try again.");
    }
}

/**
 *
 * @param {WebSocket}socket
 * @param {message:string}>}message
 * @return {Promise<void>}
 */
function sendError(socket, message) {
    sendEvent(socket, 'error', {
        message: message
    }).then(null);
}

/**
 *
 * @param {WebSocket}socket
 * @param {Object<>}data
 * @param {Object<>}event
 * @return {Promise<void>}
 */
async function sendEvent(socket, event, data) {
    const message = JSON.stringify({ event: event, data: data });
    if (socket.secretKey) {
        const encryptedMessage = await encryption.encryptMessageAESServer(message, socket.secretKey, socket.iv);
        socket.send(JSON.stringify({
            //event: eventName,
            encryptedData: encryptedMessage,
        }));
    } else {
        socket.send(message);
    }
}


module.exports = {
    validate,
    login,
    logout,
    fetchchats,
    createChat,
    sendMessage,
    sendMedia,
    readChat,
    fetchMessages,
    fetchGroupUsers,
    sendError,
    removeUser,
    addUser,
    deleteAccount,
    changeUsername,
    changeGroupName,
    changePassword
}