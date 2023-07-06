// File also known as masochism.js, handles message encryption and user-validation
const crypto = require("crypto");

/**
 * Generates RSA Key
 * @returns {Promise<CryptoKeyPair>}
 */
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

/**
 * exports public RSA Key as JsonWebKey
 * @param {CryptoKey}publicKey
 * @returns {Promise<JsonWebKey>}
 */
async function getPublicWebKey(publicKey){
    return await crypto.subtle.exportKey("jwk", publicKey);
}

/**
 *
 * @param {String}base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

/**
 *
 * @param {Uint8Array}bytes
 * @returns {string}
 */
function bytesToBase64(bytes){
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("");
    return btoa(binString);
}

/**
 * Decrypt message (USE ONLY FOR AES-KEY) with RSA-KEY
 * @param {String}encryptedMessage
 * @param {CryptoKey}privateKey
 * @returns {Promise<string>}
 */
async function decryptMessage(encryptedMessage, privateKey){
    let decoder = new TextDecoder("utf-8");
    let decrypted = await crypto.subtle.decrypt({name:"RSA-OAEP"}, privateKey, base64ToBytes(encryptedMessage));
    return decoder.decode(decrypted);

}

/**
 * Send RSA-Key to client
 * @param {}socket
 * @returns {Promise<CryptoKey>}
 */
async function sendPublicKey(socket){
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

/**
 * creates PasswordHash of password.
 * uses passwordAlgorithm pbkdf2 with random salt of 16 Bytes.
 * @param {String} password
 * @returns {Promise<{salt: string, hash: string}>}
 */
async function createPasswordHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt,
        1000, 64, 'sha512').toString('hex');
    return { salt: salt, hash: hash };
}

/**
 * validates Password
 * requires in passwordObject 'salt' and 'password' as Password hash
 * @param {String}passwordToCheck
 * @param {Object<{salt:String, hash:String}>}passwordObject
 * @returns {boolean}
 */
function validatePassword(passwordToCheck, passwordObject) {
    const passwordHash = crypto.pbkdf2Sync(passwordToCheck, passwordObject.salt,
        1000, 64, 'sha512').toString('hex');
    return passwordHash === passwordObject.password;
}

/**
 * Generates sessionToken for login
 * @param {string}username
 * @returns {string}
 */
function createSessionToken(username) {
    let key = Date.now().toString() + username;
    const salt = crypto.randomBytes(16).toString('hex');
    return crypto.pbkdf2Sync(key, salt,
        10, 30, 'sha512').toString('hex');
}

/**
 *
 * @param {JsonWebKey}jwk
 * @returns {Promise<CryptoKey>}
 */
async function loadAESKey(jwk){
    return crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "AES-CTR",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 *
 * @param {Object<{iv:string}>}data
 * @param {CryptoKey}privateKey
 * @param socket
 * @returns {Promise<void>}
 */
async function handleKey(data, privateKey, socket){
    const encryptedJwk = data.key;
    const iv = base64ToBytes(data.iv);
    const jwkRaw = await decryptMessage(encryptedJwk, privateKey);
    const jwk = JSON.parse(jwkRaw);
    const key = await loadAESKey(jwk);
    socket.secretKey = key;
    socket.iv = iv;
}

/**
 *
 * @param {string}encryptedMessage
 * @param {CryptoKey}aesKey
 * @param {Uint8Array}iv
 * @returns {Promise<string>}
 */
async function decryptMessageAES(encryptedMessage, aesKey, iv){
    let decoder = new TextDecoder("utf-8");
    let decrypted = await crypto.subtle.decrypt({
        name: "AES-CTR",
        counter: iv,
        length: 128
    },
        aesKey,
        base64ToBytes(encryptedMessage)
    );
    return decoder.decode(decrypted);
}

/**
 *
 * @param {string}message
 * @param {CryptoKey}aesKey
 * @param {Uint8Array}iv
 * @returns {Promise<string>}
 */
async function encryptMessageAESServer(message, aesKey, iv){
    let encoder = new TextEncoder()
    let encoded = encoder.encode(message);
    const cipherText = await crypto.subtle.encrypt({
            name: "AES-CTR",
            counter: iv,
            length: 128
        },
        aesKey,
        encoded
    )
    return bytesToBase64(new Uint8Array(cipherText));
}

module.exports = {
    generateKeyPair,
    decryptMessage,
    getPublicWebKey,
    sendPublicKey,
    createPasswordHash,
    validatePassword,
    createSessionToken,
    loadAESKey,
    handleKey,
    decryptMessageAES,
    encryptMessageAESServer
}