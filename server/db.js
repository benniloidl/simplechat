const mongo = require('mongodb');
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

    //test the functions
    validateUser("test123", "123").then((result) => {
        console.log("validation: " + result);
    });
    createUser("Test12345", "Test123*345u").then((result) => {
        console.log("creating a new user: " + result);
    });
    addChatID("test123", "ID1234").then((result) => {
        console.log("added ID: " + result);
    });
    /*removeChatID("test123", "ID1234").then((result) => {
        console.log("removed ID: " + result);
    });*/
    getAllChatIDs("test123").then((result) => {
        console.log(result);
    });
    /*createChatHistory("Chat123").then((result) => {
        console.log("createChatHistory: " + result);
    });
    addMessage("649be7f00dee1cb81769fae2", { message: "Hello World", time: "12:34", readConfirmation: false }).then((result) => {
        console.log("addMessage: " + result);
    });*/
    loadMessages("649be7f00dee1cb81769fae2", 0, 5).then((result) => {
        console.log(result);
    });
    //end of test
}

async function validateUser(username, password) {
    return await user.findOne({ "username": username, "password": password }, { projection: { _id: 1 } });
}

async function createUser(username, password) {
    const result = await user.findOne({ "username": username }, { projection: { _id: 1 } });
    if (result) {
        return false;
    } else {
        await user.insertOne({ "username": username, "password": password, chats: [] });
        return true;
    }
}

async function addChatID(username, chatID) {
    const result = await user.findOne({ "username": username, "chats.chatID": chatID }, { projection: { _id: 1 } });
    if (result) {
        return false;
    }
    await user.updateOne({ "username": username }, { $push: { chats: { "chatID": chatID } } });
    return true;
}

async function removeChatID(username, chatID) {
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

async function createChatHistory(name) {
    const result = await chatHistory.insertOne({ "name": name, "messages": [] });
    return result.insertedId.toString();
}

async function loadMessages(chatID, start, amount) {
    const result = await chatHistory.findOne({ "_id": new mongo.ObjectId(chatID) }, { projection: { _id: 0, messages: 1 } });
    if (result) {
        let ret;
        try {
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

module.exports = {
    connectToDB,
    validateUser,
    createUser,
    addChatID,
    removeChatID,
    getAllChatIDs,
    createChatHistory,
    loadMessages,
    addMessage
};