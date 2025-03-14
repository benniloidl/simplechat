const socket = new WebSocket(location.origin.replace(/^http/, 'ws'));

const chatMessageAmount = 10;

/**
 * Send events over sockets
 * @param eventName
 * @param eventData
 */
socket.sendEvent = async (eventName, eventData) => {
    let publicKey = socket.publicKey;
    let i = 0;
    while (publicKey === "null") {
        i++;
        publicKey = socket.publicKey;
        await new Promise(r => setTimeout(r, 20));
        if (i === 500) {
            console.warn("Encryption timeout");
            encryption = false;
        }
    }
    // console.log("event: " + eventName, eventData);
    let encryption = localStorage.getItem("socketEncryption");

    const message = {
        event: eventName,
        data: eventData,
    };

    if (socket.secretKey && encryption === "true") {
        //* Encryption *//
        let parsedEventData = JSON.stringify(message);

        // const encryptedData = await encryptMessage(parsedEventData, parsedPublicKey);
        const encryptedData = await encryptMessageAES(socket.secretKey, socket.iv, parsedEventData);
        // console.log("encryptedMessage", encryptedData)
        console.log("encryptedFetch: ", parsedEventData);
        // let username = getCookie("username");
        socket.send(JSON.stringify({
            //event: eventName,
            encryptedData: encryptedData,
        }));

    } else {
        // not encrypted
        console.warn("Events are not encrypted", encryption !== "true" ? "Encryption disabled" : "Other error");
        socket.send(JSON.stringify(message));
    }
}

const fileName = location.href.split("/").slice(-1)

socket.onopen = function () {
};

socket.onmessage = async function (event) {
    let parsedEvent = JSON.parse(event.data);
    if (parsedEvent.encryptedData) {
        // console.log("enrypted Data", parsedEvent.encryptedData);
        let data = await decryptMessageAES(parsedEvent.encryptedData, socket.secretKey, socket.iv);
        parsedEvent = JSON.parse(data);
        console.log("encrypted data received")
    } else {
        // console.log("not encrypted data received:", parsedEvent)
    }
    const data = parsedEvent.data;

    switch (parsedEvent.event) {
        case 'publicKey':
            const key = JSON.stringify(data)
            if (isEncryptionEnabled()) {
                const jwk = JSON.parse(key);
                handleKeyAES(jwk, socket).then(null);
            }
            if (fileName[0] === "dashboard") {
                chat_fetch_overview(socket)
            }

            break;
        case 'login':
            loginUser(data);
            break;
        case 'register':
            loginUser(data);
            break;
        case 'logout':
            if (!data.status) console.error("Cannot Logout");
            else window.location.href = "/login";
        case 'fetchChats':
            try {
                buildChatOverview(data);
            } catch (e) { // if the element is not yet loaded
                setTimeout(() => buildChatOverview(data), 1000);
            }
            break;
        case 'createChat':
            try {
                buildChatOverview(data);
                loadChat2(data.chats[0].type, data.chats[0].chatID);
            } catch (e) { // if the element is not yet loaded
                setTimeout(() => {
                    buildChatOverview(data);
                    loadChat2(data.chats[0].type, data.chats[0].chatID)
                }, 1000);
            }

            break;
        case 'fetchMessages':
            const messages = sessionStorage.getItem("loadedMessages");
            buildChatMessages(data, messages);
            if (!messages) {
                sessionStorage.setItem("loadedMessages", data.messages.length.toString());
            } else {
                sessionStorage.setItem("loadedMessages", (parseInt(messages) + data.messages.length).toString());
            }
            if (data.next && data.next > 0) {

                chat_scrolled(socket, data.chatID, data.next);
            }
            break;
        case 'messageNotification': {
            //TODO fix unreadMessages counter
            console.log("notificationData", data.message)
            notificationHandler(data);
            break;
        }
        case 'messagesRead': {
            markChatAsRead(data);
            break
        }
        case 'fetchGroupUsers': {
            createViewContainer(data.users);
            break;
        }
        case 'deleteAccount': {
            console.log("deleteAccount")
            if (data.status) {
                sessionStorage.clear();
                localStorage.clear();
                logout();
            }
            break;
        }
        case 'addUser': {
            if (data.status) {
                // console.log("addUser", data);
                chat_get_group_users(socket, data.chatID);

                // createViewContainer(data)
                // const a = getChatNodeById(data.data.chatID);
                // if(a) a.remove();
            }
            break;
        }
        case 'removeUser': {
            if (data.status && data.username === getCookie("username")) {
                const a = getChatNodeById(data.chatID);
                if (a) a.remove();
                injectPageAsync("../subpages/dashboard/profile.html", cleanStorage);
            } else {
                chat_get_group_users(socket, data.chatID);
            }
            break;
        }
        case 'changePassword': {
            console.log("changePassword", data.status, data);

            if (data.status) {
                feedbackChangePassword("Changed Password successfully!", true);
            } else if (data.message) {
                feedbackChangePassword(data.message, false);
            } else {
                feedbackChangePassword("Something went wrong changing your password!", false);
            }
            break;
        }
        case 'changeGroupName': {
            changeGroupNameEventHandler(data);
            break;
        }
        case 'addChat': {
            buildChatNavigator(data);
            break;
        }

        case 'error':
            errorEvent(data.message);
            break;
        default:
            errorEvent("unknown event: " + event);

    }
};

