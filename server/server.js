const ws = require('ws');
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017/SimpleChat";
const dbClient = new MongoClient(uri);
const dbFunctions = require('./db');
let db, user, chatHistory;

let sockets = [];


app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());

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

app.get('/overview', (req, res) => {
    /*     validateUser(req.cookies.username, req.cookies.password).then((result) => {
            if (result) {
                res.sendFile(path.join(__dirname, '../client', 'overview.html'));
            } else {
                res.redirect('/');
            }
        }); */
});

app.get("*", (_req, res) => {
    res.redirect('/');
});


//receive message
wsSrv.on('connection', (socket) => {
    sockets.push(socket);
    socket.on('message', (data) => {
        console.log(data);
        console.log(`Login attempt with username: ${data.username} and password: ${data.password}`);

        /* validateUser(username, password).then((result) => {
            if (result) {
                socket.send('loginAnswer', true);
            } else {
                socket.send('loginAnswer', false);
            }
        }); */
    });
});


server.on('close', () => {
    dbClient.close();
    console.log('Server closed');
});