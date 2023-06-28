const chatMessageAmount = 10;

function chat_clicked(socket, chatId) {
    socket.sendEvent('fetch-chat-message', {
        chatID: chatId,
        start: 0,
        amount: chatMessageAmount
    });
}

function chat_scrolled(socket, chatId) {
    let times = 2;
    socket.sendEvent('fetch-chat-message', {
        chatID: chatId,
        start: (chatMessageAmount * times),
        amount: (chatMessageAmount * (times + 1))
    });
}

module.exports = {
    chat_clicked,
    chat_scrolled
}