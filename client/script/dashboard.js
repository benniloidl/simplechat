function createViewContainer(users){
    console.log("users", users)
    // const container = document.createElement("div");
    // container.classList.add("overview-container");
    const ul = document.createElement("ul");

    for (const user of users) {
        let userObject = generateUsers(user.username);
        ul.appendChild(userObject);
    }

    // container.appendChild(ul);
    // container.appendChild(document.createElement("hr"));
    document.querySelector(".overview-container ul").replaceWith(ul);

}

function generateUsers(username){
    const element = document.createElement("li");
    const user = document.createElement("i");
    const minus = document.createElement("i");

    user.classList.add("fas", "fa-user");
    minus.classList.add("fas", "fa-minus");

    element.appendChild(user);
    element.innerHTML = username;
    element.appendChild(minus);

    return element;

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
            loadChat(data, navigator);
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

function loadChat(data, navigator){
    let box = document.getElementById("chat-box");
    if (box === null) {
        if (data.type === "user") injectPage("../subpages/dashboard/chat.html");
        else injectPage("../subpages/dashboard/group.html");
    }

    localStorage.setItem("openedChat", data.chatID.toString())
    chat_selected(socket, data.chatID);
    // if()
    if (elementHasNotification(navigator)) {
        chat_read_event(socket, data.chatID);
        navigator.classList.remove("notification");
        console.log("remove notification")
    }
}
function buildChatMessages(chatData) {
    if (!chatData.messages) {
        console.log("empty message")
        return;
    }
    const chatNode = getChatNodeById(chatData.chatID);
    if (!chatNode) {
        console.log("no Node", chatNode)
        return;
    }

    let type = chatNode.getAttribute("chattype");
    let name = chatNode.lastChild.textContent;
    if(type==="group"){
        chat_get_group_users(socket, chatData.chatID);
    }

    const chatBox = document.createElement("div");
    //const overviewDiv = document.createElement("div");
    //getChatOverview(overviewDiv);
    chatBox.id = "chat-box";
    localStorage.setItem("lastAuthor", null);
    chatData.messages.forEach(data => {
        let chatElement = buildMessageObject(data, chatData.username, type);
        chatBox.appendChild(chatElement);
    });
    document.getElementById("chat-box").replaceWith(chatBox);
    // document.getElementById("chat-overview").replaceWith(overviewDiv);
    document.getElementById("chat-name").innerHTML = name;

    document.getElementById("submit-message").onclick = () => {
        sendMessage(chatData.chatID);
    };
    document.querySelector("#chat-actions div textarea").addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage(chatData.chatID);
        }
    });
    console.log("build Message")
}
function buildMessageObject(messageObject, username, type) {
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

    // TODO reading confirmation should be done by @Benni
    if(messageObject.readConfirmation === true){
        chatElement.classList.add("read-confirmation");
    }

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