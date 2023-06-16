const ws = require('ws');
const app = require('express')();


const server = app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});
const wsSrv = new ws.Server({ server });


wsSrv.on('connection', (socket) => {
    socket.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'login') {
            const { username, password } = data;
            // Hier können Sie die übermittelten Anmeldeinformationen überprüfen
            console.log(`Login attempt with username: ${username} and password: ${password}`);

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

