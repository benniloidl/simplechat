/**
 * Overwrites and generate the overview header for groups
 * @param users
 */
function createViewContainer(users){
    console.log("users", users)
    const ul = document.createElement("ul");

    for (const user of users) {
        let userObject = generateUsers(user.username);
        ul.appendChild(userObject);
    }

    document.querySelector(".overview-container ul").replaceWith(ul);

}

/**
 * Generate one user-element for overview of groups
 * @param username
 * @returns {HTMLLIElement}
 */
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

/**
 * Builds the side menu of chats in your Chats
 * @param chats
 */
function buildChatOverview(chats) {
    chats.forEach(data => {
        const navigator = document.createElement("div");
        let unreadMessages = data.unreadMessages ? data.unreadMessages : 0;
        navigator.setAttribute("data-unread-messages", unreadMessages);
        navigator.classList.add("chat-contact");
        navigator.setAttribute("data-chat-id", data.chatID);
        navigator.setAttribute("chatType", data.type);

        // notification
        if (unreadMessages > 0) {
            navigator.classList.add("notification");
        }

        // events
        navigator.onclick = () => {
            loadChat(data, navigator);
        }

        // icon
        const icon = document.createElement("i");
        icon.classList.add("fas", data.type === "user" ? "fa-user" : "fa-users");
        navigator.appendChild(icon);

        // chat name
        const name = document.createElement("p");
        name.innerHTML = data.name;
        navigator.appendChild(name);

        document.getElementById("chats").appendChild(navigator);
    });
}

function loadChat(data, navigator){
    /* Workaround: If template has to load, execution has to wait till elements are loaded.
    Otherwise, Script tries to access not existing element
     */

    const path = (data.type === "user")? "../subpages/dashboard/chat.html":"../subpages/dashboard/group.html";
    injectPageAsync(path, () => {
        sessionStorage.setItem("openedChat", data.chatID.toString())
        chat_selected(socket, data.chatID);

        if (elementHasNotification(navigator)) {
            chat_read_event(socket, data.chatID);
            navigator.classList.remove("notification");
            // console.log("remove notification")
        }
    });
}

/**
 * Fill the chat window with messages
 * @param chatData
 */
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
    let type = chatNode.getAttribute("chatType");
    let name = chatNode.lastChild.textContent;
    const chatBox = document.createElement("div");
    chatBox.id = "chat-box";
    sessionStorage.setItem("lastAuthor", null);

    // build chat messages
    chatData.messages.forEach(data => {
        let chatElement = buildMessageObject(data, chatData.username, type);
        chatBox.appendChild(chatElement);
    });

    // Arrange Items in Container
    if(type==="group"){
        chat_get_group_users(socket, chatData.chatID);
    }
    document.getElementById("chat-box").replaceWith(chatBox);
    document.getElementById("chat-name").innerHTML = name;

    // EventListener
    document.getElementById("submit-message").onclick = () => {
        sendMessage(chatData.chatID);
    };
    document.querySelector("#chat-actions div textarea").addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage(chatData.chatID);
        }
    });
}

/**
 * Build and get the Message as HTML-object
 * @param messageObject
 * @param username
 * @param type
 * @returns {HTMLDivElement}
 */
function buildMessageObject(messageObject, username, type) {
    let lastAuthor = sessionStorage.getItem("lastAuthor");
    const chatElement = document.createElement("div");
    chatElement.classList.add("chat-element");
    chatElement.classList.add(messageObject.author === username ? "chat-element-right" : "chat-element-left");

    // Sender information (only relevant in groups)
    if (type === 'group' && lastAuthor !== messageObject.author) {
        if (messageObject.author !== username) {
            const senderElement = document.createElement("span");
            senderElement.classList.add("sender");
            senderElement.innerHTML = messageObject.author;
            chatElement.appendChild(senderElement);
        }
        sessionStorage.setItem("lastAuthor", messageObject.author);
    }

    // message
    const messageElement = document.createElement("p");
    messageElement.innerHTML = messageObject.message;
    chatElement.appendChild(messageElement);

    // timestamp
    const timeElement = document.createElement("span");
    let messageDate = new Date(messageObject.timeStamp); // eg: "28 Jun 2023 18:50:59"
    let timeDifference = Math.floor((Date.now() - messageDate.valueOf()) / 1000 / 60)
    if (timeDifference < 60 * 24) {
        timeElement.innerHTML = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        timeElement.innerHTML = messageDate.toLocaleDateString([], {});
    }
    timeElement.classList.add("subtitle");
    chatElement.appendChild(timeElement);

    /** time calculation to get order
        issue: order has max value of 2147483647
        calculations to fit datetime into this size:
    */
    // resolution 1 second, 20 Years, reference 29 june 2023
    // let modifiedTime = Math.round((messageDate.valueOf()/1000) -  1000000000 -  688000000);
    // resolution 0.1 second 4 Years selected
    let modifiedTime1 = Math.round((messageDate.valueOf() / 100) - 10000000000 - 6880000000);
    chatElement.style.order = modifiedTime1.toString();
    // console.log(messageDate.valueOf(),modifiedTime, modifiedTime1 , chatElement.style.order);

    // read confirmation
    // TODO reading confirmation style should be done by @Benni
    if(messageObject.readConfirmation === true){
        chatElement.classList.add("read-confirmation");
    }
    return chatElement;
}

function injectMessage(messageObject, username, type) {
    let chatObject = buildMessageObject(messageObject, username, type);
    document.getElementById("chat-box").appendChild(chatObject);
}

/**
 *
 * @param chatId
 * @returns {Element | undefined}
 */
function getChatNodeById(chatId) {
    for (const child of document.getElementById("chats").children) {
        let nodeId = child.getAttribute("data-chat-id");
        if (nodeId === chatId) {
            return child;
        }
    }
}

/**
 * Handles notification event for new messages
 * @param notification
 */
function notificationHandler(notification) {
    let openedChatId = sessionStorage.getItem("openedChat");
    let chatNode = getChatNodeById(notification.chatID);
    if (openedChatId === notification.chatID) {
        // chat is shown
        let chatType = chatNode.getAttribute("chatType");
        injectMessage(notification.message, notification.username, chatType);
        chat_read_event(socket, notification.chatID);
        return;
    }
    // chat is not selected: reload chat overview sidebar
    chat_fetch_overview(socket);

    // Notification style
    if (chatNode) {
        chatNode.classList.add("notification");
        let unreadMessageAmount = chatNode.getAttribute("data-unread-message");
        chatNode.setAttribute("data-unread-messages", unreadMessageAmount + 1);
        // console.log(chatNode);
    }

}

/**
 * Checks if element is in notification state
 * @param element
 * @returns {boolean}
 */
function elementHasNotification(element) {
    let e = element.classList
    for (const value of e.values()) {
        if (value === "notification") return true;
    }
    return false;
}

function injectPageAsync(url, execution) {
    const main = document.querySelector('main');
    if (main !== undefined) main.setAttribute('data-menu-open', 'false');

    const chatDiv = document.getElementById("chat");
    const xhr = new XMLHttpRequest();

    xhr.open("GET", "dashboard/" + url, true);
    xhr.onreadystatechange =  () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            chatDiv.innerHTML = xhr.responseText;

            execution()

            document.querySelectorAll(".username").forEach(function (element) {
                element.innerHTML = getCookie("username");
            });
        }
    };
    xhr.send();
}