const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

function detectColorScheme() {
    let theme = "light";    //default to light
    let oldTheme = localStorage.getItem("theme")
    console.log("local-storage:", oldTheme);
    //local storage is used to override OS theme settings
    if (localStorage.getItem("theme")) {
        if (localStorage.getItem("theme") === "dark") {
            theme = "dark";
        }
        if (localStorage.getItem("theme") === "high-contrast") {
            theme = "high-contrast";
        }
    } else if (!window.matchMedia) {
        //matchMedia method isn't supported
        return false;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        //OS theme setting detected as dark
        theme = "dark";
    }
    if (window.matchMedia("(prefers-contrast: more)").matches) {
        console.log("High-Contrast");
        // Future Feature
        // theme = "high-contrast"
    }
    console.log("detected: ", theme)
    
    //dark theme preferred, set document with a `data-theme` attribute
    localStorage.setItem("theme", theme)
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    } else if (theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
    } else if (theme === "high-contrast") {
        // Future Feature
        // document.documentElement.setAttribute("data-theme", "high-contrast")
    }
}

function changeColorScheme() {
    let oldTheme = document.documentElement.getAttribute("data-theme");
    let theme = "light";
    if (oldTheme === "dark") {
        console.log("dark")
        theme = "light";
    } else if (oldTheme === "light") {
        theme = "dark";
    }
    localStorage.setItem("theme", theme)
    document.documentElement.setAttribute("data-theme", theme);
}

mediaQuery.addEventListener('change', () => {
    localStorage.removeItem("theme");
    detectColorScheme()
});
detectColorScheme();

function getCookie(name) {
    const value = `; ${ document.cookie }`;
    const parts = value.split(`; ${ name }=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function logout() {
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    sessionStorage.clear();
    window.location.href = "/login";
}

function toggleChatOverview(event) {
    const chatOverview = document.querySelector('.chat-overview-wrapper')

    if (!chatOverview) return

    let attr = chatOverview.getAttribute('data-overview-open')
    attr = (attr === 'true') ? 'false' : 'true'
    chatOverview.setAttribute('data-overview-open', attr)
    
    if (event.target.hasAttribute("data-selected"))
        event.target.removeAttribute("data-selected")
    else
        event.target.setAttribute("data-selected", "")
}

function deleteUserAccount(){
    // last chance
    let confirmation = confirm("Are you sure to delete Account?!");
    if(!confirmation) return;

    let username = getCookie("username");
    chat_delete_account(socket, username);
    // sessionStorage.clear();
    // localStorage.clear();
    // logout();
}

function checkUsernameSemantic(username){
    return username.match(/^[a-zA-Z0-9._\-+]*$/g);
}

function checkPasswordSemantic(passwordField){
    return (
        passwordField.match(/[a-z]/g) &&
        passwordField.match(/[A-Z]/g) &&
        passwordField.match(/[0-9]/g) &&
        passwordField.match(/\W/g) &&
        passwordField.length >= 8
    );
}

async function importPublicKey(jwk){
    return await window.crypto.subtle.importKey("jwk", jwk,{
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        },
        true,
        ["encrypt"]
    );
}

async function encryptMessage(message, publicKey){
    let enc = new TextEncoder();
    let key = await importPublicKey(publicKey)
    const cipherText = await window.crypto.subtle.encrypt({name: "RSA-OAEP", }, key, enc.encode(message));
    return bytesToBase64(new Uint8Array(cipherText));
}
function bytesToBase64(bytes){
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("");
    return btoa(binString);
}
function base64ToBytes(base64) {
    const binString = window.atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

async function generateAESKey(){
    return window.crypto.subtle.generateKey({
        name: "AES-CTR",
        length: 256,
    },
        true,
        ["encrypt", "decrypt"]
    );
}

async function encryptMessageAES(aesKey, iv, message){
    // console.log("encyptMessage", aesKey, iv, message);
    let encoder = new TextEncoder()
    let encoded = encoder.encode(message);
    const cipherText = await window.crypto.subtle.encrypt({
        name: "AES-CTR",
        counter: iv,
        length: 128
    },
        aesKey,
        encoded
        )
    return bytesToBase64(new Uint8Array(cipherText));
}
async function decryptMessageAES(encryptedMessage, aesKey, iv) {
    // console.log("decryptMessage", aesKey, iv, encryptedMessage);
    let decoder = new TextDecoder("utf-8");
    let decrypted = await window.crypto.subtle.decrypt({
            name: "AES-CTR",
            counter: iv,
            length: 128
        },
        aesKey,
        base64ToBytes(encryptedMessage)
    );
    return decoder.decode(decrypted);
}
async function exportKeyAES(aesKey){
    return window.crypto.subtle.exportKey("jwk", aesKey);
}

async function handleKeyAES(publicKeyJwk, socket){
    let key = window.crypto.getRandomValues(new Uint8Array(16));
    let iv = window.crypto.getRandomValues(new Uint8Array(16));
    // const publicKey = await importPublicKey(publicKeyJwk);
    const aesKey = await generateAESKey(key.buffer);
    socket.secretKey = aesKey;
    socket.iv = iv;
    const aesJWK = await exportKeyAES(aesKey);
    const aesString = JSON.stringify(aesJWK);
    // let parsedPublicKey = JSON.parse(localStorage.getItem("publicKey"));
    const message = await encryptMessage(aesString, publicKeyJwk);
    console.log("send secret Key (AES) from client to server")
    const ivString = bytesToBase64(iv);
    socket.send(JSON.stringify({event:"secretKey", data:{key:message, buffer:key.buffer, iv: ivString}}));
}

function setSocketEncryption(boolean){
    localStorage.setItem("socketEncryption", boolean);
}

function isEncryptionEnabled(){
    return localStorage.getItem("socketEncryption") === "true";
}

function encryptionAvailable(){
    if(window.isSecureContext){
        setSocketEncryption(true);
    } else{
        setSocketEncryption(false);
    }
}

/**
 * Show or hide error messages in element id: "dashboardError"
 * @param message
 */
function showError(message){
    //* reset error message if a message is empty: ""*//
    const messageboxList = document.querySelectorAll(".error");
    for (const messagebox of messageboxList) {
        if (!messagebox) {
            console.error("Error thrown by handling another Error: " +
                "Messagebox to inject message is not defined, " +
                "Errormessage to print: ", message);
            return;
        }
        messagebox.innerHTML = message;
    }
    if(message){
        console.warn(message);
    }

function showPassword(passwordID, value){
    const pwField = document.getElementById('old-password');
    pwField.type = value?"password":"text";
}
}