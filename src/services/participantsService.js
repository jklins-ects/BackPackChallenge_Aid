const { ObjectId } = require("mongodb");
const { getParticipantsCollection } = require("../db/mongo");
const activitiesService = require("./activitiesService");
const {
    buildParticipantForInsert,
} = require("../utils/buildParticipantForInsert");
const {
    generateUniqueParticipantCode,
} = require("../utils/generateParticipantCode");

async function createParticipant(participant) {
    const collection = await getParticipantsCollection();
    const result = await collection.insertOne(participant);
    return collection.findOne({ _id: result.insertedId });
}

async function getAllParticipants() {
    const collection = await getParticipantsCollection();
    return collection.find({}).toArray();
}

async function getAllGroupIds() {
    const collection = await getParticipantsCollection();

    const groupIds = await collection.distinct("groupId", {
        groupId: { $type: "string", $ne: "" },
    });

    return groupIds.sort((a, b) => a.localeCompare(b));
}

async function getParticipantById(id) {
    const collection = await getParticipantsCollection();
    return collection.findOne({ _id: new ObjectId(id) });
}

async function getParticipantByCode(participantCode) {
    const collection = await getParticipantsCollection();
    return collection.findOne({
        participantCode: participantCode.toUpperCase(),
    });
}

async function getParticipantByNfcId(nfcId) {
    const collection = await getParticipantsCollection();
    return collection.findOne({ nfcId });
}

async function getParticipantByGroupAndCode(groupId, participantCode) {
    const collection = await getParticipantsCollection();
    return collection.findOne({
        groupId,
        participantCode: participantCode.toUpperCase(),
    });
}

async function getParticipantsByGroupId(groupId) {
    const collection = await getParticipantsCollection();
    return collection.find({ groupId }).toArray();
}

async function groupExists(groupId) {
    const collection = await getParticipantsCollection();
    const existing = await collection.findOne(
        { groupId },
        { projection: { _id: 1 } },
    );
    return Boolean(existing);
}

async function renameGroupId(currentGroupId, newGroupId) {
    const collection = await getParticipantsCollection();

    const existingParticipants = await collection
        .find({ groupId: currentGroupId })
        .toArray();

    if (!existingParticipants.length) {
        return null;
    }

    await collection.updateMany(
        { groupId: currentGroupId },
        {
            $set: {
                groupId: newGroupId,
                updatedAt: new Date(),
            },
        },
    );

    return collection.find({ groupId: newGroupId }).toArray();
}

async function updateParticipantById(id, participant) {
    const collection = await getParticipantsCollection();

    participant.updatedAt = new Date();

    const result = await collection.replaceOne(
        { _id: new ObjectId(id) },
        participant,
    );

    if (result.matchedCount === 0) {
        return null;
    }

    return collection.findOne({ _id: new ObjectId(id) });
}

async function patchParticipantById(id, patchData) {
    const collection = await getParticipantsCollection();

    const updateDoc = { $set: { updatedAt: new Date() } };

    if ("groupId" in patchData) updateDoc.$set.groupId = patchData.groupId;
    if ("participantCode" in patchData)
        updateDoc.$set.participantCode =
            patchData.participantCode.toUpperCase();
    if ("nfcId" in patchData) {
        const trimmed = patchData.nfcId.trim();

        if (trimmed) {
            updateDoc.$set.nfcId = trimmed;
        } else {
            updateDoc.$unset = updateDoc.$unset || {};
            updateDoc.$unset.nfcId = "";
        }
    }
    if ("firstName" in patchData)
        updateDoc.$set.firstName = patchData.firstName;
    if ("lastName" in patchData) updateDoc.$set.lastName = patchData.lastName;
    if ("logo" in patchData) updateDoc.$set.logo = patchData.logo;

    if ("stats" in patchData) {
        for (const [key, value] of Object.entries(patchData.stats)) {
            updateDoc.$set[`stats.${key}`] = value;
        }
    }

    const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc,
    );

    if (result.matchedCount === 0) {
        return null;
    }

    return collection.findOne({ _id: new ObjectId(id) });
}

async function deleteParticipantById(id) {
    const collection = await getParticipantsCollection();

    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
        return null;
    }

    await collection.deleteOne({ _id: new ObjectId(id) });
    return existing;
}

async function linkNfcIdToParticipant(id, nfcId) {
    const collection = await getParticipantsCollection();

    const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $set: {
                nfcId,
                updatedAt: new Date(),
            },
        },
    );

    if (result.matchedCount === 0) {
        return null;
    }

    const linkedParticipant = await collection.findOne({
        _id: new ObjectId(id),
    });

    const mergeResult =
        await activitiesService.resolvePendingEventsForParticipant(
            linkedParticipant,
        );

    return {
        participant: mergeResult.participant,
        resolvedPendingEvents: mergeResult.resolvedCount,
    };
}

async function bulkCreateParticipants(groupId, count) {
    const collection = await getParticipantsCollection();

    const existingCodes = new Set(await collection.distinct("participantCode"));

    const batchCodes = new Set();
    const participantsToInsert = [];

    function randomCode(length = 4) {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "";

        for (let i = 0; i < length; i += 1) {
            const index = Math.floor(Math.random() * alphabet.length);
            result += alphabet[index];
        }

        return result;
    }

    function generateBatchUniqueCode() {
        let attempts = 0;

        while (attempts < 5000) {
            const code = randomCode(4);

            if (!existingCodes.has(code) && !batchCodes.has(code)) {
                batchCodes.add(code);
                return code;
            }

            attempts += 1;
        }

        throw new Error("Could not generate enough unique participant codes.");
    }

    for (let i = 0; i < count; i += 1) {
        const participantCode = generateBatchUniqueCode();

        const participant = buildParticipantForInsert({
            groupId,
            participantCode,
        });

        participantsToInsert.push(participant);
    }

    const result = await collection.insertMany(participantsToInsert);

    return participantsToInsert.map((participant, index) => ({
        _id: result.insertedIds[index],
        ...participant,
    }));
}

module.exports = {
    bulkCreateParticipants,
    createParticipant,
    getAllParticipants,
    getAllGroupIds,
    getParticipantById,
    getParticipantByCode,
    getParticipantByNfcId,
    getParticipantByGroupAndCode,
    getParticipantsByGroupId,
    groupExists,
    renameGroupId,
    linkNfcIdToParticipant,
    updateParticipantById,
    patchParticipantById,
    deleteParticipantById,
};
