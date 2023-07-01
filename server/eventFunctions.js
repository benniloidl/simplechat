const dbFunctions = require('./db');

async function validate(username, sessionToken /*password*/) {
    // return await dbFunctions.validateUser(username, password);
    const result = await dbFunctions.checkSessionCookie(username, sessionToken);
    if(!result){
        // redirect to log in
    }
    return result;
}

async function fetchchats(socket, username) {
    const chats = await dbFunctions.fetchChats(username);
    socket.send(JSON.stringify({ event: 'fetchChats', "chats": chats }));
}

async function login(socket, data, sockets, type) {
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

    let loginToken;
    if (type === "login") {
        loginToken = await dbFunctions.validateUser(data.username, data.password);
    } else {
        loginToken = await dbFunctions.createUser(data.username, data.password);
    }

    if (loginToken) {
        for (const s of sockets) {
            if (s.socket == socket) {
                s.username = data.username;
                break;
            }
        }
        console.log("login successfully", data.username, loginToken);
        socket.send(JSON.stringify({ event: 'login', status: true, sessionToken: loginToken}));
    } else {
        socket.send(JSON.stringify({ event: 'login', status: false, sessionToken: null}));
    }
}

async function createChat(socket, data, username) {
    if (data.type == "user") {
        if (!await dbFunctions.userExists(data.users[0])) {
            socket.send(JSON.stringify({ event: "error", message: "User does not exist." }));
            return false;
        }
        if (await dbFunctions.chatExists(username, data.users[0])) {
            socket.send(JSON.stringify({ event: "error", message: "Chat already exists." }));
            return false;
        }
        if (data.users.length != 1) {
            socket.send(JSON.stringify({ event: "error", message: "Exactly one other user is needed to create a user chat" }));
            return false;
        }
    }
    const chatID = await dbFunctions.createChat(data.type === "user" ? username === data.users[0] ? username : "userChat" : data.name, data.type);
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
        socket.send(JSON.stringify({ event: "error", message: "Unable to send message!" }));
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
        socket.send(JSON.stringify({ event: "error", message: "Cannot fetch messages" }));
    }
}

async function fetchGroupUsers(socket, data) {
    const users = await dbFunctions.fetchGroupUsers(data.chatID);
    if (users.length > 0) {
        socket.send(JSON.stringify({ event: "fetchGroupUsers", data: { "users": users} }));
    } else {
        socket.send(JSON.stringify({ event: "error", message: "Cannot fetch group users." }));
    }
}

async function sendError(socket, message){
    socket.send(JSON.stringify({event: "error", message:message}))
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
    sendError
}