socket.onclose = function () {
    // alert("Connection Lost");
    serverConnectionLost();
    //
};

/**
 * data = { event: 'login', status: true, sessionToken: loginToken}
 * @param data {event: string, status: boolean, sessionToken: String}
 */
function loginUser(data) {
    if (data.status) {
        const result = getValues()
        // const maxAge = 5184000; // 2 months (60 sec * 60 min * 24h * 30d * 2)
        const maxAge = 172800; // 2 days (60 sec * 60 min * 24h * 2)
        document.cookie = `username=${result.username};Max-Age=${maxAge};secure;sameSite=lax`;
        document.cookie = `sessionToken=${data.sessionToken};Max-Age=${maxAge};secure;sameSite=lax`;
        window.location.href = "/dashboard";
    } else {
        pwdError("invalid login credentials");
    }
}

/**
 * Write error messages on dashboard
 * @param message
 */
function errorEvent(message) {
    // console.warn("EventError: ", message);
    showError(message);
    // TODO POPUP
}

/**
 * User-event: send a message to server
 * @param chatID
 */
function sendMessage(chatID) {
    let textField = document.querySelector("#chat-actions div textarea")
    let message = textField.value.trim();
    textField.value = "";
    let temp = message.replace("[\n\t ]", "");

    if (temp === "") return;

    chat_send_message(socket, chatID, message);
}

/**
 * request server for login
 * @param type
 * @returns {boolean}
 */
function loginRequest(type) {
    const result = getValues()
    if (result === null) {
        console.log("Not in format")
        return false;
    }
    if (type === "login") {
        socket.sendEvent('login', {
            username: result.username,
            password: result.password,
        });
    } else {
        socket.sendEvent('register', {
            username: result.username,
            password: result.password,
        });
    }

    return false;
}

/**
 * User-event: create new chat
 * "user" or "group"
 * @param type
 */
function newChat(type) {

    let chatName = document.querySelector("input[type=text]").value.trim();
    if (chatName === "") return;
    let users = [];

    let name = chatName.trim();
    if (type === "user") {
        if (!checkUsernameSemantic(chatName)) {
            showError("Username must only contain upper- and lowercase " +
                "letters, digits and the special characters \\+\\-\\_\\.");
            return;
        }
        users = [chatName];
    }
    // else {/*Empty Group*/}

    showError("");
    chat_create_new_chat(socket, name, type, users);
}

/**
 * User-event: leave chat
 */
function removeUser(username) {
    let chatID = sessionStorage.getItem("openedChat");

    socket.sendEvent('removeUser', {
        chatID: chatID,
        username: username
    }).then(null);
}

/**
 * returns
 * @param {File}file
 * @return {Promise<String>}
 */
async function loadFile(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
            resolve(fileReader.result);
        }
        fileReader.onerror = reject;
        fileReader.readAsDataURL(file);
    })

}

// async function readAllFiles(files){
//     let fileData =[]
//     for (const file of files) {
//         let data = await loadFile(file);
//         fileData.push(data);
//     }
//     return fileData;
// }

/**
 * Loads file encodes them and sends it to server
 * @param {File}file
 */
