const { ACTIVITY_KEYS } = require("./activityMetadata");

function isValidParticipant(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return false;
    }

    const requiredTopLevel = ["groupId", "participantCode"];
    for (const field of requiredTopLevel) {
        if (!(field in body)) return false;
    }

    if (typeof body.groupId !== "string" || body.groupId.trim() === "")
        return false;
    if (
        typeof body.participantCode !== "string" ||
        body.participantCode.trim() === ""
    )
        return false;

    if ("nfcId" in body && typeof body.nfcId !== "string") return false;
    if ("firstName" in body && typeof body.firstName !== "string") return false;
    if ("lastName" in body && typeof body.lastName !== "string") return false;
    if ("logo" in body && typeof body.logo !== "string") return false;

    if ("stats" in body) {
        if (
            !body.stats ||
            typeof body.stats !== "object" ||
            Array.isArray(body.stats)
        ) {
            return false;
        }

        for (const key of Object.keys(body.stats)) {
            if (!ACTIVITY_KEYS.includes(key)) return false;
            if (typeof body.stats[key] !== "number") return false;
        }
    }

    return true;
}

module.exports = {
    isValidParticipant,
};
