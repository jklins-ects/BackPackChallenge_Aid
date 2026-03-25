const participantsService = require("../services/participantsService");
const activitiesService = require("../services/activitiesService");
const {
    validateAwardByCode,
    validateAwardByNfc,
} = require("../utils/validateAwardRequest");

async function awardByCode(req, res, next) {
    try {
        const validation = validateAwardByCode(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.message });
        }

        const participant =
            await participantsService.getParticipantByGroupAndCode(
                req.body.groupId.trim(),
                req.body.participantCode.trim(),
            );

        if (!participant) {
            return res.status(404).json({ error: "Participant not found." });
        }

        const updatedParticipant = await activitiesService.awardByCode({
            participant,
            stationId: req.body.stationId.trim(),
            activityKey: req.body.activityKey,
            points: req.body.points,
        });

        res.json({
            message: "Points awarded successfully.",
            participant: updatedParticipant,
        });
    } catch (error) {
        next(error);
    }
}

async function awardByNfc(req, res, next) {
    try {
        const validation = validateAwardByNfc(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.message });
        }

        const nfcId = req.body.nfcId.trim();
        const participant =
            await participantsService.getParticipantByNfcId(nfcId);

        const result = await activitiesService.awardByNfc({
            participant,
            nfcId,
            stationId: req.body.stationId.trim(),
            activityKey: req.body.activityKey,
            points: req.body.points,
        });

        if (result.mode === "pending") {
            return res.json({
                message: "NFC not linked yet. Event stored as pending.",
                status: "pending",
                pendingEvent: result.pendingEvent,
            });
        }

        res.json({
            message: "Points awarded successfully.",
            status: "resolved",
            participant: result.participant,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    awardByCode,
    awardByNfc,
};
