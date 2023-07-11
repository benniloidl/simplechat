const mongo = require('mongodb');
const { MongoClient } = mongo;
const encryption = require('./encryption');
const configData = require('../config.json');

// const uri = configData["db-connection"];
const uri = "mongodb://127.0.0.1:27017/SimpleChat";
const dbClient = new MongoClient(uri);
let db, user, chatHistory, sessions;


//DB functions
async function connectToDB() {
    console.log("connecting to db...");
    try {
        await dbClient.connect()
        db = dbClient.db();
        user = db.collection("user");
        chatHistory = db.collection("chatHistory");
        sessions = db.collection("sessions");
    } catch (e) {
        console.error("connecting to db failed");
        console.info(e);
        process.exit(42);
    }

    console.log("connected successfully\n");
}

/**
 *
 * @param {WebSocket}socket
 * @param {String}username
 * @return {Promise<void>}
 */
async function storeSessionCookie(username) {
    const token = encryption.createSessionToken(username);
    await deleteSessionCookie(username);
    await sessions.insertOne({ "username": username, "token": token });
    return token;
}

/**
 * Delete entry of username and session-cookie in Table sessions
 * @param {String}username
 * @return {Promise<boolean>}
 */
async function deleteSessionCookie(username) {
    try {
        // remove existing tokens
        await sessions.deleteMany({ "username": username });
    } catch (e) {
        console.warn(e);
        return false;
    }
    return true;
}

/**
 *
 * @param {String} username
 * @param {String} sessionToken
 * @return {Promise<void>}
 */
async function checkSessionCookie(username, sessionToken) {
    if (username === undefined || sessionToken === undefined) return false;
    const result = await sessions.findOne({ "username": username, "token": sessionToken }, { projection: { _id: 1 } });
    return result ? true : false;
}

/**
 *
 * @param {String} username
 * @param {String} password
 * @return {Promise<void>}
 */
async function userPasswordMatches(username, password) {
    if (!username) return false;
    username = username.toLowerCase();
    const pwdObject = await user.findOne({ "username": username }, { projection: { password: 1, salt: 1, _id: 0 } });
    if (!pwdObject) return false;
    return encryption.validatePassword(password, pwdObject);
}

/**
 *
 * @param {String} username
 * @param {String} password
 * @return {Promise<void>}
 */
async function validateUser(username, password) {
    return (await userPasswordMatches(username, password)) ? true : false;
}

/**
 *
 * @param {String} username
 * @param {String} password
 * @return {Promise<void>}
 */
async function createUser(username, password) {
    if (await userExists(username)) {
        return false;
    } else {
        let pwObject = await encryption.createPasswordHash(password);
        let res = await user.insertOne({
            "username": username,
            "password": pwObject.hash,
            "salt": pwObject.salt,
            chats: []
        });
        if (!res.acknowledged) console.error("Creation of user went wrong!", pwObject, res, username);
        return true;
    }
}

/**
 *
 * @param {String} username
 * @param {String} newName
 * @return {Promise<void>}
 */
async function changeUsername(username, newName) {
    const result = await user.updateOne({ "username": username }, { $set: { username: newName } });
    return result ? true : false;
}

/**
 *
 * @param {String} username
 * @return {Promise<void>}
 */
