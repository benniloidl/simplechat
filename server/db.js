const mongo = require('mongodb');
const crypto = require('crypto');
const { MongoClient } = mongo;
const uri = "mongodb://127.0.0.1:27017/SimpleChat";
const dbClient = new MongoClient(uri);
let db, user, chatHistory;


//DB functions
async function connectToDB() {
    console.log("connecting to db...");
    try {
        await dbClient.connect()
        db = dbClient.db();
        user = db.collection("user");
        chatHistory = db.collection("chatHistory");
    } catch {
        console.error("connecting to db failed");
        process.exit(42);
    }

    console.log("connected successfully\n");
    // console.log(await addMessage("649e8f8dbbc6ef0e740648d6", {
    //     message: "message",
    //     // Data injected by server!
    //     timeStamp: "undefined",
    //     author: "undefined",
    //     readConfirmation: false
    // }));
}


async function setPassword(password){
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt,
        1000, 64, 'sha512').toString('hex');
    return {salt: salt, hash: hash};
}

function validatePassword(passwordToCheck, passwordObject){
    const passwordHash = crypto.pbkdf2Sync(passwordToCheck, passwordObject.salt,
        1000, 64, 'sha512').toString('hex');
    return passwordHash === passwordObject.password;
}

async function validateUser(username, password) {
    if (!username) {
        return false;
    }
    username = username.toLowerCase();
    const pwdObject = await user.findOne({"username": username}, {projection:{password:1, salt:1, _id:0}});
    if (!pwdObject) return;
    const result = validatePassword(password, pwdObject);
    return result;
}

async function createUser(username, password) {
    if (!username.match(/^[a-zA-Z0-9._\-+]*$/g)) {
        return false;
    }
    const result = await user.findOne({ "username": username }, { projection: { _id: 1 } });
    if (result) {
        return false;
    } else {
        let pwObject = await setPassword(password);
        let res = await user.insertOne({ "username": username, "password": pwObject.hash, "salt": pwObject.salt, chats: [] });
        if (!res.acknowledged) console.error("Creation of user went wrong!", pwObject, res, username);
        return true;
    }
}

async function userExists(username) {
    const result = await user.findOne({ "username": username }, { projection: { _id: 1 } });
    if (result) {
        return true;
    } else {
        return false;
    }
}


async function addChat(username, chatID) {
    const result = await user.findOne({ "username": username, "chats.chatID": chatID }, { projection: { _id: 1 } });
    if (result) {
        return false;
    }
    await user.updateOne({ "username": username }, { $push: { chats: { "chatID": chatID, "unreadMessages": 0 } } });
    return true;
}

async function removeChat(username, chatID) {
    const result = await user.findOne({ "username": username, "chats.chatID": chatID }, { projection: { _id: 1 } });
    if (!result) {
        return false;
    }
    await user.updateOne({ "username": username }, { $pull: { chats: { "chatID": chatID } } });
    return true;
}

async function getAllChatIDs(username) {
    return await user.findOne({ "username": username }, { projection: { _id: 0, chats: 1 } });
}

async function getChatDetails(chatID) {
    const result = await chatHistory.findOne({ "_id": new mongo.ObjectId(chatID) }, { projection: { _id: 0, name: 1, type: 1 } });
    if (result) {
        return result;
    } else {
        return false;
    }
}

async function fetchChats(username) {
    const chatIDs = await getAllChatIDs(username);
    let chats = [];
    if (chatIDs.chats.length > 0) {
        for (let i = 0; i < chatIDs.chats.length; i++) {
            const id = chatIDs.chats[i];
            const detail = await getChatDetails(id.chatID);
            if (detail) {
                const unreadMessages = await getUnreadMessages(username, id.chatID);
                if (detail.type === "user") {
                    const otherUsername = await getOtherUsername(username, id.chatID);
                    if (otherUsername) {
                        detail.name = otherUsername;
                    }
                }
                chats.push({ "chatID": id.chatID, "name": detail.name, "type": detail.type, "unreadMessages": unreadMessages });
            }
        }
    } else {
        return false;
    }
    return chats;
}

