const ws = require('ws');
const express = require('express');
const configData = require('../config.json');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const dbFunctions = require('./db');
const eventFunctions = require('./eventFunctions');
const { sendPublicKey, handleKey, decryptMessageAES } = require("./encryption");

let sockets = [];
const PORT = configData["express-port"];

app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());
app.use((req, res, next) => {
    dbFunctions.checkSessionCookie(req.cookies.username, req.cookies.sessionToken).then((result) => {
        if (result) {
            if (req.path === '/login') {
                res.redirect("/dashboard");
            } else {
                next();
            }
        } else {
            if (req.path === '/login' || req.path === '/register') {
                next();
            } else {
                res.redirect("/login");
            }
        }
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}\n`);
    dbFunctions.connectToDB().then();
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
wsSrv.on('connection', async (socket, req) => {
    sendPublicKey(socket);
    socket.on('message', async (data) => {
        let event;
        try {
            const message = Buffer.from(data).toString('utf-8');
            event = JSON.parse(message);
        } catch {
            return -1;
        }
        if (event.data && event.event === "secretKey") {
            handleKey(event.data, socket.privateKey, socket);

            return 1;
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
            let socketExists = false;
            for (let i = 0; i < sockets.length; i++) {
                if (sockets[i].username === username) {
                    sockets[i] = { socket: socket, "username": username.toLowerCase() };
                    socketExists = true;
                }
            }
            if (!socketExists) {
                sockets.push({ socket: socket, "username": username.toLowerCase() });
            }
        }

        try {
            if (event.encryptedData) {
                let data = await decryptMessageAES(event.encryptedData, socket.secretKey, socket.iv);
                event = JSON.parse(data);

            }
        } catch (e) {
            console.warn("Something wrong with encryption");
            console.log(e);
            return -1;
        }

        const sessionToken = JSONCookie.sessionToken;

        if (event.event === "login") {
            eventFunctions.login(socket, event.data, sockets, "login").then();
            return;
        }
        if (event.event === "register") {
            eventFunctions.login(socket, event.data, sockets, "register").then();
            return;
        }
        if (!eventFunctions.validate(username, sessionToken).then()) {
            return "Username/Password incorrect";
        }
        switch (event.event) {
            case 'fetchChats':
                eventFunctions.fetchchats(socket, username).then();
                break;
            case 'sendMessage':
                eventFunctions.sendMessage(socket, event.data, username, sockets, undefined).then();
                break;
            case 'sendMedia':
                eventFunctions.sendMedia(socket, event.data, username, sockets).then();
                break;
            case 'fetchMessages':
                eventFunctions.fetchMessages(socket, event.data, username).then();
                break;
            case 'createChat':
                eventFunctions.createChat(socket, event.data, username).then();
                break;
            case 'readChat':
                eventFunctions.readChat(socket, event.data, username, sockets).then();
                break;
            case 'fetchGroupUsers':
                eventFunctions.fetchGroupUsers(socket, event.data).then();
                break;
            case 'removeUser':
                eventFunctions.removeUser(socket, event.data, username, sockets).then();
                break;
            case 'addUser':
                eventFunctions.addUser(socket, event.data, username, sockets).then();
                break;
            case 'deleteAccount':
                eventFunctions.deleteAccount(socket, username).then();
                break;
            case 'changeUsername':
                eventFunctions.changeUsername(socket, event.data, username).then();
                break;
            case 'changeGroupName':
                eventFunctions.changeGroupName(socket, event.data, username, sockets).then();
                break;
            case 'changePassword':
                eventFunctions.changePassword(socket, event.data, username).then();
                break;
            case 'logout':
                eventFunctions.logout(socket, username).then();
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