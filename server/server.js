const ws = require('ws');
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017/SimpleChat";
const dbClient = new MongoClient(uri);
const dbFunctions = require('./db');
const { log } = require('console');
const { validateUser } = require('./db');

let sockets = [];

let user = 0;
let password = 0;

app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());
app.use((req, res, next) => {
    user = req.cookies.username;
    password = rey.cookies.password;
    dbFunctions.validateUser(req.cookies.username, req.cookies.password).then((result) => {
        if (result) {
            next();
        } else {
            if (req.path == '/login') {
                next();
            } else {
                res.redirect("/login");
            }
        }
    });
});

const server = app.listen(3000, () => {
    console.log("Server is running on port 3000\n");
    dbFunctions.connectToDB();
});
const wsSrv = new ws.Server({ server });



//Website
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/subpages', 'login.html'));
});

app.get('/dashbord', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/subpages', 'dashboard.html'));
});


//receive message
wsSrv.on('connection', (socket) => {
    sockets.push(socket);
    socket.on('message', async (data) => {
        const message = Buffer.from(data).toString('utf-8');
        const event = JSON.parse(message);
        switch (event.event) {
            case 'login':
                login(event, socket);
                break;
            case 'signup':
                signup(event, socket);
                break;
            case 'loadchats':
                loadChats(event, socket);
                break;
            case 'loadchathistory':
                loadChatHistory(event, socket);
                break;
            case 'sendmessage':
                sendMessage(event, socket, event.data.message);
                break;
            case 'createchat':
                createChat(event, socket);
                break;
            case 'addusertogroup':
                addUserToGroup(event, socket, event.data.id);
                break;
            default:
                socket.send("{event: 'error', message: 'unknown event'}");
        }
    });
});

async function login(event, socket) {
    const login = await dbFunctions.validateUser(event.data.username, event.data.password);
    if (login) {
        socket.send("{event: 'login', status: true}");
    }
    else {
        socket.send("{event: 'login', status: false}");
    }
}

async function signup(event, socket) {
    const login = await dbFunctions.createUser(event.data.username, event.data.password);
    if (login) {
        socket.send("{event: 'signup', status: true}");
    }
    else {
        socket.send("{event: 'signup', status: false}");
    }
}

async function loadChats(event, socket){
    dbFunctions.validateUser(user, password);
    let chatIDs = dbFunctions.getAllChatIDs(user, password);
    socket.send(""+chatIDs);
}

async function loadChatHistory(event, socket){
    dbFunctions.validateUser(user, password);
    //get Chathistory
}

async function sendMessage(event, socket, message){
    dbFunctions.validateUser(user, password);
    //insert Message into chat
}

async function createChat(event, socket){
    dbFunctions.validateUser(user, password);
    //create a new chat
}

async function addUserToGroup(event, socket, id){
    dbFunctions.validateUser(user, password);
    dbFunctions.addChatID(user, password, id);
}



server.on('close', () => {
    dbClient.close();
    console.log('Server closed');
});