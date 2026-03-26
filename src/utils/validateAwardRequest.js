const { ACTIVITY_KEYS } = require("./activityMetadata");

function validateAwardByCode(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { valid: false, message: "Request body must be an object." };
    }

    const { groupId, participantCode, activityKey, points, stationId } = body;

    if (typeof groupId !== "string" || groupId.trim() === "") {
        return { valid: false, message: "groupId is required." };
    }

    if (typeof participantCode !== "string" || participantCode.trim() === "") {
        return { valid: false, message: "participantCode is required." };
    }

    if (!ACTIVITY_KEYS.includes(activityKey)) {
        return { valid: false, message: "activityKey is invalid." };
    }

    if (typeof points !== "number") {
        return { valid: false, message: "points must be a number." };
    }

    if (typeof stationId !== "string" || stationId.trim() === "") {
        return { valid: false, message: "stationId is required." };
    }

    return { valid: true };
}

function validateAwardByNfc(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { valid: false, message: "Request body must be an object." };
    }

    const { nfcId, activityKey, points, stationId } = body;

    if (typeof nfcId !== "string" || nfcId.trim() === "") {
        return { valid: false, message: "nfcId is required." };
    }

    if (!ACTIVITY_KEYS.includes(activityKey)) {
        return { valid: false, message: "activityKey is invalid." };
    }

    if (typeof points !== "number") {
        return { valid: false, message: "points must be a number." };
    }

    if (typeof stationId !== "string" || stationId.trim() === "") {
        return { valid: false, message: "stationId is required." };
    }

    return { valid: true };
}

module.exports = {
    ALLOWED_ACTIVITY_KEYS: ACTIVITY_KEYS,
    validateAwardByCode,
    validateAwardByNfc,
};
