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

let sockets = [];


app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());
app.use((req, res, next) => {
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

server.on('close', () => {
    dbClient.close();
    console.log('Server closed');
});