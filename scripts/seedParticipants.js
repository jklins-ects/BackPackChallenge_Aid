require("dotenv").config();

const { MongoClient } = require("mongodb");
const {
    buildParticipantForInsert,
} = require("../src/utils/buildParticipantForInsert");

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME || "participants";

if (!uri || !dbName) {
    throw new Error("Missing Mongo environment variables.");
}

const client = new MongoClient(uri);

const GROUP_ID = "group-101";
const COUNT = 20;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const FIRST_NAMES = [
    "Liam",
    "Olivia",
    "Noah",
    "Emma",
    "Elijah",
    "Ava",
    "Mateo",
    "Sophia",
    "Lucas",
    "Isabella",
    "Mason",
    "Mia",
    "Ethan",
    "Amelia",
    "Logan",
    "Harper",
    "James",
    "Evelyn",
    "Benjamin",
    "Abigail",
    "Henry",
    "Ella",
    "Jackson",
    "Scarlett",
    "Sebastian",
    "Grace",
    "Jack",
    "Chloe",
    "Owen",
    "Lily",
];

const LAST_NAMES = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Perez",
    "Thompson",
    "White",
    "Harris",
    "Sanchez",
    "Clark",
    "Ramirez",
    "Lewis",
    "Robinson",
];

function randomCode(length = 4) {
    let result = "";
    for (let i = 0; i < length; i += 1) {
        const index = Math.floor(Math.random() * ALPHABET.length);
        result += ALPHABET[index];
    }
    return result;
}

function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

async function generateUniqueCodes(collection, count) {
    const existingCodes = new Set(await collection.distinct("participantCode"));
    const newCodes = new Set();

    function generate() {
        let attempts = 0;

        while (attempts < 5000) {
            const code = randomCode();

            if (!existingCodes.has(code) && !newCodes.has(code)) {
                newCodes.add(code);
                return code;
            }

            attempts += 1;
        }

        throw new Error("Could not generate enough unique participant codes.");
    }

    const codes = [];
    for (let i = 0; i < count; i += 1) {
        codes.push(generate());
    }

    return codes;
}

function buildFakeNames(count) {
    const usedFullNames = new Set();
    const names = [];

    let attempts = 0;
    while (names.length < count && attempts < 10000) {
        const firstName = randomFrom(FIRST_NAMES);
        const lastName = randomFrom(LAST_NAMES);
        const fullName = `${firstName} ${lastName}`;

        if (!usedFullNames.has(fullName)) {
            usedFullNames.add(fullName);
            names.push({ firstName, lastName });
        }

        attempts += 1;
    }

    if (names.length < count) {
        throw new Error("Could not generate enough unique fake names.");
    }

    return names;
}

async function seedParticipants() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        console.log(`Generating ${COUNT} participants for ${GROUP_ID}...`);

        const codes = await generateUniqueCodes(collection, COUNT);
        const fakeNames = buildFakeNames(COUNT);

        const participants = codes.map((code, index) => {
            const { firstName, lastName } = fakeNames[index];

            return buildParticipantForInsert({
                groupId: GROUP_ID,
                participantCode: code,
                firstName,
                lastName,
            });
        });

        const result = await collection.insertMany(participants);

        const created = participants.map((participant, index) => ({
            _id: result.insertedIds[index],
            ...participant,
        }));

        console.log(`Inserted ${created.length} participants:\n`);

        for (const participant of created) {
            console.log(
                `${participant.participantCode} | ${participant.firstName} ${participant.lastName} | ${participant.groupId}`,
            );
        }

        console.log("\nDone.");
    } catch (error) {
        console.error("Seed failed:", error);
    } finally {
        await client.close();
        console.log("Connection closed");
    }
}

seedParticipants();
