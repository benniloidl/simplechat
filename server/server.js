const ws = require('ws');
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const dbFunctions = require('./db');

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

app.get('*.html', (req, res) => {
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
                login(event, socket);
                break;

            case 'loadChats':
                if (validate(username, password)) {
                    loadChats(event, socket, username);
                }
                break;

            default: return -1;
        }
    });
});

async function validate(username, password) {
    const valid = await dbFunctions.validateUser(username, password);
    if (valid) {
        return true;
    } else {
        return false;
    }
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

async function loadChats(event, socket) {
    let chatIDs = dbFunctions.getAllChatIDs(username);
    socket.send("" + chatIDs);
}

async function loadChatHistory(event, socket, username) {
    //get Chathistory
}

async function sendMessage(event, socket, message) {
    //insert Message into chat
}

async function createChat(event, socket) {
    //create a new chat
}

async function addUserToGroup(event, socket, username, id) {
    dbFunctions.addChatID(username, id);
}


server.on('close', () => {
    console.log('Server closed');
});