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


// function getChatOverview(overviewDiv) {
//     overviewDiv.classList.add("chat-overview-wrapper");
//     overviewDiv.setAttribute("data-overview-open", "false");
//     let url = "../subpages/dashboard/chat-overview.html";
//     const xhr = new XMLHttpRequest();
//
//     xhr.open("GET", "dashboard/" + url, true);
//     xhr.onreadystatechange = function () {
//         if (xhr.readyState === 4 && xhr.status === 200) {
//             overviewDiv.innerHTML = xhr.responseText;
//         }
//     };
//     xhr.send();
// }


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


function errorEvent(message) {
    console.warn("Event", message);
    // TODO POPUP
}

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
        }
        
        case 'error': {
            errorEvent(data);
            break;
        }
    }
};

socket.onclose = function (event) {
};

function sendMessage(chatID) {
    let textField = document.querySelector("#chat-actions div textarea")
    let message = textField.value.trim();
    textField.value = "";
    let temp = message.replace("[\n\t ]", "");

    if (temp === "") return;

    chat_send_message(socket, chatID, message);
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
        //
        // // Data injected by server!
        // timeStamp: undefined,
        // author: undefined,
        // read: undefined
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
    console.log("groupid", groupId);
    socket.sendEvent('fetchGroupUsers', {
        chatID: groupId
    });
}