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
    if (fileName == "dashboard") {
        socket.sendEvent("fetchChats", "");
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
        navigator.classList.add("chat-contact");
        navigator.setAttribute("chatID", data.chatID);
        navigator.onclick = () => {
            if (data.type === "user") injectPage("../subpages/dashboard/chat.html");
            else injectPage("../subpages/dashboard/group.html");
            TESTBUILDCHATMESSAGES();
            // chat_selected(data.chatID);
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
                message: "some other message",
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
                message: "some other message",
                timestamp: "28 jun 2023 19:00",
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
    setTimeout(() => buildChatMessages(testdata), 10);

}

function buildChatMessages(chatData) {
    const chatBox = document.createElement("div");
    chatBox.id = "chat-box";
    let lastAuthor;
    chatData.messages.forEach(data => {
        const chatElement = document.createElement("div");
        chatElement.classList.add("chat-element");
        chatElement.classList.add(data.author === chatData.username ? "chat-element-right" : "chat-element-left");

        if (chatData.type === 'group' && lastAuthor !== data.author) {
            if (data.author !== chatData.username) {
                const senderElement = document.createElement("span");
                senderElement.classList.add("sender");
                senderElement.innerHTML = data.author;
                chatElement.appendChild(senderElement);
            }
            lastAuthor = data.author;
        }


        const messageElement = document.createElement("p");
        messageElement.innerHTML = data.message;
        chatElement.appendChild(messageElement);

        const timeElement = document.createElement("span");
        let messageDate = new Date(data.timestamp); // bspw: "28 Jun 2023 18:50:59"
        let timeDifference = Math.floor((Date.now() - messageDate.valueOf()) / 1000 / 60)
        if (timeDifference < 15) {
            timeElement.innerHTML = timeDifference.toString() + "min ago";
        } else if (timeDifference < 60 * 24) {
            timeElement.innerHTML = `${messageDate.getHours()}:${messageDate.getMinutes()}`
            timeElement.innerHTML = messageDate.toLocaleTimeString("en-UK", {hour: '2-digit', minute: '2-digit'});
        } else {
            timeElement.innerHTML = messageDate.toLocaleString();
        }
        timeElement.classList.add("subtitle");
        chatElement.appendChild(timeElement);

        // TODO style and insert read indicator
        const readIndicator = document.createElement("span");
        readIndicator.innerHTML = "READELEMENT";
        // chatElement.appendChild(readIndicator);

        chatBox.appendChild(chatElement);
    });
    let a = document.getElementById("chat-box");
    document.getElementById("chat-box").replaceWith(chatBox);
    document.getElementById("chat-name").innerHTML = chatData.name;

    document.getElementById("submit-message").onclick = () => {
        let message = document.querySelector("#chat-actions div textarea").value.trim();
        chat_send_message(socket, chatData.chatID, message);
    }
}

function TESTNOTIFICATIONHANDLER() {
    let testNotification = {
        chatID: "649c3b837074414f95088ce2",
        unreadMessages: 4,
        message: {
            message: "Benni hat immer Recht!",
            timestamp: "28 jun 2023 19:00",
            readConfirmation: true,
            author: "Honulullu"
        }
    }

    notificationHandler(testNotification);
}

function notificationHandler(notification) {
    function get() {
        let childs = document.getElementById("chats").childNodes;
        for (const child of childs) {
            let nodeId = child.attributes.chatId.nodeValue;
            if (nodeId == notification.chatID) {
                return child;
            }
            console.log(nodeId);
        }
    }

    let node = get();
    if (node) {
        node.classList.add("notification");
        node.setAttribute("unreadMessages", notification.unreadMessages);
        console.log(node)
    }

}

function elementHasNotification(element) {
    let e = element.classList
    for (const value of e.values()) {
        if (value == "notification") return true;
    }
    return false;
}

function errorEvent(message) {
    console.error("Event", message);
    // TODO POPUP
}

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
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
        case 'chatMessages':
            try {
                buildChatMessages(data.content)
            } catch (e) {
                setTimeout(() => buildChatMessages(data.content), 1000);
            }
            break;
        case 'messageNotification': {

        }

        case 'error': {
            errorEvent(data);
        }
    }
};

socket.onclose = function (event) {
};

function getValues() {
    let usr = document.getElementById("usr").value;
    let pwd = document.getElementById("pwd").value;
    let pwdElement = document.getElementById("pwd-check");

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
    if (pwdElement && pwdElement.value !== pwd) {
        pwdError("Passwords doesn't match");
        return null;
    }
    pwdError("OK");
    return {
        username: usr,
        password: pwd
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

    socket.sendEvent('login', {username: result.username, password: result.password})
}

function chat_selected(socket, chatId) {
    socket.sendEvent('loadChatMessages', {
        chatID: chatId,
        start: 0,
        amount: chatMessageAmount
    });
}

function chat_scrolled(socket, chatId) {
    let times = 2;
    socket.sendEvent('loadChatMessages', {
        chatID: chatId,
        start: (chatMessageAmount * times),
        amount: (chatMessageAmount * (times + 1))
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

function newChat(type) {
    console.log("newChat")
    let inform = document.querySelector("input[type=text]").value.trim();
    if (inform === "") return;
    let users = [];

    let name = inform.trim();
    if (type === "chat") {
        users = [inform];
    } else {
        //TODO add users

    }
    console.log(inform, users)
    chat_create_new_chat(socket, name, type, users);
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
    socket.sendEvent('fetchChats', {})
}