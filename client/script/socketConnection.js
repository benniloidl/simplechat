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
            //TESTBUILDCHATMESSAGES();
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
        // name: "Theresa König",
        // type: 'user',
        username: 'self',
        chatID: "649e8f8dbbc6ef0e740648d6",
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
                timeStamp: "29 jun 2023 18:00",
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
    if (!chatData.messages) {
        console.log("empty message")
        return;
    }
    ;
    const chatNode = getChatNodeById(chatData.chatID);
    if (!chatNode) return;
    let type = chatNode.getAttribute("chattype");
    let name = chatNode.lastChild.innerHTML;
    // console.log(chatNode.lastChild.innerHTML)
    
    const chatBox = document.createElement("div");
    const overviewDiv = document.createElement("div");
    getChatOverview(overviewDiv);
    chatBox.id = "chat-box";
    localStorage.setItem("lastAuthor", null);
    chatData.messages.forEach(data => {
        let chatElement = buildMessageObject(data, chatData.username, type);
        chatBox.appendChild(chatElement);
    });
    document.getElementById("chat-box").replaceWith(chatBox);
    document.getElementById("chat-overview").replaceWith(overviewDiv);
    document.getElementById("chat-name").innerHTML = name;
    
    document.getElementById("submit-message").onclick = () => {
        sendMessage(chatData.chatID);
    };
    document.querySelector("#chat-actions div textarea").addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage(chatData.chatID);
        }
    })
}

function getChatOverview(overviewDiv) {
    overviewDiv.classList.add("chat-overview-wrapper");
    overviewDiv.setAttribute("data-overview-open", "false");
    let url = "../subpages/dashboard/chat-overview.html";
    const xhr = new XMLHttpRequest();
    
    xhr.open("GET", "dashboard/" + url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            overviewDiv.innerHTML = xhr.responseText;
        }
    };
    xhr.send();
}

function buildMessageObject(messageObject, username, type) {
    console.log("build", messageObject)
    let lastAuthor = localStorage.getItem("lastAuthor");
    const chatElement = document.createElement("div");
    chatElement.classList.add("chat-element");
    console.log(messageObject.author , username, messageObject.author === username)
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
        timeElement.innerHTML = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        timeElement.innerHTML = messageDate.toLocaleDateString([], {});
    }
    timeElement.classList.add("subtitle");
    chatElement.appendChild(timeElement);
    //2147483647 maximum value for order
    // resolution 1 second, 20 Years, reference 29 june 2023
    // let modifiedTime = Math.round((messageDate.valueOf()/1000) -  1000000000 -  688000000); // Try to convert long of Date to integer
    // resolution 0.1 second 4 Years selected
    let modifiedTime1 = Math.round((messageDate.valueOf() / 100) - 10000000000 - 6880000000); // Try to convert long of Date to integer
    chatElement.style.order = modifiedTime1.toString();
    // console.log(messageDate.valueOf(),modifiedTime, modifiedTime1 , chatElement.style.order);
    
    // TODO style and insert read indicator
    const readIndicator = document.createElement("span");
    readIndicator.innerHTML = "READELEMENT";
    // chatElement.appendChild(readIndicator);
    
    return chatElement;
}

function injectMessage(messageObject, username, type) {
    let chatObject = buildMessageObject(messageObject, username, type);
    document.getElementById("chat-box").appendChild(chatObject);
}

function sendMessage(chatID) {
    let textField = document.querySelector("#chat-actions div textarea")
    let message = textField.value.trim();
    textField.value = "";
    let temp = message.replace("[\n\t ]", "");
    
    if (temp === "") return;
    
    chat_send_message(socket, chatID, message);
}

function TESTNOTIFICATIONHANDLER() {
    let testNotification = {
        chatID: "649dba9727ab3fc60655df5f",
        username: "self",
        message: {
            message: "Benni hat immer Recht!",
            timeStamp: "29 jun 2023 19:01",
            readConfirmation: true,
            author: "Honulullu"
        }
    }
    
    notificationHandler(testNotification);
}

function getChatNodeById(chatId) {
    for (const child of document.getElementById("chats").childNodes) {
        let nodeId = child.getAttribute("data-chat-id");
        if (nodeId === chatId) {
            return child;
        }
    }
}

function notificationHandler(notification) {
    let openedChatId = localStorage.getItem("openedChat");
    let chatNode = getChatNodeById(notification.chatID);
    if (openedChatId === notification.chatID) {
        let chatType = chatNode.getAttribute("chattype");
        injectMessage(notification.message, notification.username, chatType);
        chat_read_event(socket, notification.chatID);
        return;
    } else{
        chat_overview(socket);
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
                setTimeout(() => buildChatMessages(data.data), 1000);
            }
            break;
        case 'messageNotification': {
            notificationHandler(data.notification);
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
    let mode = pwdElement ? "register" : "login";
    
    // further client side checking
    if (usr === "" || pwd === "" || (pwdElement && pwdElement.value === "")) {
        pwdError("Please fill in the missing fields!")
        return null;
    }
    
    if (!usr.match(/^[a-zA-Z0-9._\-+]*$/g)) {
        pwdError("Username must only contain upper- and lowercase letters, digits and the special characters \+\-\_\.");
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
        pwdError("Password must have at least 8 characters, containing an upper- and lowercase letter, " +
            "digit and a special character");
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

function leaveChat() {
    console.error("NOT IMPLEMENTED")
    // let chatID = localStorage.getItem("openedChat");
    // chat_leave(socket, chatID);
    
}

function chat_leave(socket, chatId) {
    socket.sendEvent('leaveChat', {
        chatID: chatId
    });
    chat_overview(socket);
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
        chatID: chatId
    })
}

function chat_overview(socket) {
    socket.sendEvent('fetchChats', "")
}

function chat_get_group_users(socket, groupId){
    socket.sendEvent('fetchGroupUsers', {
        chatID: groupId
    });
}