async function getOtherUsername(username, chatID) {
    const result = await user.findOne({ "username": { $ne: username }, "chats.chatID": chatID },
        { projection: { _id: 1, username: 1 } });
    if (result) {
        return result.username;
    } else {
        return false;
    }
}

async function createChat(name, type) {
    const result = await chatHistory.insertOne({ "name": name, "type": type, "messages": [] });
    return result.insertedId.toString();
}

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
        return ret;
    } else {
        return false;
    }
}

async function addMessage(chatID, message) {
    const result = await chatHistory.findOne({ "_id": new mongo.ObjectId(chatID) }, { projection: { _id: 1 } });
    if (result) {
        await chatHistory.updateOne({ "_id": new mongo.ObjectId(chatID) }, { $push: { messages: message } });
        return true;
    } else {
        return false;
    }
}

/*
async function calculateUnreadMessages(username, chatID) {
    const result = await fetchMessages(chatID, 0, 100);
    let unreadMessages = 0;
    if (result) {
        for (const message of result) {
            if (message.readConfirmation || message.author == username) {
                break;
            }
            unreadMessages++;
        }
    }
    return unreadMessages;
}*/

async function incrementUnreadMessages(username, chatID) {
    await user.updateOne({ "username": username, "chats.chatID": chatID }, { $inc: { "chats.$.unreadMessages": 1 } });
}

async function resetUnreadMessages(username, chatID) {
    await user.updateOne({ "username": username, "chats.chatID": chatID }, { $set: { "chats.$.unreadMessages": 0 } });
    await chatHistory.updateOne({ "_id": new mongo.ObjectId(chatID) }, { $set: { "messages.$[elem].readConfirmation": true } },
        { "arrayFilters": [{ "elem.readConfirmation": false, "elem.author": { $ne: username } }], "multi": true });
}

async function getUnreadMessages(username, chatID) {
    const result = await user.findOne({ "username": username }, { projection: { _id: 0, chats: 1 } });
    for (const chat of result.chats) {
        if (chat.chatID == chatID) {
            return chat.unreadMessages;
        }
    }
}

async function hasChat(username, chatID) {
    const result = await user.findOne({ "username": username, "chats.chatID": chatID }, { projection: { _id: 1 } });
    if (result) {
        return true;
    } else {
        return false;
    }
}

async function chatExists(username, otherUsername) {
    if (username === otherUsername) {
        const chatIDs = await getAllChatIDs(username);
        if (chatIDs) {
            for (const id of chatIDs.chats) {
                const detail = await getChatDetails(id.chatID);
                if (detail.name === username) {
                    return true;
                }
            }
            return false;
        }
    } else {
        const chatIDs1 = await getAllChatIDs(username);
        const chatIDs2 = await getAllChatIDs(otherUsername);
        if (chatIDs1 && chatIDs2) {
            for (const id1 of chatIDs1.chats) {
                for (const id2 of chatIDs2.chats) {
                    if (id1.chatID == id2.chatID) {
                        return true;
                    }
                }
            }
            return false;
        } else {
            return false;
        }
    }
}

async function fetchGroupUsers(chatID) {
    const result = await user.find({"chats.chatID": chatID }, { projection: { _id: 0, username: 1 } });
    let users = [];
    await result.forEach(user => {
        users.push(user);
    });
    return users;
}

module.exports = {
    connectToDB,
    validateUser,
    createUser,
    addChat,
    userExists,
    removeChat,
    fetchChats,
    createChat,
    fetchMessages,
    addMessage,
    hasChat,
    getUnreadMessages,
    incrementUnreadMessages,
    resetUnreadMessages,
    chatExists,
    fetchGroupUsers
};