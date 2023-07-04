/**
 * Overwrites and generate the overview header for groups
 * @param users
 */
function createViewContainer(users) {
    console.log("users", users)
    const ul = document.createElement("ul");

    for (const user of users) {
        let userObject = generateUsers(user);
        ul.appendChild(userObject);
    }

    document.querySelector(".overview-container ul").replaceWith(ul);



}

function overviewContainerAction(){
    let username = getCookie("username");
    removeUser(username);
}

/**
 * Generate one user-element for overview of groups
 * @param username
 * @returns {HTMLLIElement}
 */
function generateUsers(username) {
    const element = document.createElement("li");
    const user = document.createElement("i");
    const minus = document.createElement("i");

    user.classList.add("fas", "fa-user");
    minus.classList.add("fas", "fa-minus");

    element.appendChild(user);
    element.innerHTML = username;
    element.appendChild(minus);

    minus.addEventListener("click", () => {
        removeUser(username)
    })

    return element;
}

/**
 * Builds the side menu of chats in your Chats
 * @param chats
 */
function buildChatOverview(data) {
    const chats = data.chats;
    if (!chats) {
        return;
    }
    
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

/**
 * Load chat template and inject messages
 *
 * navigator is the chat-node of the side-menu containing important chat-information
 * @param data
 * @param navigator
 */
function loadChat(data, navigator) {
    /* Workaround: If template has to load, execution has to wait till elements are loaded.
    Otherwise, Script tries to access not existing element
     */

    const path = (data.type === "user") ? "../subpages/dashboard/chat.html" : "../subpages/dashboard/group.html";
    injectPageAsync(path, () => {
        sessionStorage.setItem("openedChat", data.chatID.toString())
        chat_fetchMessage(socket, data.chatID);

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
    if (type === "group") {
        chat_get_group_users(socket, chatData.chatID);
    } else {
        document.querySelector(".chat-contact").addEventListener("click", () => {
            let username = getCookie("username");
            removeUser(username);
        });
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
    if (messageObject.readConfirmation === true && messageObject.author === username) {
        readMessage(chatElement);
    }
    return chatElement;
}

function markChatAsRead() {
    const elements = document.querySelectorAll("#chat-box .chat-element-right")
    for (const element of elements) {
        readMessage(element);
    }
}

function readMessage(element) {
    const className = "read-confirmation";
    if (!element.classList.contains(className)) {
        element.classList.add(className);
        const eye = document.createElement("i");
        eye.classList.add("fas", "fa-eye", "read-confirmation-icon");
        element.appendChild(eye);
    }
}

function injectMessage(messageObject, username, type) {
    let chatObject = buildMessageObject(messageObject, username, type);
    document.getElementById("chat-box").appendChild(chatObject);
}

/**
 * Searches the Chat-node containing important chat-information with the chatID
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

    // Notification style
    if (chatNode) {
        chatNode.classList.remove("notification");
        let unreadMessageAmount = chatNode.getAttribute("data-unread-message");
        chatNode.setAttribute("data-unread-messages", unreadMessageAmount + 1);
        chatNode.classList.add("notification");
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

/**
 * request page to inject, if page is injected execution method will be called
 * @param url
 * @param execution
 */
function injectPageAsync(url, execution) {
    const main = document.querySelector('main');
    if (main !== undefined) main.setAttribute('data-menu-open', 'false');

    const chatDiv = document.getElementById("chat");
    const xhr = new XMLHttpRequest();

    xhr.open("GET", "dashboard/" + url, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            chatDiv.innerHTML = xhr.responseText;

            execution();

            document.querySelectorAll(".username").forEach(function (element) {
                element.innerHTML = getCookie("username");
            });
        }
    };
    xhr.send();
}

/**
 * Query username in group information and make request to add user
 * return false to disable form
 * @returns {false}
 */
function addUserToGroup() {
    const field = document.getElementById("add-member");
    if (!field) return false;
    let chatID = sessionStorage.getItem("openedChat");
    if (getChatNodeById(chatID).getAttribute("chatType") !== "group") return false;

    let username = field.value.trim();
    console.log(username)
    if (!checkUsernameSemantic(username)) {
        showError("Username must only contain upper- and lowercase " +
            "letters, digits and the special characters \\+\\-\\_\\.");
        console.error("username doesn't match", username)
        return false;
    } else {
        showError("");
        field.value = "";
    }

    chat_addUser(username);
    return false;
}

/**
 * Adjusts injectPageAsync by overwriting action of form with javaScript function
 * must return false or use event.preventDefault
 * onsubmit = () => formEventFunction(parameter)
 * + delete irrelevant data of sessionStorage
 * @param path
 * @param formEventFunction
 * @param parameter
 */
function injectFileWithForm(path, formEventFunction, parameter) {
    sessionStorage.clear();
    injectPageAsync(path, () => {
        let form = document.forms[0];
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            formEventFunction(parameter)
        });
    });
}

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

    // wrapper.innerHTML = "some Text ";
    element.classList.add("missingConnection");

    element.appendChild(wrapper);
    document.body.appendChild(element);

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