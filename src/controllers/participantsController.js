const { ObjectId } = require("mongodb");
const { isValidParticipant } = require("../utils/validateParticipant");
const {
    isValidParticipantPatch,
} = require("../utils/validateParticipantPatch");
const {
    buildParticipantForInsert,
} = require("../utils/buildParticipantForInsert");
const participantsService = require("../services/participantsService");
const {
    validateBulkCreateParticipants,
} = require("../utils/validateBulkCreateParticipants");

async function createParticipant(req, res, next) {
    try {
        if (!isValidParticipant(req.body)) {
            return res.status(400).json({ error: "Invalid participant data." });
        }

        const participant = buildParticipantForInsert(req.body);
        const created =
            await participantsService.createParticipant(participant);

        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
}

async function getAllParticipants(req, res, next) {
    try {
        const participants = await participantsService.getAllParticipants();
        res.json(participants);
    } catch (error) {
        next(error);
    }
}

async function getAllGroupIds(req, res, next) {
    try {
        const groupIds = await participantsService.getAllGroupIds();
        res.json(groupIds);
    } catch (error) {
        next(error);
    }
}

async function getParticipantById(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid participant id." });
        }

        const participant = await participantsService.getParticipantById(id);

        if (!participant) {
            return res.status(404).json({ error: "Participant not found." });
        }

        res.json(participant);
    } catch (error) {
        next(error);
    }
}

async function getParticipantByCode(req, res, next) {
    try {
        const { participantCode } = req.params;
        const participant =
            await participantsService.getParticipantByCode(participantCode);

        if (!participant) {
            return res.status(404).json({ error: "Participant not found." });
        }

        res.json(participant);
    } catch (error) {
        next(error);
    }
}

async function getParticipantByNfcId(req, res, next) {
    try {
        const { nfcId } = req.params;
        const participant =
            await participantsService.getParticipantByNfcId(nfcId);

        if (!participant) {
            return res.status(404).json({ error: "Participant not found." });
        }

        res.json(participant);
    } catch (error) {
        next(error);
    }
}

async function getParticipantByGroupAndCode(req, res, next) {
    try {
        const { groupId, participantCode } = req.params;

        const participant =
            await participantsService.getParticipantByGroupAndCode(
                groupId,
                participantCode,
            );

        if (!participant) {
            return res.status(404).json({ error: "Participant not found." });
        }

        res.json(participant);
    } catch (error) {
        next(error);
    }
}

async function getParticipantsByGroupId(req, res, next) {
    try {
        const { groupId } = req.params;
        const participants =
            await participantsService.getParticipantsByGroupId(groupId);
        res.json(participants);
    } catch (error) {
        next(error);
    }
}

async function updateParticipantById(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid participant id." });
        }

        if (!isValidParticipant(req.body)) {
            return res.status(400).json({ error: "Invalid participant data." });
        }

        const existing = await participantsService.getParticipantById(id);
        if (!existing) {
            return res.status(404).json({ error: "Participant not found." });
        }

        const participant = {
            ...existing,
            ...req.body,
            groupId: req.body.groupId.trim(),
            participantCode: req.body.participantCode.trim().toUpperCase(),
            firstName: req.body.firstName?.trim?.() || "",
            lastName: req.body.lastName?.trim?.() || "",
            logo:
                typeof req.body.logo === "string"
                    ? req.body.logo
                    : existing.logo,
            stats: req.body.stats || existing.stats,
            createdAt: existing.createdAt,
            updatedAt: new Date(),
        };

        if (req.body.nfcId?.trim?.()) {
            participant.nfcId = req.body.nfcId.trim();
        } else {
            delete participant.nfcId;
        }

        const updated = await participantsService.updateParticipantById(
            id,
            participant,
        );
        res.json(updated);
    } catch (error) {
        next(error);
    }
}

