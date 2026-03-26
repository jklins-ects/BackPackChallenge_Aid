//note: map to empty string to hide activity
const ACTIVITY_METADATA = [
    { key: "activity1", title: "Drone Piloting" },
    { key: "activity2", title: "Robot Programming" },
    { key: "activity3", title: "Model Airplane Piloting" },
    { key: "activity4", title: "Temp Activity Title 4" },
    { key: "activity5", title: "Temp Activity Title 5" },
    { key: "activity6", title: "Temp Activity Title 6" },
    { key: "activity7", title: "Temp Activity Title 7" },
    { key: "activity8", title: "Temp Activity Title 8" },
    { key: "activity9", title: "Temp Activity Title 9" },
];

const ACTIVITY_KEYS = ACTIVITY_METADATA.map((activity) => activity.key);

function normalizeActivityTitle(title) {
    return typeof title === "string" ? title.trim() : "";
}

function getActivityMetadata() {
    return ACTIVITY_METADATA.map((activity) => ({
        ...activity,
        title: normalizeActivityTitle(activity.title),
    }));
}

function getVisibleActivityMetadata() {
    return getActivityMetadata().filter((activity) => activity.title !== "");
}

function getActivityTitleByKey() {
    return Object.fromEntries(
        getActivityMetadata().map((activity) => [activity.key, activity.title]),
    );
}

module.exports = {
    ACTIVITY_KEYS,
    getActivityMetadata,
    getVisibleActivityMetadata,
    getActivityTitleByKey,
    normalizeActivityTitle,
};
