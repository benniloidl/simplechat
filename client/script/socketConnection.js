const socket = new WebSocket('ws://localhost:8080/');

socket.onopen = function () {
    // Verbindungsaufbau behandeln
    // document.getElementById("a").innerHTML = "Socked Started"

};
socket.onmessage = function(event) {
    console.log(event.data); // Neue Nachricht behandeln
    document.getElementById("b").innerHTML = event.data;
};
socket.onclose = function(event) {
    // Verbindungsabbau behandeln
    document.getElementById("c").innerHTML = "stopped";
};
//
// socket.send("Hello Server");
//
// function fire(){
//     socket.send("+");
//     console.log("like");
// }