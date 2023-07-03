const crypto = require("crypto");

async function generateKeyPair(){
    return await crypto.subtle.generateKey({
            name: "RSA-OAEP",
            // Consider using a 4096-bit key for systems that require long-term security
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

async function getPublicWebKey(publicKey){
    return await crypto.subtle.exportKey("jwk", publicKey);
}

function base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
}
async function decryptMessage(encryptedMessage, privateKey){
    let decoder = new TextDecoder("utf-8");
    // console.log(encryptedMessage)
    let decrypted = await crypto.subtle.decrypt({name:"RSA-OAEP"}, privateKey, base64ToBytes(encryptedMessage));
    return decoder.decode(decrypted);

}

async function sendPublicKey(socket){
    // console.log("Sending new public Key!!!")
    const keyPair = await generateKeyPair();
    socket.privateKey = keyPair.privateKey;
    const publicWebKey = await getPublicWebKey(keyPair.publicKey);
    const message = JSON.stringify({
        event:"publicKey",
        data:publicWebKey
    });
    socket.send(message);
    return keyPair.privateKey;
}
async function createPasswordHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt,
        1000, 64, 'sha512').toString('hex');
    return { salt: salt, hash: hash };
}

function validatePassword(passwordToCheck, passwordObject) {
    const passwordHash = crypto.pbkdf2Sync(passwordToCheck, passwordObject.salt,
        1000, 64, 'sha512').toString('hex');
    return passwordHash === passwordObject.password;
}

function createSessionToken(username) {
    let key = Date.now().toString() + username;
    const salt = crypto.randomBytes(16).toString('hex');
    return crypto.pbkdf2Sync(key, salt,
        10, 30, 'sha512').toString('hex');
}

module.exports = {
    generateKeyPair,
    decryptMessage,
    getPublicWebKey,
    sendPublicKey,
    createPasswordHash,
    validatePassword,
    createSessionToken
}