async function patchParticipantById(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid participant id." });
        }

        const validation = isValidParticipantPatch(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.message });
        }

        const updated = await participantsService.patchParticipantById(
            id,
            req.body,
        );

        if (!updated) {
            return res.status(404).json({ error: "Participant not found." });
        }

        res.json(updated);
    } catch (error) {
        next(error);
    }
}

async function deleteParticipantById(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid participant id." });
        }

        const deleted = await participantsService.deleteParticipantById(id);

        if (!deleted) {
            return res.status(404).json({ error: "Participant not found." });
        }

        res.json({
            message: "Participant deleted successfully.",
            deleted,
        });
    } catch (error) {
        next(error);
    }
}

async function linkNfcIdToParticipant(req, res, next) {
    try {
        const { id } = req.params;
        const { nfcId } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid participant id." });
        }

        if (typeof nfcId !== "string" || nfcId.trim() === "") {
            return res.status(400).json({ error: "nfcId is required." });
        }

        const result = await participantsService.linkNfcIdToParticipant(
            id,
            nfcId.trim(),
        );

        if (!result) {
            return res.status(404).json({ error: "Participant not found." });
        }

        res.json({
            message: "NFC linked successfully.",
            resolvedPendingEvents: result.resolvedPendingEvents,
            participant: result.participant,
        });
    } catch (error) {
        next(error);
    }
}

async function bulkCreateParticipants(req, res, next) {
    try {
        const validation = validateBulkCreateParticipants(req.body);

        if (!validation.valid) {
            return res.status(400).json({ error: validation.message });
        }

        const createdParticipants =
            await participantsService.bulkCreateParticipants(
                req.body.groupId.trim(),
                req.body.count,
            );

        res.status(201).json({
            message: "Participants created successfully.",
            count: createdParticipants.length,
            participants: createdParticipants,
        });
    } catch (error) {
        next(error);
    }
}

async function getPrintableGroupCodes(req, res, next) {
    try {
        const { groupId } = req.params;
        const participants =
            await participantsService.getParticipantsByGroupId(groupId);

        const sorted = [...participants].sort((a, b) =>
            a.participantCode.localeCompare(b.participantCode),
        );

        const cardsHtml = sorted
            .map((participant) => {
                const name =
                    `${participant.firstName || ""} ${participant.lastName || ""}`.trim();

                return `
        <div class="card">
          <div class="group">${participant.groupId}</div>
          <div class="code">${participant.participantCode}</div>
          <div class="name">${name || "&nbsp;"}</div>
        </div>
      `;
            })
            .join("");

        res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Participant Codes - ${groupId}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0.5in;
            color: #222;
          }
          h1 {
            margin: 0 0 0.25in 0;
            font-size: 18pt;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 2.4in);
            gap: 0.2in;
          }
          .card {
            border: 1px solid #333;
            border-radius: 8px;
            width: 2.4in;
            min-height: 1.3in;
            padding: 0.15in;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .group {
            font-size: 10pt;
            color: #555;
          }
          .code {
            font-size: 24pt;
            font-weight: bold;
            letter-spacing: 0.06in;
            text-align: center;
            margin: 0.1in 0;
          }
          .name {
            font-size: 10pt;
            text-align: center;
            border-top: 1px solid #ccc;
            padding-top: 0.08in;
            min-height: 0.22in;
          }
          @media print {
            @page { margin: 0.5in; }
          }
        </style>
      </head>
      <body>
        <h1>Participant Codes for ${groupId}</h1>
        <div class="grid">${cardsHtml}</div>
      </body>
      </html>
    `);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    bulkCreateParticipants,
    createParticipant,
    getAllParticipants,
    getAllGroupIds,
    getParticipantById,
    getParticipantByCode,
    getParticipantByNfcId,
    getParticipantByGroupAndCode,
    getParticipantsByGroupId,
    getPrintableGroupCodes,
    linkNfcIdToParticipant,
    updateParticipantById,
    patchParticipantById,
    deleteParticipantById,
};
