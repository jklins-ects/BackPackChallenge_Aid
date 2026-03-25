function isValidParticipantPatch(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {
            valid: false,
            message: "Patch body must be an object.",
        };
    }

    const allowedTopLevelFields = [
        "groupId",
        "participantCode",
        "nfcId",
        "firstName",
        "lastName",
        "logo",
        "stats",
    ];

    const allowedStatFields = [
        "activity1",
        "activity2",
        "activity3",
        "activity4",
        "activity5",
        "activity6",
        "activity7",
        "activity8",
        "activity9",
    ];

    const keys = Object.keys(body);

    if (keys.length === 0) {
        return {
            valid: false,
            message: "Patch body cannot be empty.",
        };
    }

    for (const key of keys) {
        if (!allowedTopLevelFields.includes(key)) {
            return {
                valid: false,
                message: `Invalid field: ${key}`,
            };
        }
    }

    if ("groupId" in body && typeof body.groupId !== "string") {
        return { valid: false, message: "groupId must be a string." };
    }

    if ("participantCode" in body && typeof body.participantCode !== "string") {
        return { valid: false, message: "participantCode must be a string." };
    }

    if ("nfcId" in body && typeof body.nfcId !== "string") {
        return { valid: false, message: "nfcId must be a string." };
    }

    if ("firstName" in body && typeof body.firstName !== "string") {
        return { valid: false, message: "firstName must be a string." };
    }

    if ("lastName" in body && typeof body.lastName !== "string") {
        return { valid: false, message: "lastName must be a string." };
    }

    if ("logo" in body && typeof body.logo !== "string") {
        return { valid: false, message: "logo must be a string." };
    }

    if ("stats" in body) {
        if (
            !body.stats ||
            typeof body.stats !== "object" ||
            Array.isArray(body.stats)
        ) {
            return {
                valid: false,
                message: "stats must be an object.",
            };
        }

        const statKeys = Object.keys(body.stats);

        if (statKeys.length === 0) {
            return {
                valid: false,
                message: "stats cannot be an empty object.",
            };
        }

        for (const statKey of statKeys) {
            if (!allowedStatFields.includes(statKey)) {
                return {
                    valid: false,
                    message: `Invalid stats field: ${statKey}`,
                };
            }

            if (typeof body.stats[statKey] !== "number") {
                return {
                    valid: false,
                    message: `${statKey} must be a number.`,
                };
            }
        }
    }

    return { valid: true };
}

module.exports = {
    isValidParticipantPatch,
};
