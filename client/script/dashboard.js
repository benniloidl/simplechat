let lastTimeElement;
let lastMessageElement;

/**
 * Overwrites and generate the overview header for groups
 * @param users
 */
function createViewContainer(users) {
    const ul = document.createElement("ul");

    for (const user of users) {
        let userObject = generateUsers(user);
        ul.appendChild(userObject);
    }

    document.querySelector(".overview-container ul").replaceWith(ul);
}

/**
 * Action to remove User from chat, triggered by button to leave chat
 */
function overviewContainerAction() {
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
    element.appendChild(document.createTextNode(username));
    element.appendChild(minus);

    minus.addEventListener("click", () => {
        removeUser(username)
    })

    return element;
}

/**
 * Builds the side menu of chats in your Chats
 * @param data
 */
function buildChatOverview(data) {
    const chats = data.chats;
    if (!chats) {
        return;
    }

    const openedChatId = sessionStorage.getItem("openedChat");
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
            loadChat2(data.type, data.chatID);
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
        if (openedChatId === data.chatID) {
            loadChat2(data.type, data.chatID);
        }
    });

}

/**
 * Load chat template and inject messages
 *
 * navigator is the chat-node of the side-menu containing important chat-information
 * @param type
 * @param chatID
 */
function loadChat2(type, chatID) {
    const navigator = getChatNodeById(chatID);
    if (!navigator) return;
    const path = (type === "user") ? "../subpages/dashboard/chat.html" : "../subpages/dashboard/group.html";
    injectPageAsync(path, () => {
        sessionStorage.setItem("openedChat", chatID.toString());
        sessionStorage.setItem("loadedMessages", "0");
        chat_fetchMessage(socket, chatID);

        if (elementHasNotification(navigator)) {
            chat_read_event(socket, chatID);
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

    const loadedMessages = sessionStorage.getItem("loadedMessages");
    if (loadedMessages && loadedMessages > 0) {
        const chatBox = document.getElementById("chat-box")
        chatData.messages.forEach(data => {
            let chatElement = buildMessageObject(data, chatData.username, data.type);
            chatBox.appendChild(chatElement);
        });
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
    sessionStorage.setItem("loadedMessages", null);
    document.getElementById("total-messages").textContent = chatData.total.toString();
    lastTimeElement = null;
    lastMessageElement = null;
    chatData.messages.sort((a, b) => (a.timeStamp - b.timeStamp));
    // build chat messages
    chatData.messages.forEach(data => {
        let chatElement = buildMessageObject(data, chatData.username, type);
        chatBox.appendChild(chatElement);
    });

    // Arrange Items in Container
    if (type === "group") {
        chat_get_group_users(socket, chatData.chatID);
    } else {
        // document.querySelector(".chat-contact").addEventListener("click", () => {
        //     let username = getCookie("username");
        //     // removeUser(username);
        // });
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

    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
    document.querySelector("#chat-actions div textarea").focus();
}

/**
 * Build and get the Message as HTML-object
 * @param {Object<{author:String, type:String, message:String}>}messageObject
 * @param username
 * @param chatType
 * @returns {HTMLDivElement}
 */
function buildMessageObject(messageObject, username, chatType) {
    let lastAuthor = sessionStorage.getItem("lastAuthor");
    const chatElement = document.createElement("div");
    chatElement.classList.add("chat-element");
    chatElement.classList.add(messageObject.author === username ? "chat-element-right" : "chat-element-left");

    // Sender information (only relevant in groups)
    if (chatType === 'group' && lastAuthor !== messageObject.author) {
        if (messageObject.author !== username) {
            const senderElement = document.createElement("span");
            senderElement.classList.add("sender");
            senderElement.innerHTML = messageObject.author;
            chatElement.appendChild(senderElement);
        }
        sessionStorage.setItem("lastAuthor", messageObject.author);
    }

    // message

    const type = (messageObject.type === undefined) ? "text" : messageObject.type;
    const messageElement = document.createElement("p");
    switch (type) {
        case "text": {
            //const messageElement = document.createElement("p");
            messageElement.textContent = messageObject.message;
            chatElement.appendChild(messageElement);
            break;

        }
        case "image/png":
        case "image/gif":
        case "image/jpeg": {
            const img = document.createElement("img");
            img.classList.add("message-type-image");
            img.src = messageObject.message;
            messageElement.appendChild(img);
            chatElement.appendChild(messageElement);
            break;

        }
        case "info": {
            const infoElement = document.createElement("p");
            infoElement.classList.add("message-type-info");
            infoElement.textContent = messageObject.message;
            chatElement.appendChild(infoElement);
            chatElement.classList.add("message-type-info-container");
            chatElement.classList.remove("chat-element-right");
            chatElement.classList.remove("chat-element-left");
            break;
        }

        case "application/pdf":
        default: {
            console.error(`Message type "${messageObject.type}" is currently not supported`);
            try {

                let anchor = document.createElement('a');
                const text = `SimpleChat-${username}-${Date.now()}`
                anchor.setAttribute('title', text);
                anchor.setAttribute('href', messageObject.message);
                anchor.setAttribute('download', text);
                anchor.textContent = "download"
                messageElement.appendChild(anchor);
                chatElement.appendChild(messageElement);
            } catch (e) {
                console.error(e);
            }
        }
    }
    // timestamp
    const timeElement = document.createElement("span");
    let messageDate = new Date(messageObject.timeStamp); // eg: "28 Jun 2023 18:50:59"
    let timeDifference = Math.floor((Date.now() - messageDate.valueOf()) / 1000 / 60)
    if (timeDifference < 60 * 24) {
        timeElement.textContent = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        timeElement.textContent = messageDate.toLocaleDateString([], {});
    }
    timeElement.classList.add("subtitle");
    chatElement.appendChild(timeElement);
    if (lastTimeElement && lastTimeElement.textContent === timeElement.textContent) {
        lastTimeElement.remove();
        if (lastMessageElement) {
            lastMessageElement.style.marginBottom = "0";
        }
    }
    if (lastAuthor === messageObject.author) {
        lastTimeElement = timeElement;
        lastMessageElement = chatElement
    } else {
        lastTimeElement = null;
        lastMessageElement = null;
    }

    /** time calculation to get order
     issue: order has max value of 2147483647
     calculations to fit datetime into this size:
     */
    // resolution 1 second, 20 Years, reference 29 june 2023
    // let modifiedTime = Math.round((messageDate.valueOf()/1000) -  1000000000 -  688000000);
    // resolution 0.1 second 4 Years selected
    let modifiedTime1 = Math.round((messageDate.valueOf() / 100) - 10000000000 - 6880000000);
    chatElement.style.order = modifiedTime1.toString();

    // read confirmation
    if (messageObject.readConfirmation === true && messageObject.author === username && chatType === "chat") {
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

/**
 * Mark chat as read
 * Takes element of the sidebar, containing the chat
 * @param element
 */
function readMessage(element) {
    const className = "read-confirmation";
    if (!element.classList.contains(className)) {
        element.classList.add(className);
        const eye = document.createElement("i");
        eye.classList.add("fas", "fa-eye", "read-confirmation-icon");
        element.appendChild(eye);
    }
}

/**
 * Injects one message object
 * @param {Object<{author:String, type:String, message:String, readConfirmation:boolean, timeStamp:String|Number}>}messageObject
 * @param username
 * @param type
 */
function injectMessage(messageObject, username, type) {
    let chatObject = buildMessageObject(messageObject, username, type);
    const chatBox = document.getElementById("chat-box");
    chatBox.appendChild(chatObject);
    chatBox.scrollTop = chatBox.scrollHeight;
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
    const messageCount = parseInt(document.getElementById("total-messages").textContent);
    document.getElementById("total-messages").textContent = (messageCount + 1).toString();
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


/**
 * Set size of Textarea in messages and scrolls the chat to last message
 */
function focusTextArea() {
    document.getElementById('chat-box').style.marginBottom = 'calc(8 * var(--spacing))';

    const interval = setInterval(() => {
        document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
    }, 10);

    setTimeout(function () {
        clearInterval(interval);
    }, 250);
}

/**
 * Collect data to change a groupname and send it to server
 * @returns {false}
 */
function changeGroupName() {
    const newGroupName = document.getElementById("new-group-name").value;
    if (newGroupName === "") return false;
    const groupId = sessionStorage.getItem("openedChat");
    chat_change_group_name(groupId, newGroupName);
    document.getElementById("new-group-name").value = "";
    return false;
}

/**
 * Collects data from Form to change password of profile.html
 * Checks semantic, if it fails it will give feedback to user
 * Otherwise sends data to server
 * @returns {false}
 */
function changePassword() {
    // console.error("Not IMPLEMENTED");
    const username = getCookie("username");
    const oldPassword = document.getElementById("old-password").value;
    const newPassword = document.getElementById("new-password").value;
    const newPasswordRepeat = document.getElementById("new-password-repeat").value;

    if (newPassword !== newPasswordRepeat) {
        feedbackChangePassword("New Passwords doesn't match, please try again!", false);
        return false;
    }
    if (!(checkPasswordSemantic(oldPassword) && newPassword && newPasswordRepeat)) {
        feedbackChangePassword("Password violates against our requirements!", false);
        return false;
    }

    chat_changePassword(username, oldPassword, newPassword)

    return false;
}

/**
 * Feedback method for form to change password.
 * @param {string} message
 * @param {boolean} success
 */
function feedbackChangePassword(message, success) {
    const element = document.getElementById("change-password-feedback");
    if (!element) return;
    element.textContent = message;
    element.style.color = (success) ? "green" : "red";

}

/**
 * Send Feedback to user, if value of password element violates out requirements
 */
function checkChangePassword(element) {
    const password = document.getElementById(element).value;
    const res = checkPasswordSemantic(password);
    if (res) {
        feedbackChangePassword("", false);
    } else {
        feedbackChangePassword("This Password does not match to our requirements!", false);
    }

}

/**
 *
 * @param data
 * @return {void}
 */
function changeGroupNameEventHandler(data) {
    const element = document.getElementById("chat-name");
    if (!element) return;
    element.textContent = data.newGroupName;
    const node = getChatNodeById(data.chatID);
    if (!node) return;
    node.querySelector("p").textContent = data.newGroupName;
}