const ws = require('ws');
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const dbFunctions = require('./db');
const { log } = require('console');

let sockets = [];


app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());
app.use((req, res, next) => {
    dbFunctions.validateUser(req.cookies.username, req.cookies.password).then((result) => {
        if (result) {
            if (req.path == '/dashboard') {
                next();
            } else {
                res.redirect("/dashboard");
            }
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

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/subpages', 'dashboard.html'));
});

app.get('*', (req, res) => {
    res.redirect('login');
});






//receive message
wsSrv.on('connection', (socket) => {
    sockets.push(socket);
    socket.on('message', async (data) => {
        const message = Buffer.from(data).toString('utf-8');
        const event = JSON.parse(message);
        switch (event.event){
            case 'login':
                login(event, socket);
            break;
        }
    });
});

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
/*
async function loadChats(event, socket) {
    dbFunctions.validateUser(user, password);
    let chatIDs = dbFunctions.getAllChatIDs(user, password);
    socket.send("" + chatIDs);
}

async function loadChatHistory(event, socket) {
    dbFunctions.validateUser(user, password);
    //get Chathistory
}

async function sendMessage(event, socket, message) {
    dbFunctions.validateUser(user, password);
    //insert Message into chat
}

async function createChat(event, socket) {
    dbFunctions.validateUser(user, password);
    //create a new chat
}

async function addUserToGroup(event, socket, id) {
    dbFunctions.validateUser(user, password);
    dbFunctions.addChatID(user, password, id);
}*/


server.on('close', () => {
    dbClient.close();
    console.log('Server closed');
});