require("dotenv").config();

const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const participantsCollectionName =
    process.env.COLLECTION_NAME || "participants";
const activityEventsCollectionName =
    process.env.ACTIVITY_EVENTS_COLLECTION_NAME || "activityEvents";

if (!uri || !dbName || !participantsCollectionName) {
    throw new Error("Missing required Mongo environment variables.");
}

const client = new MongoClient(uri);
let db;

async function connectToMongo() {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
        console.log("Connected to MongoDB");
    }
    return db;
}

async function getParticipantsCollection() {
    const database = await connectToMongo();
    return database.collection(participantsCollectionName);
}

async function getActivityEventsCollection() {
    const database = await connectToMongo();
    return database.collection(activityEventsCollectionName);
}

module.exports = {
    connectToMongo,
    getParticipantsCollection,
    getActivityEventsCollection,
};
