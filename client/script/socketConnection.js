const socket = new WebSocket(location.origin.replace(/^http/, 'ws'));

socket.onopen = function () {
    // Verbindungsaufbau behandeln
    // document.getElementById("a").innerHTML = "Socked Started"

};

socket.onmessage = function(event) {
    console.log(event.data); // Neue Nachricht behandeln
    // document.getElementById("b").innerHTML = event.data;
};
socket.onclose = function(event) {
    // Verbindungsabbau behandeln
    document.getElementById("c").innerHTML = "stopped";
};
//
// socket.send("Hello Server");
//
function sendEvent(eventName, eventData){
    const message = {
        event: eventName,
        data: eventData,
    };
    socket.send(JSON.stringify(message));
}
function getValues(){
    let usr = document.getElementById("usr").value;
    let pwd = document.getElementById("pwd").value;
    let pwdElement = document.getElementById("pwd-check");

    // further client side checking
    if (usr === "" || pwd === ""|| (pwdElement && pwdElement.value === "")){
        pwdError("Please fill in the missing fields!")
        return null;
    }

    if(
        !(
            pwd.match(/[a-z]/g) &&
            pwd.match(/[A-Z]/g) &&
            pwd.match(/[0-9]/g) &&
            pwd.match(/\W/g) &&
            pwd.length >= 8
        )
    ){
        pwdError("Password must at least 8 characters and upper- and lowercase character, " +
            "number and a special character");
        return null;
    }
    if (pwdElement && pwdElement.value !== pwd){
        pwdError("Passwords doesn't match");
        return null;
    }

    return{
        username: usr,
        password: pwd
    };
}
function pwdError(errorMessage){
    document.getElementById("pwdError").innerHTML = errorMessage;

}

function fire(){
    const result = getValues()
    if (result === null){
        console.log("Not in format")
        return;
    }
    sendEvent('login', {username: 'wert1', password: 'wert2'})
    console.log("sended LoginData");
}