const dbFunctions = require('./db');
const encryption = require('./encryption');

async function validate(username, sessionToken /*password*/) {
    // return await dbFunctions.validateUser(username, password);
    const result = await dbFunctions.checkSessionCookie(username, sessionToken);
    if (!result) {
        // redirect to log in
    }
    return result;
}

async function fetchchats(socket, username) {
    const chats = await dbFunctions.fetchChats(username);
    sendEvent(socket, 'fetchChats', {
        chats: chats,
    });
}

async function login(socket, data, sockets, type) {
    if (!data.username || !data.password) {
        return;
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
        // socket.send(JSON.stringify({ event: 'login', status: false }));
        sendEvent(socket, 'login', {
            status: false,
            sessionToken: null,
            publicKey: null
        });
        return;
    }

    let loginObject;
    if (type === "login") {
        loginObject = await dbFunctions.validateUser(data.username, data.password);
    } else {
        loginObject = await dbFunctions.createUser(data.username, data.password);
    }
    if (!loginObject) {
        // Probably user does not exist
        sendError(socket, "FATAL ERROR during login!");
        return -1;
    }
    let loginToken = loginObject.token;
    let publicKey = loginObject.publicKey;

    if (loginToken) {
        for (const s of sockets) {
            if (s.socket === socket) {
                s.username = data.username;
                break;
            }
        }
        // socket.send(JSON.stringify({ event: 'login', status: true, sessionToken: loginToken, publicKey: publicKey}));
        sendEvent(socket, 'login', {
            status: true,
            sessionToken: loginToken,
            publicKey: publicKey
        });
    } else {
        // socket.send(JSON.stringify({ event: 'login', status: false, sessionToken: null}));
        sendEvent(socket, 'login', {
            status: false,
            sessionToken: null,
            publicKey: null
        });
    }
}

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
    }
    const chatID = await dbFunctions.createChat(data.type === "user" ? "userChat" : data.name, data.type, data.users);
    await dbFunctions.addChat(username, chatID);
    if (data.users.length > 0) {
        for (const user of data.users) {
            await dbFunctions.addChat(user, chatID);
        }
    }
    // socket.send(JSON.stringify({ event: 'fetchChats', "chats": [{ "chatID": chatID, "name": data.name, "type": data.type }] }));
    sendEvent(socket, 'fetchChats', {
        chats: [{ "chatID": chatID, "name": data.name, "type": data.type }]
    });
}

async function sendMessage(socket, data, username, sockets, messageType) {
    const type = (messageType === undefined)? "text": messageType;
    // const media = (messageMedia === undefined)? "": messageMedia;
    if (await dbFunctions.addMessage(data.chatID, { message: data.message, author: username, readConfirmation: false, timeStamp: Date.now(), type: type})) {
        const groupMembers = (await dbFunctions.fetchGroupUsers(data.chatID)).members;
        for (const groupMember of groupMembers) {
            if (groupMember !== username) {
                await dbFunctions.incrementUnreadMessages(groupMember, data.chatID);
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
                        timeStamp: Date.now()
                    }
                });
            }
        }
    } else {
        sendError(socket, "Unable to send message!");
    }
}

async function sendMedia(socket, data, username, sockets){
    console.log("recieved Media", data.mediaType);
    data.message = data.file;
    await sendMessage(socket,  data, username, sockets, data.mediaType);
}

async function readChat(socket, data, username, sockets) {
    await dbFunctions.resetUnreadMessages(username, data.chatID);
    for (const s of sockets) {
        if (s.socket !== socket && await dbFunctions.hasChat(s.username, data.chatID)) {
            // s.socket.send(JSON.stringify({ event: "messagesRead", chatID: data.chatID }));
            sendEvent(s.socket, 'messagesRead', {
                chatID: data.chatID
            });
        }
    }
}

async function fetchMessages(socket, data, username) {
    const messages = await dbFunctions.fetchMessages(data.chatID, data.start, data.amount);
    let remainingMessages = 0; //TODO
    if (messages) {
        // socket.send(JSON.stringify({ event: "fetchMessages", data: { "username": username, "chatID": data.chatID, "messages": messages } }));
        sendEvent(socket, 'fetchMessages', {
            "username": username,
            "chatID": data.chatID,
            "messages": messages,
            "next": remainingMessages
        });
    } else {
        sendError(socket, "Cannot fetch messages");
    }
}

async function fetchGroupUsers(socket, data) {
    const users = await dbFunctions.fetchGroupUsers(data.chatID);
    if (users.members && users.members.length > 0) {
        // socket.send(JSON.stringify({ event: "fetchGroupUsers", data: { "users": users.members } }));
        sendEvent(socket, 'fetchGroupUsers', {
            users: users.members
        });
    } else {
        sendError(socket, "Cannot fetch group users.");
    }
}

async function removeUser(socket, data) {
    const result = await dbFunctions.removeUser(data.chatID, data.username.toLowerCase());
    // socket.send(JSON.stringify({ event: "removeUser", data: { "status": true, "chatID": data.chatID } }));
    sendEvent(socket, 'removeUser', {
        status: result ? true : false,
        chatID: data.chatID,
        username: data.username
    });
}

async function addUser(socket, data) {
    const result = await dbFunctions.addUser(data.chatID, data.username.toLowerCase());
        // socket.send(JSON.stringify({ event: "addUser", data: { "status": true, "chatID": data.chatID  } }));
        sendEvent(socket, 'addUser', {
            status: result?true:false,
            chatID: data.chatID
        });
}

async function deleteAccount(socket, username) {
    const result = await dbFunctions.deleteAccount(username);
    if (result) {
        // socket.send(JSON.stringify({ event: "deleteAccount", data: { "status": true } }));
        sendEvent(socket, 'deleteAccount', {
            status: true,
        });
    } else {
        sendError(socket, "Couldn't delete account.");
    }
}

function sendError(socket, message) {
    // socket.send(JSON.stringify({ event: "error", message: message }));
    sendEvent(socket, 'error', {
        message: message
    }).then(null);
}

async function sendEvent(socket, event, data) {
    const message = JSON.stringify({ event: event, data: data });
    if(socket.secretKey){
        const encryptedMessage = await encryption.encryptMessageAESServer(message, socket.secretKey, socket.iv);
        console.log("fetchEncrypted", message);
        socket.send(JSON.stringify({
            //event: eventName,
            encryptedData: encryptedMessage,
        }));
    }else{
        console.log("unencrypted: ", message);
        socket.send(message);
    }
}



module.exports = {
    validate,
    login,
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
    deleteAccount
}