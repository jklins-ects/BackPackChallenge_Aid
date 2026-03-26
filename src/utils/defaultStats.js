const { ACTIVITY_KEYS } = require("./activityMetadata");

function buildDefaultStats() {
    return Object.fromEntries(ACTIVITY_KEYS.map((key) => [key, 0]));
}

function applyDefaultStats(inputStats = {}) {
    const defaults = buildDefaultStats();

    for (const key of Object.keys(inputStats)) {
        if (typeof inputStats[key] === "number") {
            defaults[key] = inputStats[key];
        }
    }

    return defaults;
}

module.exports = {
    buildDefaultStats,
    applyDefaultStats,
};
