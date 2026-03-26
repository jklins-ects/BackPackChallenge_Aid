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
const {
    getVisibleActivityMetadata,
    getActivityTitleByKey,
} = require("../utils/activityMetadata");

function normalizePublicBaseUrl(rawValue, fallbackProtocol = "https") {
    const trimmed = String(rawValue || "").trim().replace(/\/+$/, "");

    if (!trimmed) {
        return "";
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return `${fallbackProtocol}://${trimmed}`;
}

function buildPublicStatsUrl(req, participantId) {
    const configuredBaseUrl = normalizePublicBaseUrl(
        process.env.PUBLIC_API_URL,
        "https",
    );
    const requestBaseUrl = normalizePublicBaseUrl(
        `${req.protocol}://${req.get("host")}`,
        req.protocol || "https",
    );
    const baseUrl = configuredBaseUrl || requestBaseUrl;

    return `${baseUrl}/participants/${participantId}/stats`;
}

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
            publicLink: buildPublicStatsUrl(req, String(result.participant._id)),
            participant: result.participant,
        });
    } catch (error) {
        next(error);
    }
}

async function getParticipantPublicLink(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid participant id." });
        }

        const participant = await participantsService.getParticipantById(id);
        if (!participant) {
            return res.status(404).json({ error: "Participant not found." });
        }

        res.json({
            participantId: String(participant._id),
            publicLink: buildPublicStatsUrl(req, String(participant._id)),
        });
    } catch (error) {
        next(error);
    }
}

async function getPublicStatsPage(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send("Invalid participant id.");
        }

        const participant = await participantsService.getParticipantById(id);
        if (!participant) {
            return res.status(404).send("Participant not found.");
        }

        const activityMetadata = getVisibleActivityMetadata();
        const titleByKey = getActivityTitleByKey();
        const fullName =
            `${participant.firstName || ""} ${participant.lastName || ""}`.trim() ||
            "Participant";

        const statsMarkup = activityMetadata
            .map((activity) => {
                const value =
                    typeof participant.stats?.[activity.key] === "number"
                        ? participant.stats[activity.key]
                        : 0;

                return `
                    <div class="stat-row">
                        <span class="stat-title">${titleByKey[activity.key] || activity.key}</span>
                        <span class="stat-value">${value}</span>
                    </div>
                `;
            })
            .join("");

        res.send(`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>${fullName} Stats</title>
                    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                    <style>
                        :root {
                            --bg: #eef5f1;
                            --card: #ffffff;
                            --text: #173129;
                            --muted: #5f756d;
                            --accent: #1f7a5c;
                            --accent-dark: #15553f;
                            --border: #d4e2db;
                            --surface: rgba(255, 255, 255, 0.9);
                            --shadow: 0 18px 40px rgba(23, 49, 41, 0.12);
                        }

                        * { box-sizing: border-box; }

                        body {
                            margin: 0;
                            font-family: Arial, Helvetica, sans-serif;
                            background: radial-gradient(circle at top, #f9fcfb 0%, #edf5f1 42%, #e3efe9 100%);
                            color: var(--text);
                            padding: 24px 16px 40px;
                        }

                        .page {
                            width: min(1040px, 100%);
                            margin: 0 auto;
                        }

                        .navbar {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 16px;
                            margin-bottom: 24px;
                            padding: 16px 18px;
                            background: var(--surface);
                            border: 1px solid var(--border);
                            border-radius: 18px;
                            box-shadow: 0 10px 24px rgba(24, 50, 43, 0.08);
                        }

                        .brand-block h1 {
                            margin: 0 0 4px;
                            font-size: 1.2rem;
                        }

                        .brand-block p {
                            margin: 0;
                            color: var(--muted);
                            font-size: 0.92rem;
                        }

                        .nav-links {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 10px;
                        }

                        .nav-links a {
                            text-decoration: none;
                            color: var(--accent-dark);
                            background: #edf6f1;
                            padding: 10px 14px;
                            border-radius: 999px;
                            font-weight: 700;
                        }

                        .hero, .stats-card {
                            background: var(--card);
                            border: 1px solid var(--border);
                            border-radius: 22px;
                            padding: 24px;
                            box-shadow: var(--shadow);
                        }

                        .hero {
                            margin-bottom: 18px;
                            text-align: center;
                        }

                        .logo {
                            width: 120px;
                            height: 120px;
                            margin: 0 auto 16px;
                            border-radius: 50%;
                            overflow: hidden;
                            background: #f3f7f5;
                            border: 2px solid var(--border);
                        }

                        .logo img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                            display: block;
                        }

                        h1 {
                            margin: 0 0 8px;
                            font-size: 2rem;
                        }

                        .meta {
                            color: var(--muted);
                            line-height: 1.5;
                        }

                        .stats-card h2 {
                            margin: 0 0 16px;
                        }

                        .stat-row {
                            display: flex;
                            justify-content: space-between;
                            gap: 16px;
                            padding: 12px 0;
                            border-top: 1px solid var(--border);
                        }

                        .stat-row:first-of-type {
                            border-top: 0;
                            padding-top: 0;
                        }

                        .stat-title {
                            color: var(--muted);
                        }

                        .stat-value {
                            color: var(--accent);
                            font-weight: 700;
                            font-size: 1.1rem;
                        }

                        @media (max-width: 640px) {
                            .navbar {
                                flex-direction: column;
                                align-items: flex-start;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <nav class="navbar" aria-label="Main navigation">
                            <div class="brand-block">
                                <h1>ECTS Backpack Challenge 2026</h1>
                                <p>Participant stats</p>
                            </div>
                            <div class="nav-links">
                                <a href="/">Home</a>
                                <a href="/assign-name">Assign Name</a>
                                <a href="/laser">Group Print View</a>
                                <a href="/create-logo">Logo Creator</a>
                            </div>
                        </nav>
                        <section class="hero">
                            <div class="logo">
                                ${
                                    participant.logo
                                        ? `<img src="${participant.logo}" alt="${fullName} logo" />`
                                        : ""
                                }
                            </div>
                            <h1>${fullName}</h1>
                            <div class="meta">
                                Group: ${participant.groupId || "-"}<br />
                                Participant Code: ${participant.participantCode || "-"}
                            </div>
                        </section>
                        <section class="stats-card">
                            <h2>Current Stats</h2>
                            ${statsMarkup}
                        </section>
                    </div>
                </body>
            </html>
        `);
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
          .site-title {
            margin: 0 0 0.1in 0;
            font-size: 11pt;
            color: #1e7b5c;
            letter-spacing: 0.04em;
            text-transform: uppercase;
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
        <div class="site-title">ECTS Backpack Challenge 2026</div>
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
    getParticipantPublicLink,
    getPublicStatsPage,
    getPrintableGroupCodes,
    linkNfcIdToParticipant,
    updateParticipantById,
    patchParticipantById,
    deleteParticipantById,
};
