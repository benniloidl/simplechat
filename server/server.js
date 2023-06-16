const ws = require('ws');
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');

app.use(express.urlencoded({extended: true}));
app.use(express.static("../client"));
app.use(cookieParser());

const server = app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});
const wsSrv = new ws.Server({ server });

let sockets = [];

app.get('/', (req, res) => {
    if(validateUser(req.cookies.username, req.cookies.password) ){
        res.redirect('/overview');
    }else{
    res.sendFile(path.join(__dirname, '../client', 'index.html'));
    }
});

app.get('/overview', (req, res) => {
    if(validateUser(req.cookies.username, req.cookies.password) ){
        res.sendFile(path.join(__dirname, '../client', 'overview.html'));
    }else{
        res.redirect('/overview');
    }
});

function validateUser(username, password){
    return false;
}

wsSrv.on('connection', (socket) => {
    sockets.push(socket);
    socket.on('login', (data) => {
        console.log(data);
        console.log(`Login attempt with username: ${data.username} and password: ${data.password}`);

        if(validateUser(username, password)){
            socket.send('loginAnswer', true);
        } else {
            socket.send('loginAnswer', false);
        }
    });
});

wsSrv.on('close', (socket) => {
    console.log('Client disconnected');
});

server.on('close', () => {
    console.log('Server closed');
});

