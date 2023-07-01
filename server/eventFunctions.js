const dbFunctions = require('./db');

async function validate(username, password) {
    return await dbFunctions.validateUser(username, password);
}

async function fetchchats(socket, username) {
    const chats = await dbFunctions.fetchChats(username);
    socket.send(JSON.stringify({ event: 'fetchChats', "chats": chats }));
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
            data.password.length >= 8
        )
    ) {
        socket.send(JSON.stringify({ event: 'login', status: false }));
        return;
    }

    let login;
    if (type === "login") {
        login = await dbFunctions.validateUser(data.username, data.password);
    } else {
        login = await dbFunctions.createUser(data.username, data.password);
    }

    if (login) {
        for (const s of sockets) {
            if (s.socket == socket) {
                s.username = data.username;
                break;
            }
        }
        socket.send(JSON.stringify({ event: 'login', status: true }));
    } else {
        socket.send(JSON.stringify({ event: 'login', status: false }));
    }
}

async function createChat(socket, data, username) {
    for (let i = 0; i < data.users.length; i++) {
        data.users[i] = data.users[i].toLowerCase();

    }
    data.users.push(username);
    if (data.type == "user") {
        if (!await dbFunctions.userExists(data.users[0])) {
            sendError(socket, "User does not exist.");
            return false;
        }
        if (data.users.length != 2) {
            sendError(socket, "Exactly one other user is needed to create a user chat");
            return false;
        }
        if (await dbFunctions.userChatExists(data.users)) {
            sendError(socket, "Chat already exists.");
            return false;
        }
    }
    const chatID = await dbFunctions.createChat(data.type === "user" ? "userChat" : data.name, data.type, data.users);
    await dbFunctions.addChat(username, chatID);
    if (data.users.length > 0) {
        for (const user of data.users) {
            await dbFunctions.addChat(user, chatID);
        }
    }
    socket.send(JSON.stringify({ event: 'fetchChats', "chats": [{ "chatID": chatID, "name": data.name, "type": data.type }] }));
}

async function sendMessage(socket, data, username, sockets) {
    if (await dbFunctions.addMessage(data.chatID, { message: data.message, author: username, readConfirmation: false, timeStamp: Date.now() })) {
        for (const s of sockets) {
            if (await dbFunctions.hasChat(s.username, data.chatID)) {
                if (s.username != username) {
                    await dbFunctions.incrementUnreadMessages(s.username, data.chatID);
                }
                s.socket.send(JSON.stringify({ event: "messageNotification", notification: { "chatID": data.chatID, "username": s.username, "message": { message: data.message, author: username, readConfirmation: false, timeStamp: Date.now() } } }));
            }
        }
    } else {
        sendError(socket, "Unable to send message!");
    }
}

async function readChat(socket, data, username, sockets) {
    await dbFunctions.resetUnreadMessages(username, data.chatID);
    for (const s of sockets) {
        if (s.socket != socket && await dbFunctions.hasChat(s.username, data.chatID)) {
            s.socket.send(JSON.stringify({ event: "messagesRead", chatID: data.chatID }));
        }
    }
}

async function fetchMessages(socket, data, username) {
    const messages = await dbFunctions.fetchMessages(data.chatID, data.start, data.amount);
    if (messages) {
        socket.send(JSON.stringify({ event: "fetchMessages", data: { "username": username, "chatID": data.chatID, "messages": messages } }));
    } else {
        sendError(socket, "Cannot fetch messages");
    }
}

async function fetchGroupUsers(socket, data) {
    const users = await dbFunctions.fetchGroupUsers(data.chatID);
    if (users.length > 0) {
        socket.send(JSON.stringify({ event: "fetchGroupUsers", data: { "users": users } }));
    } else {
        sendError(socket, "Cannot fetch group users.");
    }
}

async function removeUser(socket, data) {
    const result = await dbFunctions.removeUser(data.chatID, data.username);
    if (result) {
        socket.send(JSON.stringify({ event: "removeUser", data: { "status": true } }));
    } else {
        socket.send(JSON.stringify({ event: "removeUser", data: { "status": false } }));
    }
}

async function addUser(socket, data) {
    const result = await dbFunctions.addUser(data.chatID, data.username);
    if (result) {
        socket.send(JSON.stringify({ event: "addUser", data: { "status": true } }));
    } else {
        socket.send(JSON.stringify({ event: "addUser", data: { "status": false } }));
    }
}

async function deleteAccount(socket, username) {
    const result = await dbFunctions.deleteAccount(username);
    if (result) {
        //socket.send(JSON.stringify({ event: "deleteAccount", data: { "status": true } }));
    } else {
        sendError(socket, "Couldn't delete account.");
    }
}

function sendError(socket, message) {
    socket.send(JSON.stringify({ event: "error", message: message }))
}

module.exports = {
    validate,
    login,
    fetchchats,
    createChat,
    sendMessage,
    readChat,
    fetchMessages,
    fetchGroupUsers,
    sendError,
    removeUser,
    addUser,
    deleteAccount
}