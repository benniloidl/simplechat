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
let db, user, chatHistory;

let sockets = [];


app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());
<<<<<<< Updated upstream
=======
app.use((req, res, next) => {
    user = req.cookies.username;
    password = req.cookies.password;
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
>>>>>>> Stashed changes

const server = app.listen(3000, () => {
    console.log("Server is running on port 3000\n");
    dbFunctions.connectToDB();
});
const wsSrv = new ws.Server({ server });


//Website
app.get('/', (req, res) => {
    dbFunctions.validateUser(req.cookies.username, req.cookies.password).then((result) => {
        if (result) {
            res.redirect('/overview');
        } else {
            res.sendFile(path.join(__dirname, '../client/subpages', 'login.html'));
        }
    });
});

<<<<<<< Updated upstream
app.get('/overview', (req, res) => {
        validateUser(req.cookies.username, req.cookies.password).then((result) => {
            if (result) {
                res.sendFile(path.join(__dirname, '../client', 'overview.html'));
            } else {
                res.redirect('/');
            }
        });
=======
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/subpages', 'dashboard.html'));
>>>>>>> Stashed changes
});

app.get("*", (_req, res) => {
    res.redirect('/');
});






//receive message
wsSrv.on('connection', (socket) => {
    sockets.push(socket);
    socket.on('message', async (data) => {
        const message = Buffer.from(data).toString('utf-8');
        const event = JSON.parse(message);
        switch (event.event){
            case 'login':
                const login = await dbFunctions.validateUser(event.data.username, event.data.password);
                if(login){
                    socket.send("{event: 'login', status: true}");
                }
                else {
                    socket.send("{event: 'login', status: false}");
                }
            break;
        }
    });
});

<<<<<<< Updated upstream
=======
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
}

>>>>>>> Stashed changes

server.on('close', () => {
    dbClient.close();
    console.log('Server closed');
});