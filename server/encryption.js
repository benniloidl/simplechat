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
    console.log(encryptedMessage)
    let decrypted = await crypto.subtle.decrypt({name:"RSA-OAEP"}, privateKey, base64ToBytes(encryptedMessage));
    let decryptedMessage =  decoder.decode(decrypted);
    console.log("decrypt", decryptedMessage);
    return decryptedMessage;

}

async function sendPublicKey(socket){
    const keyPair = await generateKeyPair();
    const publicWebKey = await getPublicWebKey(keyPair.publicKey);
    const message = JSON.stringify({
        event:"publicKey",
        data:publicWebKey
    });
    console.log(message)
    socket.send(message);
    return keyPair.privateKey;
}

module.exports = {
    generateKeyPair,
    decryptMessage,
    getPublicWebKey,
    sendPublicKey
}