async function userExists(username) {
    const result = await user.findOne({ "username": username }, { projection: { _id: 1 } });
    return result ? true : false;
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function addChat(username, chatID) {
    if (await hasChat(username, chatID)) {
        return false;
    } else {
        await user.updateOne({ "username": username }, { $push: { chats: { "chatID": chatID, "unreadMessages": 0 } } });
        return true;
    }
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function removeChat(username, chatID) {
    if (await hasChat(username, chatID)) {
        await chatHistory.updateOne({ "_id": new mongo.ObjectId(chatID) }, { $pull: { "members": username } });
        await user.updateOne({ "username": username }, { $pull: { chats: { "chatID": chatID } } });
        return true;
    } else {
        return false;
    }
}

/**
 *
 * @param {String} username
 * @return {Promise<void>}
 */
async function getAllChatIDs(username) {
    return await user.findOne({ "username": username }, { projection: { _id: 0, chats: 1 } });
}

/**
 *
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function getChatDetails(chatID) {
    const result = await chatHistory.findOne({ "_id": new mongo.ObjectId(chatID) }, {
        projection: {
            _id: 0,
            name: 1,
            type: 1,
            members: 1
        }
    });
    return result ? result : false;
}

/**
 *
 * @param {String} username
 * @return {Promise<void>}
 */
async function fetchChats(username) {
    const chatIDs = await getAllChatIDs(username) ?? [];
    let chats = [];
    if (chatIDs.chats.length > 0) {
        for (let i = 0; i < chatIDs.chats.length; i++) {
            const id = chatIDs.chats[i];
            const detail = await getChatDetails(id.chatID);
            if (detail) {
                const unreadMessages = await getUnreadMessages(username, id.chatID);
                if (detail.type === "user" && detail.members.length === 2) {
                    const otherUsername = await getOtherUsername(username, id.chatID);
                    if (otherUsername) {
                        detail.name = otherUsername;
                    }
                }
                chats.push({
                    "chatID": id.chatID,
                    "name": detail.name,
                    "type": detail.type,
                    "unreadMessages": unreadMessages
                });
            }
        }
    } else {
        return false;
    }
    return chats;
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function getOtherUsername(username, chatID) {
    const users = await fetchGroupUsers(chatID);
    if (users.members.length === 2) {
        return (users.members[0] === username) ? users.members[1] : users.members[0];
    } else {
        return false;
    }
}

/**
 *
 * @param {String} name
 * @param {String} type
 * @param {members:Array<>} members
 * @return {Promise<void>}
 */
async function createChat(name, type, members) {
    const result = await chatHistory.insertOne({ "name": name, "type": type, "members": members, "messages": [] });
    return result.insertedId.toString();
}

/**
 *
 * @param {String} chatID
 * @param {start: Integer} start
 * @return {Promise<void>}
 */
async function fetchMessages(chatID, start, amount) {
    const result = await chatHistory.findOne({ "_id": new mongo.ObjectId(chatID) }, {
        projection: {
            _id: 0,
            messages: 1
        }
    });
    if (result) {
        let ret;
        try {
            result.messages.reverse();
            ret = result.messages.slice(start, start + amount);
        } catch {
            try {
                ret = result.messages.slice(start, result.messages.length);
            } catch {
                return false;
            }
        }
        return {
            message: ret,
            next: result.messages.length - (start + amount),
            total: result.messages.length
        };
    } else {
        return false;
    }
}

/**
 *
 * @param {String} message
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function addMessage(chatID, message) {
    if (await chatExists(chatID)) {
        await chatHistory.updateOne({ "_id": new mongo.ObjectId(chatID) }, { $push: { messages: message } });
        return true;
    } else {
        return false;
    }
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function incrementUnreadMessages(username, chatID) {
    await user.updateOne({ "username": username, "chats.chatID": chatID }, { $inc: { "chats.$.unreadMessages": 1 } });
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function resetUnreadMessages(username, chatID) {
    await user.updateOne({ "username": username, "chats.chatID": chatID }, { $set: { "chats.$.unreadMessages": 0 } });
    await chatHistory.updateOne({ "_id": new mongo.ObjectId(chatID) }, { $set: { "messages.$[elem].readConfirmation": true } },
        { "arrayFilters": [{ "elem.readConfirmation": false, "elem.author": { $ne: username } }], "multi": true });
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function getUnreadMessages(username, chatID) {
    const result = await user.findOne({ "username": username }, { projection: { _id: 0, chats: 1 } });
    for (const chat of result.chats) {
        if (chat.chatID === chatID) {
            return chat.unreadMessages;
        }
    }
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function hasChat(username, chatID) {
    const result = await user.findOne({ "username": username, "chats.chatID": chatID }, { projection: { _id: 1 } });
    return result ? true : false;
}

/**
 *
 * @param {String} users
´ * @return {Promise<void>}
 */
async function userChatExists(users) {
    const chatIDs = await getAllChatIDs(users[0]);
    if (chatIDs) {
        for (const id of chatIDs.chats) {
            const detail = await getChatDetails(id.chatID);
            if (detail.type === "user") {
                if (users[0] === users[1]) {
                    if (detail.members[0] === detail.members[1] && detail.members[0] === users[0]) {
                        return true;
                    }
                } else if (detail.members.includes(users[0]) && detail.members.includes(users[1])) {
                    return true;
                }
            }
        }
        return false;
    }
}

/**
 *
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function chatExists(chatID) {
    const result = await chatHistory.findOne({ "_id": new mongo.ObjectId(chatID) }, { projection: { _id: 1 } });
    return result ? true : false;
}

/**
 *
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function fetchGroupUsers(chatID) {
    const members = await chatHistory.findOne({ "_id": new mongo.ObjectId(chatID) }, {
        projection: {
            _id: 0,
            members: 1
        }
    });
    return members ? members : false;
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function removeUser(chatID, username) {
    const result = await chatHistory.findOne({ "_id": new mongo.ObjectId(chatID) }, {
        projection: {
            _id: 0,
            members: 1,
            type: 1
        }
    });
    if (result && result.members) {
        const index = result.members.indexOf(username);
        result.members.splice(index, 1);
        if (result.members.includes(username)) {
            const index2 = result.members.indexOf(username);
            result.members.splice(index2, 1);
        }
        await removeChat(username, chatID);
        if (result.members.length === 0) {
            return await deleteChat(chatID);
        } else if (result.type === "user") {
            await chatHistory.updateOne({ "_id": new mongo.ObjectId(chatID) }, { $set: { "name": username } });
        }
        return true;
    } else {
        return false;
    }
}

/**
 *
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function deleteChat(chatID) {
    const result = await chatHistory.deleteOne({ "_id": new mongo.ObjectId(chatID) });
    return result && result.deletedCount === 1;
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function addUser(chatID, username) {
    if (await userExists(username) && await chatExists(chatID) && !await userAlreadyInGroup(chatID, username)) {
        await addChat(username, chatID);
        await chatHistory.updateOne({ "_id": new mongo.ObjectId(chatID) }, { $push: { "members": username } });
        return true;
    } else {
        return false;
    }
}

/**
 *
 * @param {String} username
 * @param {String} chatID
 * @return {Promise<void>}
 */
async function userAlreadyInGroup(chatID, username) {
    const result = await fetchGroupUsers(chatID);
    if (result && result.members) {
        for (const member of result.members) {
            if (member === username) {
                return true;
            }
        }
    }
    return false;
}

/**
 *
 * @param {String} username
 * @return {Promise<void>}
 */
async function deleteAccount(username) {
    const chatIDs = await getAllChatIDs(username);
    if (chatIDs.chats && chatIDs.chats.length > 0) {
        for (const id of chatIDs.chats) {
            await removeUser(id.chatID, username);
        }
    }
    const result = await user.deleteOne({ "username": username });
    await deleteSessionCookie(username);
    return result && result.deletedCount === 1;
}

/**
 *
 * @param {String} chatID
 * @param {String} newGroupName
 * @return {Promise<void>}
 */
async function changeGroupName(chatID, newGroupName) {
    const result = await chatHistory.updateOne({ "_id": new mongo.ObjectId(chatID) }, { $set: { "name": newGroupName } });
    return result ? true : false;
}

/**
 *
 * @param {String} username
 * @param {String} newSalt
 * @param {String} newPassword
 * @return {Promise<void>}
 */
async function changePassword(username, newPassword, newSalt) {
    const result = await user.updateOne({ "username": username }, { $set: { "password": newPassword, "salt": newSalt } });
    return result ? true : false;
}

module.exports = {
    connectToDB,
    validateUser,
    createUser,
    addChat,
    userExists,
    fetchChats,
    createChat,
    fetchMessages,
    addMessage,
    hasChat,
    incrementUnreadMessages,
    resetUnreadMessages,
    fetchGroupUsers,
    removeUser,
    addUser,
    deleteAccount,
    userChatExists,
    checkSessionCookie,
    changeUsername,
    getAllChatIDs,
    chatExists,
    changeGroupName,
    changePassword,
    userPasswordMatches,
    deleteSessionCookie,
    storeSessionCookie,
    getChatDetails
};