# SimpleChat

This is a simple responsive student project featuring basic chat functionality. It is meant to be as lightweight as possible, therefore it only relies on plain **HTML**, **CSS**, **JavaScript** and **NodeJS**.

> **Important info:** SimpleChat has been tested on Chromium-based browsers and works absolutely perfect. There are known issues with Firefox, primarily due to the lack of a *:has selector*. It might be fixed in the future.

![image](https://github.com/altetaube/simplechat/assets/116595379/1628ecdb-9205-480f-84f2-c93965dd3bb2)

## Setup

This project requires a **NodeJS** installation (v.18) or higher. Please make sure you have it installed prior to setting up SimpleChat.

#### Installing the dependencies
```
npm i
```

#### Starting up SimpleChat
```
npm start
```

## API Data Structure
The connection between server and client go through a **WebSocket** listening on port 80. SimpleChat only makes use of the **message** event.
In the message, the data is structured as follows *(JSON)*:
+ **event:** *Type of message*
+ **data:** *Data to be transferred*

## Events
+ **createChat:** *Start a new chat with a user*
  + **name:** (type: 'chat') *Name of the user to add as a friend /* (type: 'group') *Gives the created group a name*
  + **type:** ('chat' / 'group') *Determines whether a friend is to be added or a group is being created*
  + **users:** *Lists all the users to add to the group on creation*
      + **username:** *Name of a friend to be added to a group*
+ **insertMember:** *Add a friend to a group*
    + **chatID:** *The ID of the group where the member(s) should be added to*
    + **usernames** *An array of strings featuring the usernames of the friends to add to the group*
+ **deleteMember:** *Remove a friend from a group. If there are no members left, the group will be deleted*
    + **chatID:** *The ID of the group where the member(s) should be deleted from*
    + **usernames** *An array of strings featuring the usernames of the friends to remove from the group*
