const socket = new WebSocket(location.origin.replace(/^http/, 'ws'));

const chatMessageAmount = 10;


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
        chat_overview(socket)
    }
};

function loginUser(data) {
    if (data.status) {
        const result = getValues()
        document.cookie = "username= " + result.username + ";";
        document.cookie = "password= " + result.password + ";secure";
        window.location.href = "/dashboard";
    }
}

function buildChatOverview(chats) {
    chats.forEach(data => {
        const navigator = document.createElement("div");
        let unreadMessages = data.unreadMessages ? data.unreadMessages : 0;
        navigator.setAttribute("data-unread-messages", unreadMessages);
        navigator.classList.add("chat-contact");
        if (unreadMessages > 0) {
            navigator.classList.add("notification");
        }
        navigator.setAttribute("data-chat-id", data.chatID);
        navigator.setAttribute("chatType", data.type);
        navigator.onclick = () => {
            if (data.type === "user") injectPage("../subpages/dashboard/chat.html");
            else injectPage("../subpages/dashboard/group.html");
            TESTBUILDCHATMESSAGES();
            localStorage.setItem("openedChat", data.chatID.toString())
            chat_selected(socket, data.chatID);
            // if()
            if (elementHasNotification(navigator)) {
                chat_read_event(socket, data.chatID);
                navigator.classList.remove("notification");
                console.log("remove notification")
            }
        }

        const icon = document.createElement("i");
        icon.classList.add("fas", data.type === "user" ? "fa-user" : "fa-users");
        navigator.appendChild(icon);

        const name = document.createElement("p");
        name.innerHTML = data.name;
        navigator.appendChild(name);

        document.getElementById("chats").appendChild(navigator);
    });
}

function TESTBUILDCHATMESSAGES() {
    let testdata = {
        name: "the magnificant 3",
        type: "group",
        username: 'self',
        chatID: 1337,
        messages: [
            {
                message: "message",
                timestamp: "12 nov 2003 17:01",
                readConfirmation: true,
                author: "Honulullu"
            },
            {
                message: "answer",
                timestamp: "13 nov 2003 17:01",
                readConfirmation: true,
                author: "self"
            },
            {
                message: "some other message",
                timestamp: "28 jun 2023 18:00",
                readConfirmation: true,
                author: "Honulullu"
            },
            {
                message: "next message",
                timestamp: "28 jun 2023 19:00",
                readConfirmation: true,
                author: "Honulullu"
            },
        ]
    }
    let testdata2 = {
        name: "Theresa König",
        type: 'user',
        username: 'self',
        chatID: 4242,
        messages: [
            {
                message: "message",
                timeStamp: "12 nov 2003 17:01",
                readConfirmation: true,
                author: "Honulullu"
            },
            {
                message: "answer",
                timeStamp: "13 nov 2003 17:01",
                readConfirmation: true,
                author: "self"
            },
            {
                message: "some other message",
                timeStamp: "28 jun 2023 18:00",
                readConfirmation: true,
                author: "Honulullu"
            },
            {
                message: "some other message",
                timeStamp: Date.now(),
                readConfirmation: true,
                author: "Honulullu"
            },
        ]
    }
    // try {
    //     buildChatMessages(testdata, true);
    // } catch (e) {
    //     setTimeout(() => buildChatMessages(testdata, true), 1000);
    // }
    setTimeout(() => buildChatMessages(testdata2), 10);

}

function buildChatMessages(chatData) {
    const chatBox = document.createElement("div");
    chatBox.id = "chat-box";
    localStorage.setItem("lastAuthor", null);
    chatData.messages.forEach(data => {
        let chatElement = buildMessageObject(data, chatData.username, chatData.type);
        chatBox.appendChild(chatElement);
    });
    document.getElementById("chat-box").replaceWith(chatBox);
    document.getElementById("chat-name").innerHTML = chatData.name;

    document.getElementById("submit-message").onclick = () =>{
        sendMessage(chatData.chatID);
    };
    document.querySelector("#chat-actions div textarea").addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage(chatData.chatID);
        }
    })
}


function buildMessageObject(messageObject, username, type){
    let lastAuthor = localStorage.getItem("lastAuthor");
    const chatElement = document.createElement("div");
    chatElement.classList.add("chat-element");
    chatElement.classList.add(messageObject.author === username ? "chat-element-right" : "chat-element-left");

    if (type === 'group' && lastAuthor !== messageObject.author) {
        if (messageObject.author !== username) {
            const senderElement = document.createElement("span");
            senderElement.classList.add("sender");
            senderElement.innerHTML = messageObject.author;
            chatElement.appendChild(senderElement);
        }
        localStorage.setItem("lastAuthor", messageObject.author);
    }

    const messageElement = document.createElement("p");
    messageElement.innerHTML = messageObject.message;
    chatElement.appendChild(messageElement);

    const timeElement = document.createElement("span");
    let messageDate = new Date(messageObject.timeStamp); // bspw: "28 Jun 2023 18:50:59"
    let timeDifference = Math.floor((Date.now() - messageDate.valueOf()) / 1000 / 60)
    if (timeDifference < 60 * 24) {
        timeElement.innerHTML = messageDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    } else {
        timeElement.innerHTML = messageDate.toLocaleDateString([], {});
    }
    timeElement.classList.add("subtitle");
    chatElement.appendChild(timeElement);
    chatElement.style.order = messageDate.valueOf().toString();

    // TODO style and insert read indicator
    const readIndicator = document.createElement("span");
    readIndicator.innerHTML = "READELEMENT";
    // chatElement.appendChild(readIndicator);

    return chatElement;
}