function sendMediaToServer(file) {
    // readAllFiles(files).then((base64EncodedFiles) =>{
    //     let type = files[0].type
    //     chat_sendMedia(type, base64EncodedFiles);
    // })
    const chatID = sessionStorage.getItem("openedChat");
    loadFile(file).then((base64EncodedFile) => {
        let type = file.type;
        chat_sendMedia(type, base64EncodedFile, chatID);
    })
}

/**
 * TESTMETHOD
 */
function sendMediaToServerTestMethod() {
    const emitter = document.getElementById("submit-file");
    if (emitter) {
        sendMediaToServer(emitter.files[0]);
    }
}

/**
 *
 * @param {String}mediaType
 * @param {String}base64FileContent
 * @param {String|Number}chatId
 */
function chat_sendMedia(mediaType, base64FileContent, chatId) {
    socket.sendEvent('sendMedia', {
        mediaType: mediaType,
        file: base64FileContent,
        chatID: chatId
    }).then(null);
}

/**
 *
 * @param {String}username
 */
function chat_addUser(username) {
    let chatID = sessionStorage.getItem("openedChat");

    socket.sendEvent('addUser', {
        chatID: chatID,
        username: username
    }).then(null);
}

/**
 * Constructs event-data-structure and sends it to server
 * @param socket
 * @param {String|Number}chatId
 * @return {void}
 */
function chat_fetchMessage(socket, chatId) {
    socket.sendEvent('fetchMessages', {
        chatID: chatId,
        start: 0,
        amount: chatMessageAmount
    });
}

/**
 * Constructs event-data-structure and sends it to server
 * @param socket
 * @param {String|Number}chatId
 * @return {void}
 */
function chat_scrolled(socket, chatId) {
    const loadedMessages = parseInt(sessionStorage.getItem("loadedMessages"));
    socket.sendEvent('fetchMessages', {
        chatID: chatId,
        start: (loadedMessages),
        amount: chatMessageAmount
    });
}


/**
 * Constructs event-data-structure and sends it to server
 * @param socket
 * @param {String|Number}chatId
 * @return {void}
 */
function chat_send_message(socket, chatId, message) {
    socket.sendEvent('sendMessage', {
        message: message,
        chatID: chatId,
        // Server injects "timeStamp," "author" and "read"
    });
}

/**
 * Constructs event-data-structure and sends it to server
 * @param socket
 * @param {String|Number}chatId
 * @return {void}
 */
function chat_create_new_chat(socket, name, type, users) {
    socket.sendEvent('createChat', {
        name: name,
        type: type,
        users: users
    });
}

/**
 * Constructs event-data-structure and sends it to server
 * @param socket
 * @param {String|Number}chatId
 * @return {void}
 */
function chat_read_event(socket, chatId) {
    socket.sendEvent('readChat', {
        chatID: chatId
    })
}

function chat_fetch_overview(socket) {
    socket.sendEvent('fetchChats', "")
}

/**
 * Constructs event-data-structure and sends it to server
 * @param socket
 * @param {String|Number}groupId
 * @return {void}
 */
function chat_get_group_users(socket, groupId) {
    socket.sendEvent('fetchGroupUsers', {
        chatID: groupId
    });
}

/**
 * Constructs event-data-structure and sends it to server
 * @param socket
 * @param {String}username
 * @return {void}
 */
function chat_delete_account(socket, username) {
    // username should be redundant, you should only be able to delete your own account
    socket.sendEvent("deleteAccount", {
        username: username
    });
}

/**
 * Constructs event-data-structure and sends it to server
 * @param {string}username
 * @param {string}oldPassword
 * @param {string}newPassword
 */
function chat_changePassword(username, oldPassword, newPassword) {
    socket.sendEvent("changePassword", {
        username: username,
        oldPassword: oldPassword,
        newPassword: newPassword
    });
}
/**
 * Constructs event-data-structure and sends it to server
 * @param {String|Number}chatID
 * @param {String}newGroupName
 * @return {void}
 */
function chat_change_group_name(chatID, newGroupName) {
    socket.sendEvent("changeGroupName", {
        chatID: chatID,
        newGroupName: newGroupName
    });

}

function chat_send_logout(username) {
    socket.sendEvent("logout", {
        username: username
    });
}

