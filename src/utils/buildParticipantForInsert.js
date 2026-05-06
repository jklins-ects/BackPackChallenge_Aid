const { applyDefaultStats } = require("./defaultStats");
const { generateBase64Logo } = require("./generateLogo");

function buildParticipantForInsert(input) {
    const firstName = input.firstName?.trim?.() || "";
    const lastName = input.lastName?.trim?.() || "";
    const logo = input.logo?.trim?.() || "";
    const participantCode = input.participantCode.trim().toUpperCase();

    return {
        groupId: input.groupId.trim(),
        participantCode,
        ...(input.nfcId?.trim?.() ? { nfcId: input.nfcId.trim() } : {}),
        firstName,
        lastName,
        logo:
            logo !== ""
                ? logo
                : generateBase64Logo(firstName, lastName, participantCode),
        stats: applyDefaultStats(input.stats),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

module.exports = {
    buildParticipantForInsert,
};
