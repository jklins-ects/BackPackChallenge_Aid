function buildDefaultStats() {
    return {
        activity1: 0,
        activity2: 0,
        activity3: 0,
        activity4: 0,
        activity5: 0,
        activity6: 0,
        activity7: 0,
        activity8: 0,
        activity9: 0,
    };
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
