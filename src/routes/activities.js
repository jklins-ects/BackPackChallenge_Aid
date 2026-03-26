const express = require("express");
const controller = require("../controllers/activitiesController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Activities
 *   description: Activity scoring endpoints
 */

/**
 * @swagger
 * /api/activities/metadata:
 *   get:
 *     summary: Get activity keys and friendly titles
 *     tags: [Activities]
 *     responses:
 *       200:
 *         description: Activity metadata
 */
router.get("/metadata", controller.getMetadata);

/**
 * @swagger
 * /api/activities/award-by-code:
 *   post:
 *     summary: Award points using groupId and participantCode
 *     tags: [Activities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [groupId, participantCode, activityKey, points, stationId]
 *             properties:
 *               groupId:
 *                 type: string
 *                 example: group-101
 *               participantCode:
 *                 type: string
 *                 example: A7K2
 *               activityKey:
 *                 type: string
 *                 example: activity3
 *               points:
 *                 type: number
 *                 example: 5
 *               stationId:
 *                 type: string
 *                 example: station-3
 *     responses:
 *       200:
 *         description: Points awarded
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Participant not found
 */
router.post("/award-by-code", controller.awardByCode);

/**
 * @swagger
 * /api/activities/award-by-nfc:
 *   post:
 *     summary: Award points using NFC id
 *     tags: [Activities]
 *     description: If the NFC is not linked yet, the event is stored as pending.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nfcId, activityKey, points, stationId]
 *             properties:
 *               nfcId:
 *                 type: string
 *                 example: 04AABBCCDD
 *               activityKey:
 *                 type: string
 *                 example: activity2
 *               points:
 *                 type: number
 *                 example: 10
 *               stationId:
 *                 type: string
 *                 example: station-2
 *     responses:
 *       200:
 *         description: Points awarded or stored as pending
 *       400:
 *         description: Invalid request
 */
router.post("/award-by-nfc", controller.awardByNfc);

module.exports = router;