function injectMessage(messageObject, username, type){
    let chatObject = buildMessageObject(messageObject, username, type);
    document.getElementById("chat-box").appendChild(chatObject);
}

function sendMessage(chatID){
    let textField = document.querySelector("#chat-actions div textarea")
    let message = textField.value.trim();
    textField.value = "";
    let temp = message.replace("[\n\t ]", "");

    if(temp === "") return;

    chat_send_message(socket, chatID, message);
}

function TESTNOTIFICATIONHANDLER() {
    let testNotification = {
        chatID: "649c3b837074414f95088ce2",
        username: "self",
        message: {
            message: "Benni hat immer Recht!",
            timeStamp: "28 jun 2023 19:01",
            readConfirmation: true,
            author: "Honulullu"
        }
    }

    notificationHandler(testNotification);
}

function notificationHandler(notification) {
    function getNotifiedChatNode() {
        for (const child of document.getElementById("chats").childNodes) {
            let nodeId = child.getAttribute("data-chat-id");
            if (nodeId === notification.chatID) {
                return child;
            }
        }
    }
    let openedChatId = localStorage.getItem("openedChat");
    let chatNode = getNotifiedChatNode();
    if(openedChatId === notification.chatID){
        let chatType =  chatNode.getAttribute("chattype");
        injectMessage(notification.message, notification.username, chatType);
        chat_selected(socket, notification.chatID);
        return;
    }

    if (chatNode) {

        chatNode.classList.add("notification");
        let unreadMessageAmount = chatNode.getAttribute("data-unread-message");
        chatNode.setAttribute("data-unread-messages", unreadMessageAmount + 1);
        // console.log(chatNode);
    }

}

function elementHasNotification(element) {
    let e = element.classList
    for (const value of e.values()) {
        if (value === "notification") return true;
    }
    return false;
}

function errorEvent(message) {
    console.warn("Event", message);
    // TODO POPUP
}

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    console.log(data)
    switch (data.event) {
        case 'login':
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
                buildChatMessages(data.content)
            } catch (e) {
                setTimeout(() => buildChatMessages(data.content), 1000);
            }
            break;
        case 'messageNotification': {
            notificationHandler(data);
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

function getValues() {
    let usr = document.getElementById("usr").value;
    let pwd = document.getElementById("pwd").value;
    let pwdElement = document.getElementById("pwd2");
    let mode = pwdElement?"register":"login";

    // further client side checking
    if (usr === "" || pwd === "" || (pwdElement && pwdElement.value === "")) {
        pwdError("Please fill in the missing fields!")
        return null;
    }

    if (
        !(
            pwd.match(/[a-z]/g) &&
            pwd.match(/[A-Z]/g) &&
            pwd.match(/[0-9]/g) &&
            pwd.match(/\W/g) &&
            pwd.length >= 8
        )
    ) {
        pwdError("Password must at least 8 characters and upper- and lowercase character, " +
            "number and a special character");
        return null;
    }

    // compare passwords if register
    if (pwdElement && pwdElement.value !== pwd) {
        pwdError("Passwords doesn't match");
        return null;
    }
    pwdError("client side password ok");
    return {
        username: usr,
        password: pwd,
        mode: mode
    };
}

function pwdError(errorMessage) {
    document.getElementById("pwdError").innerHTML = errorMessage;

}

function loginRequest() {
    const result = getValues()
    if (result === null) {
        console.log("Not in format")
        return;
    }

    socket.sendEvent(result.mode, { username: result.username, password: result.password })
}

function newChat(type) {
    // console.log("newChat")
    let inform = document.querySelector("input[type=text]").value.trim();
    if (inform === "") return;
    let users = [];

    let name = inform.trim();
    if (type === "user") {
        users = [inform];
    } else {
        //TODO add users

    }
    // console.log(inform, users)
    chat_create_new_chat(socket, name, type, users);
}

function chat_selected(socket, chatId) {
    socket.sendEvent('loadChatMessages', {
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
        chatId: chatId,

        // Data injected by server!
        timestamp: undefined,
        author: undefined,
        read: undefined
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
        chatId: chatId
    })
}

function chat_overview(socket) {
    socket.sendEvent('fetchChats', "")
}