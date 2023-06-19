const ws = require('ws');
const app = require('express')();
const cookieParser = require('cookie-parser');

app.use(express.static(path.join(__dirname, '../client')));
app.use(cookieParser());

const server = app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});
const wsSrv = new ws.Server({ server });

let sockets = [];

app.get('/', (req, res) => {
    if (validateUser(req.cookies.username, req.cookies.password)) {
        res.redirect('/overview');
    } else {
        res.sendFile(path.join(__dirname, '../client/subpages', 'login.html'));
    }
});

app.get('/overview', (req, res) => {
    if (validateUser(req.cookies.username, req.cookies.password)) {
        res.sendFile(path.join(__dirname, '../client', 'overview.html'));
    } else {
        res.redirect('/overview');
    }
});

function validateUser(username, password) {
    return false;
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
    console.log('Client disconnected');
});

