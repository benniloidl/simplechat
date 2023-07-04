const socket = new WebSocket(location.origin.replace(/^http/, 'ws'));

const chatMessageAmount = 10;

/**
 * Send events over sockets
 * @param eventName
 * @param eventData
 */
socket.sendEvent = async (eventName, eventData) => {
    let publicKey = localStorage.getItem("publicKey");
    let i = 0;
    while(publicKey=="null"){
        i++;
        publicKey=localStorage.getItem("publicKey");
        await new Promise(r => setTimeout(r, 20));
        if(i===500){
            console.warn("Encryption timeout");
            encryption = false;
        }
    };
    console.log("event: " + eventName, eventData);
    let encryption = localStorage.getItem("socketEncryption");

    const message = {
        event: eventName,
        data: eventData,
    };

    if (publicKey && encryption==="true") {
        //* Encryption *//
        let parsedPublicKey = JSON.parse(publicKey);
        let parsedEventData = JSON.stringify(message);

        const encryptedData = await encryptMessage(parsedEventData, parsedPublicKey);
        // console.log("encryptedMessage", encryptedData)
        console.log("encryptedFetch: ", parsedEventData);
        // let username = getCookie("username");
        socket.send(JSON.stringify({
            //event: eventName,
            encryptedData: encryptedData,
        }));

    } else {
        // not encrypted
        console.warn("Events are not encrypted", encryption!=="true"?"Encryption disabled":"Other error");
        socket.send(JSON.stringify(message));
    }
}

const fileName = location.href.split("/").slice(-1)

socket.onopen = function () {
    // if (fileName[0] === "dashboard") {
    //     chat_fetch_overview(socket)
    // }
    localStorage.setItem("publicKey", "null");
};

socket.onmessage = function (event) {
    const parsedEvent = JSON.parse(event.data);
    const data = parsedEvent.data;
    console.log("onMessage", parsedEvent.event, data)
    switch (parsedEvent.event) {
        case 'publicKey':
            const key = JSON.stringify(data)
            localStorage.setItem("publicKey", key);

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
        case 'fetchChats':
            try {
                buildChatOverview(data);
            } catch (e) { // if the element is not yet loaded
                setTimeout(() => buildChatOverview(data), 1000);
            }
            break;
        case 'fetchMessages':
            buildChatMessages(data);
            if(data.next && data.next > 0){
                chat_scrolled(socket, data.chatID, data.next);
            }
            break;
        case 'messageNotification': {
            //TODO fix unreadMessages counter
            notificationHandler(data);
            break;
        }
        case 'messagesRead':{
            markChatAsRead(data);
            break
        }
        case 'fetchGroupUsers':{
            createViewContainer(data.users);
            break;
        }
        case 'deleteAccount': {
            if(data.status) {
                sessionStorage.clear();
                localStorage.clear();
                logout();
            }
            break;
        }
        case 'addUser':{
            if(data.status){
                console.log("addUser", data);
                chat_get_group_users(socket, data.chatID);

                // createViewContainer(data)
                // const a = getChatNodeById(data.data.chatID);
                // if(a) a.remove();
            }
            break;
        }
        case 'removeUser':{
            if(data.status && data.username===getCookie("username")){
                const a = getChatNodeById(data.chatID);
                if(a) a.remove();
                injectPageAsync("../subpages/dashboard/profile.html", cleanStorage);
            }else{
                chat_get_group_users(socket, data.chatID);
            }
            break;
        }

        case 'error': {
            errorEvent(data.message);
            break;
        }
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
        // document.cookie = "password= " + result.password + ";secure";
        document.cookie = `sessionToken=${data.sessionToken};Max-Age=${maxAge};secure;sameSite=lax`;

        console.log("publicKey", data.publicKey);
        // let keyData = window.btoa(JSON.stringify(data.publicKey));
        let keyData = JSON.stringify(data.publicKey);
        console.log("keys-> loginUser", keyData);
        localStorage.setItem("publicKey", keyData);

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
    const chatID2 = sessionStorage.getItem("openedChat");
    console.log("chatIDComp", chatID, chatID2)

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
        if(!checkUsernameSemantic(chatName)) {
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

function chat_addUser(username){
    let chatID = sessionStorage.getItem("openedChat");

    socket.sendEvent('addUser', {
        chatID: chatID,
        username: username
    }).then(null);
}

function chat_fetchMessage(socket, chatId) {
    socket.sendEvent('fetchMessages', {
        chatID: chatId,
        start: 0,
        amount: chatMessageAmount
    });
}

function chat_scrolled(socket, chatId) {
    let times = 2; // TODO
    socket.sendEvent('loadChatMessages', {
        chatID: chatId,
        start: (chatMessageAmount * times),
        amount: chatMessageAmount
    });
}

function chat_send_message(socket, chatId, message) {
    socket.sendEvent('sendMessage', {
        message: message,
        chatID: chatId,
        // Server injects "timeStamp," "author" and "read"
    });
}

function chat_create_new_chat(socket, name, type, users) {
    socket.sendEvent('createChat', {
        name: name,
        type: type,
        users: users
    });
}

function chat_read_event(socket, chatId) {
    socket.sendEvent('readChat', {
        chatID: chatId
    })
}

function chat_fetch_overview(socket) {
    socket.sendEvent('fetchChats', "")
}

function chat_get_group_users(socket, groupId){
    console.log("groupId", groupId);
    socket.sendEvent('fetchGroupUsers', {
        chatID: groupId
    });
}

function chat_delete_account(socket, username){
    // username should be redundant, you should only be able to delete your own account
    socket.sendEvent("deleteAccount", {
        username: username
    });
}