const ws = require('ws');
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017/SimpleChat";
const dbClient = new MongoClient(uri);
let db, user, chatHistory;

let sockets = [];

async function connectToDB() {
    console.log("connecting to db...");
    try {
        await dbClient.connect()
        db = dbClient.db();
        user = db.collection("user");
        chatHistory = db.collection("chatHistory");
    } catch {
        console.error("connecting to db failed");
        process.exit(42);
    }
    console.log("connected successfully\n");

    //test the functions
    validateUser("test123", "123").then((result) => {
        console.log("validation: " + result);
    });
    createUser("test123", "123").then((result) => {
        console.log("creating a new user: " + result);
    });
    addChatID("test123", "123", "ID1234").then((result) => {
        console.log("added ID: "+result);
    });
    removeChatID("test123", "123", "ID1234").then((result) => {
        console.log("removed ID: "+result);
    });
    getAllChatIDs("test123", "123").then((result) => {
        console.log(result);
    });
    //end of test
}

app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());

const server = app.listen(3000, () => {
    console.log("Server is running on port 3000\n");
    connectToDB();
});
const wsSrv = new ws.Server({ server });

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

app.get("*", (_req, res) => {
    res.redirect('/');
});

async function validateUser(username, password) {
    const result = await user.findOne({ "username": username, "password": password }, { projection: { _id: 1 } });
    if (result) {
        return true;
    } else {
        return false;
    }
}

async function createUser(username, password) {
    const result = await user.findOne({ "username": username }, { projection: { _id: 1 } });
    if (result) {
        return false;
    } else {
        await user.insertOne({ "username": username, "password": password, chats: [] });
        return true;
    }
}

async function addChatID(username, password, id) {
    const valid = await validateUser(username, password);
    if (valid) {
        const result = await user.findOne({ "username": username, "chats.id": id }, { projection: { _id: 1 } });
        if (result) {
            return "ID already added";
        }
        await user.updateOne({ "username": username }, { $push: { chats: { "id": id } } });
        return true;
    } else {
        return "wrong username/password"
    }
}

async function removeChatID(username, password, id) {
    const valid = await validateUser(username, password);
    if (valid) {
        const result = await user.findOne({ "username": username, "chats.id": id }, { projection: { _id: 1 } });
        if (!result) {
            return "ID not found";
        }
        await user.updateOne({ "username": username }, { $pull: { chats: { "id": id } } });
        return true;
    } else {
        return "wrong username/password"
    }
}

async function getAllChatIDs(username, password) {
    const valid = await validateUser(username, password);
    if (valid) {
        return await user.findOne({ "username": username }, { projection: { _id: 0, chats: 1 } });
    } else {
        return "wrong username/password"
    }
}

wsSrv.on('connection', (socket) => {
    sockets.push(socket);
    socket.on('login', (data) => {
        console.log(data);
        console.log(`Login attempt with username: ${data.username} and password: ${data.password}`);

        validateUser(username, password).then((result) => {
            if (result) {
                socket.send('loginAnswer', true);
            } else {
                socket.send('loginAnswer', false);
            }
        });
    });
});

server.on('close', () => {
    dbClient.close();
    console.log('Server closed');
});