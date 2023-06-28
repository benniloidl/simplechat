const socket = new WebSocket(location.origin.replace(/^http/, 'ws'));
socket.sendEvent = (eventName, eventData) => {
    const message = {
        event: eventName,
        data: eventData,
    };
    socket.send(JSON.stringify(message));
}

//const chatFunctions = require('./chatConnection')
//const {chat_clicked} = require("./chatConnection");

//chatFunctions.chat_clicked(socket);
const fileName = location.href.split("/").slice(-1)

socket.onopen = function () {
    if(fileName == "dashboard"){
        socket.sendEvent("fetchChats","");
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
    navigator.onclick = () => {
        chat_clicked(data.chatId);
        if (data.type === "user") injectPage("../subpages/dashboard/chat.html");
        else injectPage("../subpages/dashboard/group.html");
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