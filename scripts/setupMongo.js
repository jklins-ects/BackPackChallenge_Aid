require("dotenv").config();

const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME || "participants";
const activityEventsCollectionName =
    process.env.ACTIVITY_EVENTS_COLLECTION_NAME || "activityEvents";

async function ensureCollection(db, name, validator) {
    const collections = await db.listCollections({ name }).toArray();

    if (collections.length === 0) {
        await db.createCollection(name, { validator });
        console.log(`Created collection: ${name}`);
    } else {
        await db.command({
            collMod: name,
            validator,
        });
        console.log(`Updated validator for: ${name}`);
    }
}

async function setupMongo() {
    if (!uri || !dbName || !collectionName) {
        throw new Error("Missing required environment variables.");
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db(dbName);

        const participantValidator = {
            $jsonSchema: {
                bsonType: "object",
                required: ["groupId", "participantCode"],
                additionalProperties: false,
                properties: {
                    _id: { bsonType: "objectId" },
                    participantCode: { bsonType: "string" },
                    nfcId: { bsonType: "string" },
                    firstName: { bsonType: "string" },
                    lastName: { bsonType: "string" },
                    groupId: { bsonType: "string" },
                    logo: { bsonType: "string" },
                    stats: {
                        bsonType: "object",
                        additionalProperties: false,
                        properties: {
                            activity1: { bsonType: "number" },
                            activity2: { bsonType: "number" },
                            activity3: { bsonType: "number" },
                            activity4: { bsonType: "number" },
                            activity5: { bsonType: "number" },
                            activity6: { bsonType: "number" },
                            activity7: { bsonType: "number" },
                            activity8: { bsonType: "number" },
                            activity9: { bsonType: "number" },
                        },
                    },
                    createdAt: { bsonType: "date" },
                    updatedAt: { bsonType: "date" },
                },
            },
        };

        const activityEventValidator = {
            $jsonSchema: {
                bsonType: "object",
                required: [
                    "eventType",
                    "activityKey",
                    "points",
                    "stationId",
                    "resolved",
                    "createdAt",
                ],
                additionalProperties: false,
                properties: {
                    _id: { bsonType: "objectId" },
                    participantId: { bsonType: "objectId" },
                    groupId: { bsonType: "string" },
                    participantCode: { bsonType: "string" },
                    nfcId: { bsonType: "string" },
                    stationId: { bsonType: "string" },
                    eventType: { bsonType: "string" },
                    activityKey: { bsonType: "string" },
                    points: { bsonType: "number" },
                    resolved: { bsonType: "bool" },
                    resolvedAt: { bsonType: "date" },
                    createdAt: { bsonType: "date" },
                },
            },
        };

        await ensureCollection(db, collectionName, participantValidator);
        await ensureCollection(
            db,
            activityEventsCollectionName,
            activityEventValidator,
        );

        const participants = db.collection(collectionName);
        const activityEvents = db.collection(activityEventsCollectionName);

        await participants.createIndex({ groupId: 1 });
        await participants.createIndex(
            { participantCode: 1 },
            { unique: true },
        );
        await participants.createIndex(
            { nfcId: 1 },
            {
                unique: true,
                partialFilterExpression: { nfcId: { $type: "string" } },
            },
        );

        await activityEvents.createIndex({ participantId: 1 });
        await activityEvents.createIndex({ nfcId: 1, resolved: 1 });
        await activityEvents.createIndex({ participantCode: 1, groupId: 1 });
        await activityEvents.createIndex({ createdAt: -1 });

        console.log("Indexes created");
    } catch (err) {
        console.error("Mongo setup failed:", err);
    } finally {
        await client.close();
        console.log("Connection closed");
    }
}

setupMongo();
