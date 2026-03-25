const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 4) {
    let result = "";

    for (let i = 0; i < length; i += 1) {
        const index = Math.floor(Math.random() * ALPHABET.length);
        result += ALPHABET[index];
    }

    return result;
}

async function generateUniqueParticipantCode(
    isCodeTaken,
    length = 4,
    maxAttempts = 1000,
) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const code = randomCode(length);

        const taken = await isCodeTaken(code);
        if (!taken) {
            return code;
        }
    }

    throw new Error("Could not generate a unique participant code.");
}

module.exports = {
    generateUniqueParticipantCode,
};
