const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

/**
 *Method detects preferred color scheme and manual overwrites,
 * it sets the attribute for CSS
 * @returns {undefined | false}
 */
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

/**
 * manual overwrite for color scheme
 */
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

/**
 * read and parses cookie, returns value of the requestet cookie
 * if cookie is not set, returns undefined
 * @param name
 * @returns {string | undefined}
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

/**
 * Logout, clears session cookies and sessionStorage
 * LocalStorage remains
 */
function logout() {
    chat_send_logout(getCookie("username"));
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    sessionStorage.clear();
    // window.location.href = "/login";
}

/**
 * Toggle the chat information overview of the chats.
 * @param event // TODO event is deprecated
 */
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

/**
 * request server to delete user account,
 * server will respond event 'deleteAccount' with status or will send Error
 */
function deleteUserAccount() {
    // last chance
    let confirmation = confirm("Are you sure to delete Account?!");
    if (!confirmation) return;

    let username = getCookie("username");
    chat_delete_account(socket, username);
}

/**
 * check sematic of username
 * @param {string}username
 * @returns {*}matches
 */
function checkUsernameSemantic(username) {
    return username.match(/^[a-zA-Z0-9._\-+]*$/g);
}

/**
 *
 * @param {string}password
 * @returns {boolean}
 */
function checkPasswordSemantic(password) {
    return (
        password.match(/[a-z]/g) &&
        password.match(/[A-Z]/g) &&
        password.match(/[0-9]/g) &&
        password.match(/\W/g) &&
        password.length >= 8
    );
}

/**
 * Imports public Key from server, jwk has to be in JSON format
 * @param jwk
 * @returns {Promise<CryptoKey>}
 */
async function importPublicKey(jwk) {
    return await window.crypto.subtle.importKey("jwk", jwk, {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
    },
        true,
        ["encrypt"]
    );
}

/**
 * imports public RSA key, encrypts message with RSA and decode it to base64
 * Should only be used to encrypt AES Key, because of length restrictions
 * @param {string} message
 * @param {JSON} publicKey
 * @returns {Promise<string>}
 */
async function encryptMessage(message, publicKey) {
    let enc = new TextEncoder();
    let key = await importPublicKey(publicKey)
    const cipherText = await window.crypto.subtle.encrypt({ name: "RSA-OAEP", }, key, enc.encode(message));
    return bytesToBase64(new Uint8Array(cipherText));
}

/**
 *
 * @param {Uint8Array}bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("");
    return btoa(binString);
}

/**
 *
 * @param {String}base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
    const binString = window.atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

/**
 * Generates new AES Key
 * @returns {Promise<CryptoKey>}
 */
async function generateAESKey() {
    return window.crypto.subtle.generateKey({
        name: "AES-CTR",
        length: 256,
    },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * encrypts message with AES,
 * iv should be synchronised between server and client
 * returns encrypted message base64 encoded
 * @param {CryptoKey}aesKey
 * @param {Uint8Array}iv
 * @param {String}message
 * @returns {Promise<string>}
 */
async function encryptMessageAES(aesKey, iv, message) {
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

/**
 * decrypt message with AES,
 * iv should be synchronised between server and client
 * takes encrypted message base64 encoded
 * returns message as normal String
 * @param {string}encryptedMessage // base 64
 * @param {CryptoKey}aesKey
 * @param {Uint8Array}iv
 * @returns {Promise<string>}
 */
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

/**
 * Exports AES key, should only be used to send key to server
 * @param {CryptoKey}aesKey
 * @returns {Promise<JsonWebKey>}
 */
async function exportKeyAES(aesKey) {
    return window.crypto.subtle.exportKey("jwk", aesKey);
}


/**
 * Wrapper function, to handle key Exchange
 * @param {JsonWebKey}publicKeyJwk
 * @param {socket}socket
 * @returns {Promise<void>}
 */
async function handleKeyAES(publicKeyJwk, socket) {
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
    socket.send(JSON.stringify({ event: "secretKey", data: { key: message, buffer: key.buffer, iv: ivString } }));
}

/**
 *
 * @param {boolean}boolean
 */
function setSocketEncryption(boolean) {
    localStorage.setItem("socketEncryption", boolean.toString());
}

/**
 * Should encryption be enabled
 * @returns {boolean}
 */
function isEncryptionEnabled() {
    return localStorage.getItem("socketEncryption") === "true";
}

/**
 * Checks ability of system to encrypt and set to local Storage
 * @returns {void}
 */
function encryptionAvailable() {
    if (window.isSecureContext) {
        setSocketEncryption(true);
    } else {
        setSocketEncryption(false);
    }
}

/**
 * Show or hide error messages in element id: "dashboardError"
 * @param {string}message
 */
function showError(message) {
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
    if (message) {
        console.warn(message);
    }

    // TODO: remove
    // function showPassword(passwordID, value){
    //     const pwField = document.getElementById('old-password');
    //     pwField.type = value?"password":"text";
    // }
}

/**
 * Creates overlay and tries to reconnect to server
 */
function serverConnectionLost() {
    const element = document.createElement("div");
    const wrapper = document.createElement("div");
    const heading = document.createElement("h1");
    const text = document.createElement("p");
    const button = document.createElement("button");
    heading.textContent = "You lost connection with our server!";
    button.textContent = "Reload";
    text.textContent = "Reconnect will be attempted in 5 seconds."

    wrapper.appendChild(heading);
    wrapper.appendChild(text);
    wrapper.appendChild(button);

    // TODO: remove
    // wrapper.innerHTML = "some Text ";
    element.classList.add("missingConnection");

    element.appendChild(wrapper);
    document.body.appendChild(element);

    // TODO: remove
    // document.body.replaceWith(element)

    function timer() {
        setTimeout(() => {
            console.log("timer");
            window.location.reload();
            timer();
        }, 5000);
    }

    button.addEventListener("click", () => window.location.reload());
    timer();
}

/* When an input field reports the event 'onfocusin', the class 'input-focus' will be added to its parent div. */
focusInputField = (element) => {
    element.parentNode.classList.add("input-focus")
}

/* When an input field reports the event 'onfocusout', the class 'input-focus' will be removed from its parent div if the value is empty. */
loseFocusInputField = (element) => {
    if (element.value === "") element.parentNode.classList.remove("input-focus")
}