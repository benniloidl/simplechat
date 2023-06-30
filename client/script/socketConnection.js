const socket = new WebSocket(location.origin.replace(/^http/, 'ws'));

const chatMessageAmount = 10;

/**
 * Send events over sockets
 * @param eventName
 * @param eventData
 */
socket.sendEvent = (eventName, eventData) => {
    const message = {
        event: eventName,
        data: eventData,
    };
    console.log("event: " + eventName, eventData);
    socket.send(JSON.stringify(message));
}

const fileName = location.href.split("/").slice(-1)

socket.onopen = function () {
    if (fileName[0] === "dashboard") {
        chat_fetch_overview(socket)
    }
};

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    console.log("onMessage", data.event, data)
    switch (data.event) {
        case 'login':
            loginUser(data);
            break;
        case 'register':
            loginUser(data);
            break;
        case 'fetchChats':
            try {
                buildChatOverview(data.chats);
            } catch (e) { // if the element is not yet loaded
                setTimeout(() => buildChatOverview(data.chats), 1000);
            }
            break;
        case 'fetchMessages':
            try {
                buildChatMessages(data.data)
            } catch (e) {
                console.log("fetch2", e)
                setTimeout(() => buildChatMessages(data.data), 100);
            }
            break;
        case 'messageNotification': {
            notificationHandler(data.notification);
            break;
        }
        case 'fetchGroupUsers':{
            createViewContainer(data.data.users);
            break;
        }
        
        case 'error': {
            errorEvent(data);
            break;
        }
    }
};

socket.onclose = function (event) {
};
function loginUser(data) {
    if (data.status) {
        const result = getValues()
        document.cookie = "username= " + result.username + ";";
        document.cookie = "password= " + result.password + ";secure";
        window.location.href = "/dashboard";
    }
}

/**
 * Write error messages on dashboard
 * @param message
 */
function errorEvent(message) {
    console.warn("Event", message);
    // TODO POPUP
}

/**
 * User-event: send message to server
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
        socket.sendEvent('login', { username: result.username, password: result.password })
    } else {
        socket.sendEvent('register', { username: result.username, password: result.password })
    }
    
    return false;
}

/**
 * User-event: create new chat
 * "user" or "group"
 * @param type
 */
function newChat(type) {
    let inform = document.querySelector("input[type=text]").value.trim();
    if (inform === "") return;
    let users = [];
    
    let name = inform.trim();
    if (type === "user") {
        users = [inform];
    }
    // else {/*Empty Group*/}
    chat_create_new_chat(socket, name, type, users);
}

/**
 * User-event: leave chat
 */
function leaveChat() {
    console.error("NOT IMPLEMENTED")
    // let chatID = localStorage.getItem("openedChat");
    // chat_leave(socket, chatID);
    
}

function chat_leave(socket, chatId) {
    socket.sendEvent('leaveChat', {
        chatID: chatId
    });
    chat_fetch_overview(socket);
}

function chat_selected(socket, chatId) {
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
        // timeStamp, author, read are injected by Server
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