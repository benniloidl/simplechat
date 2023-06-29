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
wsSrv.on('connection', (socket, req) => {
    sockets.push(socket);

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
        const username = JSONCookie.username;
        const password = JSONCookie.password;

        switch (event.event) {
            case 'login':
                eventFunctions.login(event, socket);
                break;
            case 'fetchChats':
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.fetchchats(event, socket, username);
                }
                break;
            case 'fetchChatMessage':
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.fetchchats(event, socket);
                }
                break;
            case 'fetchChatMessage':
                if (eventFunctions.validate(username, password)) {
                    eventFunctions.loadChatHistory(event, socket);
                }
                break;
            default: return -1;
        }
    });
});

server.on('close', () => {
    console.log('Server closed');
});