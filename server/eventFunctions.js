const dbFunctions = require('./db');

async function validate(username, password) {
    const valid = await dbFunctions.validateUser(username, password);
    if (valid) {
        return true;
    } else {
        return false;
    }
}

async function loadChatHistory(event, socket){
    let messages = dbFunctions.loadMessages(event.chatID, event.start, event.amount);
    if(messages != false){
        socket.send('{event: "chatMessages", messages:'+messages+' }');
    }
}

async function fetchchats(event, socket, username){
    const chats = await dbFunctions.fetchChats(username);
    socket.send(JSON.stringify({event: 'fetchChats', "chats": chats}));
}

async function login(event, socket) {
    const login = await dbFunctions.validateUser(event.data.username, event.data.password);
    if (login) {
        socket.send(JSON.stringify({ event: 'login', status: true }));
    } else {
        socket.send(JSON.stringify({ event: 'login', status: false }));
    }
}

async function signup(event, socket) {
    const login = await dbFunctions.createUser(event.data.username, event.data.password);
    if (login) {
        socket.send("{event: 'signup', status: true}");
    } else {
        socket.send("{event: 'signup', status: false}");
    }
}

module.exports = {
    validate,
    login,
    signup,
    fetchchats,
    loadChatHistory
}