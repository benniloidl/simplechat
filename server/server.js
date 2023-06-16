const ws = require('ws');
const app = require('express')();
const cookieParser = require('cookie-parser');

app.use(cookieParser());

const server = app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});
const wsSrv = new ws.Server({ server });


wsSrv.on('connection', (socket) => {
    socket.on('message', (message) => {
        const data = JSON.parse(message);


        if (data.type === 'login') {
            const { username, password } = data;
            console.log(`Login attempt with username: ${username} and password: ${password}`);

            // Erstelle Cookie
            const cookieValue = { username, password };
            const cookieOptions = { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 };
            app.use(express.json());
            app.use((req, res, next) => {
                res.cookie('auth', JSON.stringify(cookieValue), cookieOptions);
                next();
            });

            //hier die db abfrage
            if (username === 'test' && password === 'test123') {
                socket.send(JSON.stringify({ type: 'login', success: true }));
            } else {
                socket.send(JSON.stringify({ type: 'login', success: false }));
            }
        }
    });
});
server.on('close', () => {
    console.log('Client disconnected');
});

