function validateBulkCreateParticipants(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {
            valid: false,
            message: "Request body must be an object.",
        };
    }

    const { groupId, count } = body;

    if (typeof groupId !== "string" || groupId.trim() === "") {
        return {
            valid: false,
            message: "groupId is required.",
        };
    }

    if (!Number.isInteger(count) || count <= 0) {
        return {
            valid: false,
            message: "count must be a positive integer.",
        };
    }

    if (count > 500) {
        return {
            valid: false,
            message: "count is too large.",
        };
    }

    return {
        valid: true,
    };
}

module.exports = {
    validateBulkCreateParticipants,
};
