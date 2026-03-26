const { ObjectId } = require("mongodb");
const {
    getParticipantsCollection,
    getActivityEventsCollection,
} = require("../db/mongo");

async function incrementParticipantStatById(
    participantId,
    activityKey,
    points,
) {
    const participants = await getParticipantsCollection();

    await participants.updateOne(
        { _id: new ObjectId(participantId) },
        {
            $set: {
                [`stats.${activityKey}`]: points,
                updatedAt: new Date(),
            },
        },
    );

    return participants.findOne({ _id: new ObjectId(participantId) });
}

async function logResolvedEvent({
    participantId,
    groupId,
    participantCode,
    nfcId = "",
    stationId,
    activityKey,
    points,
}) {
    const activityEvents = await getActivityEventsCollection();

    await activityEvents.insertOne({
        participantId: new ObjectId(participantId),
        groupId,
        participantCode,
        nfcId,
        stationId,
        eventType: "score_set",
        activityKey,
        points,
        resolved: true,
        resolvedAt: new Date(),
        createdAt: new Date(),
    });
}

async function logPendingNfcEvent({ nfcId, stationId, activityKey, points }) {
    const activityEvents = await getActivityEventsCollection();

    const result = await activityEvents.insertOne({
        nfcId,
        stationId,
        eventType: "score_set",
        activityKey,
        points,
        resolved: false,
        createdAt: new Date(),
    });

    return activityEvents.findOne({ _id: result.insertedId });
}

async function awardByCode({ participant, stationId, activityKey, points }) {
    const updatedParticipant = await incrementParticipantStatById(
        participant._id,
        activityKey,
        points,
    );

    await logResolvedEvent({
        participantId: participant._id,
        groupId: participant.groupId,
        participantCode: participant.participantCode,
        nfcId: participant.nfcId || "",
        stationId,
        activityKey,
        points,
    });

    return updatedParticipant;
}

async function awardByNfc({
    participant,
    nfcId,
    stationId,
    activityKey,
    points,
}) {
    if (!participant) {
        const pendingEvent = await logPendingNfcEvent({
            nfcId,
            stationId,
            activityKey,
            points,
        });

        return {
            mode: "pending",
            pendingEvent,
        };
    }

    const updatedParticipant = await incrementParticipantStatById(
        participant._id,
        activityKey,
        points,
    );

    await logResolvedEvent({
        participantId: participant._id,
        groupId: participant.groupId,
        participantCode: participant.participantCode,
        nfcId,
        stationId,
        activityKey,
        points,
    });

    return {
        mode: "resolved",
        participant: updatedParticipant,
    };
}

async function resolvePendingEventsForParticipant(participant) {
    const activityEvents = await getActivityEventsCollection();
    const participants = await getParticipantsCollection();

    if (!participant.nfcId || participant.nfcId.trim() === "") {
        return {
            participant,
            resolvedCount: 0,
        };
    }

    const pendingEvents = await activityEvents
        .find({
            nfcId: participant.nfcId,
            resolved: false,
        })
        .toArray();

    if (pendingEvents.length === 0) {
        return {
            participant,
            resolvedCount: 0,
        };
    }

    pendingEvents.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime;
    });

    const setDoc = { updatedAt: new Date() };
    for (const event of pendingEvents) {
        setDoc[`stats.${event.activityKey}`] = event.points;
    }

    await participants.updateOne(
        { _id: new ObjectId(participant._id) },
        { $set: setDoc },
    );

    await activityEvents.updateMany(
        {
            _id: { $in: pendingEvents.map((e) => e._id) },
        },
        {
            $set: {
                resolved: true,
                resolvedAt: new Date(),
                participantId: new ObjectId(participant._id),
                groupId: participant.groupId,
                participantCode: participant.participantCode,
            },
        },
    );

    const updatedParticipant = await participants.findOne({
        _id: new ObjectId(participant._id),
    });

    return {
        participant: updatedParticipant,
        resolvedCount: pendingEvents.length,
    };
}

module.exports = {
    awardByCode,
    awardByNfc,
    resolvePendingEventsForParticipant,
};
