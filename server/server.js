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
    dbFunctions.checkSessionCookie(req.cookies.username, req.cookies.sessionToken).then((result) => {
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
                JSONCookie[pair[0]] = pair.splice(1).join('=');
            });
        }
        let username = JSONCookie.username;
        if (username) {
            username = username.toLowerCase();
        }
        // const sessionToken = JSONCookie.password;
        const sessionToken = JSONCookie.sessionToken;

            let socketExists = false;
            for (let i = 0; i < sockets.length; i++) {
                if (sockets[i].username == username) {
                    sockets[i] = { socket: socket, "username": username.toLowerCase() };
                    socketExists = true;
                }
            }
            if (!socketExists) {
                sockets.push({ socket: socket, "username": username.toLowerCase() });
            }
        }

        if (event.event === "login") {
            eventFunctions.login(socket, event.data, sockets, "login");
            return;
        }
        if (event.event === "register") {
            eventFunctions.login(socket, event.data, sockets, "register");
            return;
        }
        if (!eventFunctions.validate(username, sessionToken)) {
            return "Username/Password incorrect";
        }
        switch (event.event) {
            case 'fetchChats':
                eventFunctions.fetchchats(socket, username);
                break;
            case 'sendMessage':
                eventFunctions.sendMessage(socket, event.data, username, sockets);
                break;
            case 'fetchMessages':
                eventFunctions.fetchMessages(socket, event.data, username);
                break;
            case 'createChat':
                eventFunctions.createChat(socket, event.data, username);
                break;
            case 'readChat':
                eventFunctions.readChat(socket, event.data, username, sockets);
                break;
            case 'fetchGroupUsers':
                eventFunctions.fetchGroupUsers(socket, event.data);
                break;
            case 'removeUser':
                eventFunctions.removeUser(socket, event.data);
                break;
            case 'addUser':
                eventFunctions.addUser(socket, event.data);
                break;
            case 'deleteAccount':
                eventFunctions.deleteAccount(socket, username);
                break;
            default: {
                eventFunctions.sendError(socket, `unknown event: ${event.event}`);
                return -1;
            }
        }
    });
});

server.on('close', () => {
    console.log('Server closed');
});