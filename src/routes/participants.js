const express = require("express");
const controller = require("../controllers/participantsController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Participants
 *   description: Participant management endpoints
 */

/**
 * @swagger
 * /api/participants/bulk-create:
 *   post:
 *     summary: Bulk create participant shells for a group
 *     tags: [Participants]
 *     description: Creates multiple participant shell records with generated participant codes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [groupId, count]
 *             properties:
 *               groupId:
 *                 type: string
 *                 example: group-101
 *               count:
 *                 type: integer
 *                 example: 30
 *     responses:
 *       201:
 *         description: Participants created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Participants created successfully.
 *                 count:
 *                   type: integer
 *                   example: 30
 *                 participants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/bulk-create", controller.bulkCreateParticipants);
router.post("/bulk-create-groups", controller.bulkCreateGroups);

/**
 * @swagger
 * /api/participants:
 *   post:
 *     summary: Create a participant
 *     tags: [Participants]
 *     description: Creates a participant record. Only groupId and participantCode are required. Other fields are defaulted by the backend.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParticipantInput'
 *           examples:
 *             minimal:
 *               summary: Minimal participant
 *               value:
 *                 groupId: group-101
 *                 participantCode: A7K2
 *             full:
 *               summary: Full participant
 *               value:
 *                 groupId: group-101
 *                 participantCode: A7K2
 *                 nfcId: 04AABBCCDD
 *                 firstName: Jason
 *                 lastName: Smith
 *                 logo: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA
 *                 stats:
 *                   activity1: 1
 *                   activity2: 2
 *                   activity3: 3
 *                   activity4: 4
 *                   activity5: 5
 *                   activity6: 6
 *                   activity7: 7
 *                   activity8: 8
 *                   activity9: 9
 *     responses:
 *       201:
 *         description: Participant created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Invalid participant data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", controller.createParticipant);

/**
 * @swagger
 * /api/participants:
 *   get:
 *     summary: Get all participants
 *     tags: [Participants]
 *     responses:
 *       200:
 *         description: A list of participants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Participant'
 */
router.get("/", controller.getAllParticipants);

/**
 * @swagger
 * /api/participants/groups:
 *   get:
 *     summary: Get all unique group IDs
 *     tags: [Participants]
 *     description: Returns a sorted list of all unique groupId values from participants.
 *     responses:
 *       200:
 *         description: List of group IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example:
 *                 - group-101
 *                 - group-202
 *                 - group-303
 *       500:
 *         description: Server error while fetching group IDs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/groups", controller.getAllGroupIds);

/**
 * @swagger
 * /api/participants/code/{participantCode}:
 *   get:
 *     summary: Get a participant by participant code
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: participantCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Human-friendly participant code
 *     responses:
 *       200:
 *         description: Participant found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Participant'
 *       404:
 *         description: Participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/code/:participantCode", controller.getParticipantByCode);

/**
 * @swagger
 * /api/participants/nfc/{nfcId}:
 *   get:
 *     summary: Get a participant by NFC id
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: nfcId
 *         required: true
 *         schema:
 *           type: string
 *         description: NFC chip identifier
 *     responses:
 *       200:
 *         description: Participant found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Participant'
 *       404:
 *         description: Participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/nfc/:nfcId", controller.getParticipantByNfcId);

/**
 * @swagger
 * /api/participants/{id}/public-link:
 *   get:
 *     summary: Get the public stats link for a participant
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public stats link
 */
router.get("/:id/public-link", controller.getParticipantPublicLink);

/**
 * @swagger
 * /api/participants/group/{groupId}/print-codes:
 *   get:
 *     summary: Get a printable code sheet for a group
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group identifier
 *     responses:
 *       200:
 *         description: Printable HTML code sheet
 */
router.get("/group/:groupId/print-codes", controller.getPrintableGroupCodes);
router.patch("/group/:groupId", controller.renameGroup);

/**
 * @swagger
 * /api/participants/group/{groupId}/code/{participantCode}:
 *   get:
 *     summary: Get a participant by groupId and participantCode
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group identifier
 *       - in: path
 *         name: participantCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Human-friendly participant code
 *     responses:
 *       200:
 *         description: Participant found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Participant'
 *       404:
 *         description: Participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
    "/group/:groupId/code/:participantCode",
    controller.getParticipantByGroupAndCode,
);

/**
 * @swagger
 * /api/participants/group/{groupId}:
 *   get:
 *     summary: Get participants by groupId
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group identifier
 *     responses:
 *       200:
 *         description: Matching participants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Participant'
 */
router.get("/group/:groupId", controller.getParticipantsByGroupId);

/**
 * @swagger
 * /api/participants/{id}/link-nfc:
 *   patch:
 *     summary: Link an NFC id to a participant
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo document id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nfcId]
 *             properties:
 *               nfcId:
 *                 type: string
 *                 example: 04AABBCCDD
 *     responses:
 *       200:
 *         description: NFC id linked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Invalid participant id or invalid nfcId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/link-nfc", controller.linkNfcIdToParticipant);

/**
 * @swagger
 * /api/participants/{id}:
 *   get:
 *     summary: Get a participant by Mongo id
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo document id
 *     responses:
 *       200:
 *         description: Participant found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Invalid participant id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", controller.getParticipantById);

/**
 * @swagger
 * /api/participants/{id}:
 *   put:
 *     summary: Replace a participant by id
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo document id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParticipantInput'
 *     responses:
 *       200:
 *         description: Participant updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Invalid participant id or invalid participant data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/:id", controller.updateParticipantById);

/**
 * @swagger
 * /api/participants/{id}:
 *   patch:
 *     summary: Partially update a participant by id
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo document id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParticipantPatch'
 *           examples:
 *             updateName:
 *               summary: Update first and last name
 *               value:
 *                 firstName: Jason
 *                 lastName: Smith
 *             updateStats:
 *               summary: Update selected stats
 *               value:
 *                 stats:
 *                   activity1: 5
 *                   activity7: 2
 *             updateLogo:
 *               summary: Update logo
 *               value:
 *                 logo: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA
 *             updateNfc:
 *               summary: Update NFC id
 *               value:
 *                 nfcId: 04AABBCCDD
 *     responses:
 *       200:
 *         description: Participant updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Invalid participant id or invalid patch data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id", controller.patchParticipantById);

/**
 * @swagger
 * /api/participants/{id}:
 *   delete:
 *     summary: Delete a participant by id
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo document id
 *     responses:
 *       200:
 *         description: Participant deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Participant deleted successfully.
 *                 deleted:
 *                   $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Invalid participant id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", controller.deleteParticipantById);

module.exports = router;
