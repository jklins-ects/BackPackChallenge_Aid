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

    const statKeys = [
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

    if ("stats" in body) {
        if (
            !body.stats ||
            typeof body.stats !== "object" ||
            Array.isArray(body.stats)
        ) {
            return false;
        }

        for (const key of Object.keys(body.stats)) {
            if (!statKeys.includes(key)) return false;
            if (typeof body.stats[key] !== "number") return false;
        }
    }

    return true;
}

module.exports = {
    isValidParticipant,
};
