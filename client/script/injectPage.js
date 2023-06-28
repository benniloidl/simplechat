function injectPage(url, destinationID) {
    const chatDiv = document.getElementById(destinationID);
    const xhr = new XMLHttpRequest();

    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            chatDiv.innerHTML = xhr.responseText;
        }
    };
    xhr.send();
}