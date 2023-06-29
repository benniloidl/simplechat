const dbFunctions = require('./db');

async function validate(username, password) {
    const valid = await dbFunctions.validateUser(username, password);
    if (valid) {
        return true;
    } else {
        return false;
    }
}

async function fetchchats(socket, username) {
    const chats = await dbFunctions.fetchChats(username);
    socket.send(JSON.stringify({ event: 'fetchChats', "chats": chats }));
}

async function login(data, socket, sockets) {
    const login = await dbFunctions.validateUser(data.username, data.password);
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

async function register(data, socket, sockets) {
    const login = await dbFunctions.createUser(data.username, data.password);
    if (login) {
        for (const s of sockets) {
            if (s.socket == socket) {
                s.username = data.username;
                break;
            }
        }
        socket.send("{event: 'register', status: true}");
    } else {
        socket.send("{event: 'register', status: false}");
    }
}

async function createChat(data, socket, username) {
    if (data.type == "user" && data.users.length != 1) {
        socket.send(JSON.stringify({ event: "error", message: "Exactly one other user is needed to create a user chat" }));
        return false;
    }
    await dbFunctions.createChat(data.name, data.type).then(async (chatID) => {
        await dbFunctions.addChat(username, chatID);
        if (data.users.length > 0) {
            for (const user of data.users) {
                await dbFunctions.addChat(user, chatID);
            }
        }
        socket.send(JSON.stringify({ event: 'fetchChats', "chats": [{ "chatID": chatID, "name": data.name, "type": data.type }] }));
    });
}

async function sendMessage(socket, sockets, data, username) {
    if (await dbFunctions.addMessage(data.chatID, { message: data.message.message, author: username, readConfirmation: false, timeStamp: Date.now() })) {
        for (const s of sockets) {
            if (await dbFunctions.hasChat(s.username, data.chatID)) {
                dbFunctions.incrementUnreadMessages(s.username, data.chatID);
                s.socket.send(JSON.stringify({ event: "messageNotification", notification: { "chatID": data.chatID, "message": message } }));
            }
        }
    } else {
        socket.send(JSON.stringify({ event: "error", message: "Unable to send message!" }));
    }
}

async function readChat(data, socket, sockets, username) {
    await dbFunctions.resetUnreadMessages(username, data.chatID);
    for (const s of sockets) {
        if (s.socket != socket && s.hasChat(s.username, data.chatID)) {
            s.socket.send(JSON.stringify({ event: "messagesRead", chatID: data.chatID }));
        }
    }
}

module.exports = {
    validate,
    login,
    register,
    fetchchats,
    createChat,
    sendMessage,
    readChat
}