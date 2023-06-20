const ws = require('ws');
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017/SimpleChat";
const dbClient = new MongoClient(uri);
const userCollectionName = "user";
const chatHistoryCollectionName = "chatHistory";

async function connectToDB() {
    console.log("connecting to db...");
    try {
        await dbClient.connect()
    } catch {
        console.error("connecting to db failed");
        process.exit(42);
    }
    console.log("connected successfully\n");
}
validateUser("test123", "123").then((result) => {
    console.log("validation: " + result);
});
createUser("test123", "123").then((result) => {
    console.log("creating a new user: " + result);
});

app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());

const server = app.listen(3000, () => {
    console.log("Server is running on port 3000\n");
    connectToDB();
});
const wsSrv = new ws.Server({ server });

let sockets = [];

app.get('/', (req, res) => {
    validateUser(req.cookies.username, req.cookies.password).then((result) => {
        if (result) {
            res.redirect('/overview');
        } else {
            res.sendFile(path.join(__dirname, '../client/subpages', 'login.html'));
        }
    });
});

app.get('/overview', (req, res) => {
    validateUser(req.cookies.username, req.cookies.password).then((result) => {
        if (result) {
            res.sendFile(path.join(__dirname, '../client', 'overview.html'));
        } else {
            res.redirect('/');
        }
    });
});
app.get("*",(_req, res)=>{
    res.redirect('/');
});

async function validateUser(username, password) {
    const db = dbClient.db();
    const user = db.collection(userCollectionName);
    const result = await user.findOne({ "username": username, "password": password });
    if (result) {
        return true;
    } else {
        return false;
    }
}

async function createUser(username, password) {
    const db = dbClient.db();
    const user = db.collection(userCollectionName);
    const result = await user.findOne({ "username": username });
    if (result) {
        return false;
    } else {
        await user.insertOne({ "username": username, "password": password });
        return true;
    }
}

wsSrv.on('connection', (socket) => {
    sockets.push(socket);
    socket.on('login', (data) => {
        console.log(data);
        console.log(`Login attempt with username: ${data.username} and password: ${data.password}`);

        if (validateUser(username, password)) {
            socket.send('loginAnswer', true);
        } else {
            socket.send('loginAnswer', false);
        }
    });
});

server.on('close', () => {
    dbClient.close();
    console.log('Server closed');
});

