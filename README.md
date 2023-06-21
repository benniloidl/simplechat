# SimpleChat
This is a simple student project featuring basic chat functionality. It is meant to be as lightweight as possible, therefore it only relies on plain **HTML**, **CSS**, **JavaScript** and **NodeJS**.

# API Data Structure
The connection between server and client go through a **WebSocket** listening on port 80. SimpleChat only makes use of the **message** event.
In the message, the data is structured as follows *(JSON)*:
+ **type:** *Type of message* (e.g. 'login', 'fetchChats', 'fetchChat', 'sendMessage', ..)
+ **data:** *Data to be transferred* (e.g. { username, password }, [], message to be sent, ..)
