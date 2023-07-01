const ws = require('ws');
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const dbFunctions = require('./db');
const eventFunctions = require('./eventFunctions');

let sockets = [];

app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());
app.use((req, res, next) => {
    dbFunctions.validateUser(req.cookies.username, req.cookies.password).then((result) => {
        if (result) {
            if (req.path == '/login') {
                res.redirect("/dashboard");
            } else {
                next();
            }
        } else {
            if (req.path == '/login' || req.path == '/register') {
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

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/subpages', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/subpages', 'dashboard.html'));
});

app.get('*', (req, res) => {
    res.redirect('login');
});


//receive message
wsSrv.on('connection', (socket, req) => {

    socket.on('message', async (data) => {
        let event;
        try {
            const message = Buffer.from(data).toString('utf-8');
            event = JSON.parse(message);
        } catch {
            return -1;
        }

        const cookie = req.headers.cookie;
        let JSONCookie = {};
        if (cookie) {
            cookie.split(/\s*;\s*/).forEach(function (pair) {
                pair = pair.split(/\s*=\s*/);
                JSONCookie[pair[0]] = pair.slice(1).join('=');
            });
        }
        let username = JSONCookie.username;
        if (username) {
            username = username.toLowerCase();
        }
        const password = JSONCookie.password;

        let socketExists = false;
        for (let i = 0; i < sockets.length; i++) {
            if (sockets[i].username == username) {
                sockets[i] = { socket: socket, "username": username };
                socketExists = true;
            }
        }
        if (!socketExists) {
            sockets.push({ socket: socket, "username": username });
        }

        switch (event.event) {
            case 'login':
                eventFunctions.login(socket, event.data, sockets, "login");
                break;
            case 'register':
                eventFunctions.login(socket, event.data, sockets, "register");
                break;
            case 'fetchChats':
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.fetchchats(socket, username);
                }
                break;
            case 'sendMessage':
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.sendMessage(socket, event.data, username, sockets);
                }
                break;
            case 'fetchMessages':
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.fetchMessages(socket, event.data, username);
                }
                break;
            case 'createChat':
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.createChat(socket, event.data, username);
                }
                break;
            case 'readChat':
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.readChat(socket, event.data, username, sockets);
                }
                break;
            case 'fetchGroupUsers':
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.fetchGroupUsers(socket, event.data);
                }
                break;
            case 'removeUser':
                //TODO BOILERPLATE
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.sendError(socket, `NOT IMPLEMENTED: ${event.event}`);
                }
                break;
            case 'addUser':
                //TODO BOILERPLATE
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.sendError(socket, `NOT IMPLEMENTED: ${event.event}`);
                }
                break;
            case 'deleteAccount':
                //TODO BOILERPLATE
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.sendError(socket, `NOT IMPLEMENTED: ${event.event}`);
                }
                break;
            default:{
                eventFunctions.sendError(socket, `unknown event: ${event.event}`);
                return -1;
            }
        }
    });
});

server.on('close', () => {
    console.log('Server closed');
});