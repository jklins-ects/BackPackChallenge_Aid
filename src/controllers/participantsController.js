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

function buildPublicStatsLookupUrl(req, groupId, participantCode) {
    const configuredBaseUrl = normalizePublicBaseUrl(
        process.env.PUBLIC_API_URL,
        "https",
    );
    const requestBaseUrl = normalizePublicBaseUrl(
        `${req.protocol}://${req.get("host")}`,
        req.protocol || "https",
    );
    const baseUrl = configuredBaseUrl || requestBaseUrl;
    const params = new URLSearchParams({
        gid: String(groupId || "").trim(),
        pid: String(participantCode || "").trim(),
    });

    return `${baseUrl}/participants?${params.toString()}`;
}

function calculateTotalScore(stats) {
    return Object.values(stats || {}).reduce((sum, value) => {
        return sum + (typeof value === "number" ? value : 0);
    }, 0);
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

async function redirectPublicStatsByQuery(req, res, next) {
    try {
        const groupId = String(req.query.gid || "").trim();
        const participantCode = String(req.query.pid || "").trim();

        if (!groupId || !participantCode) {
            return res
                .status(400)
                .send("Both gid and pid query parameters are required.");
        }

        const participant = await participantsService.getParticipantByGroupAndCode(
            groupId,
            participantCode,
        );

        if (!participant) {
            return res.status(404).send("Participant not found.");
        }

        return res.redirect(`/participants/${participant._id}/stats`);
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

                        .scoreboard-link {
                            margin-top: 20px;
                        }

                        .scoreboard-link a {
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            text-decoration: none;
                            color: #fff;
                            background: var(--accent);
                            padding: 12px 16px;
                            border-radius: 999px;
                            font-weight: 700;
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
                    </style>
                </head>
                <body>
                    <div class="page">
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
                            <div class="scoreboard-link">
                                <a href="/scoreboard">View Scoreboard</a>
                            </div>
                        </section>
                    </div>
                </body>
            </html>
        `);
    } catch (error) {
        next(error);
    }
}

async function getPublicScoreboardData(req, res, next) {
    try {
        const requestedPage = Number.parseInt(String(req.query.page || "1"), 10);
        const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
        const pageSize = 50;
        const groupIdFilter = String(req.query.groupId || "").trim();
        const search = String(req.query.search || "").trim().toLowerCase();

        const [participants, groupIds] = await Promise.all([
            participantsService.getAllParticipants(),
            participantsService.getAllGroupIds(),
        ]);

        const visibleActivities = getVisibleActivityMetadata();
        const titleByKey = getActivityTitleByKey();

        const filtered = participants
            .filter((participant) => {
                if (groupIdFilter && participant.groupId !== groupIdFilter) {
                    return false;
                }

                if (!search) {
                    return true;
                }

                const fullName =
                    `${participant.firstName || ""} ${participant.lastName || ""}`.trim().toLowerCase();
                const participantCode = String(participant.participantCode || "").toLowerCase();
                const mongoId = String(participant._id || "").toLowerCase();

                return (
                    fullName.includes(search) ||
                    participantCode.includes(search) ||
                    mongoId.includes(search)
                );
            })
            .map((participant) => {
                const stats = participant.stats || {};
                return {
                    id: String(participant._id),
                    groupId: participant.groupId || "",
                    participantCode: participant.participantCode || "",
                    firstName: participant.firstName || "",
                    lastName: participant.lastName || "",
                    logo: participant.logo || "",
                    totalScore: calculateTotalScore(stats),
                    stats: visibleActivities.map((activity) => ({
                        key: activity.key,
                        title: titleByKey[activity.key] || activity.key,
                        value:
                            typeof stats[activity.key] === "number"
                                ? stats[activity.key]
                                : 0,
                    })),
                };
            })
            .sort((left, right) => {
                if (right.totalScore !== left.totalScore) {
                    return right.totalScore - left.totalScore;
                }

                return `${left.lastName} ${left.firstName}`.localeCompare(
                    `${right.lastName} ${right.firstName}`,
                );
            });

        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const safePage = Math.min(page, totalPages);
        const startIndex = (safePage - 1) * pageSize;
        const items = filtered.slice(startIndex, startIndex + pageSize);

        res.json({
            page: safePage,
            pageSize,
            totalItems,
            totalPages,
            groupIds,
            items,
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

        const normalizedGroupId = req.body.groupId.trim();
        const exists = await participantsService.groupExists(normalizedGroupId);
        if (exists) {
            return res.status(409).json({
                error: `Group ${normalizedGroupId} already exists.`,
            });
        }

        const createdParticipants =
            await participantsService.bulkCreateParticipants(
                normalizedGroupId,
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

async function bulkCreateGroups(req, res, next) {
    try {
        const { groupPrefix, groupCount, participantsPerGroup, startIndex = 1 } =
            req.body || {};

        if (typeof groupPrefix !== "string" || groupPrefix.trim() === "") {
            return res.status(400).json({ error: "groupPrefix is required." });
        }

        if (!Number.isInteger(groupCount) || groupCount <= 0 || groupCount > 100) {
            return res
                .status(400)
                .json({ error: "groupCount must be a positive integer up to 100." });
        }

        if (
            !Number.isInteger(participantsPerGroup) ||
            participantsPerGroup <= 0 ||
            participantsPerGroup > 500
        ) {
            return res.status(400).json({
                error: "participantsPerGroup must be a positive integer up to 500.",
            });
        }

        if (!Number.isInteger(startIndex) || startIndex <= 0) {
            return res
                .status(400)
                .json({ error: "startIndex must be a positive integer." });
        }

        const totalParticipants = groupCount * participantsPerGroup;
        if (totalParticipants > 5000) {
            return res.status(400).json({
                error: "Requested group generation is too large.",
            });
        }

        const normalizedPrefix = groupPrefix.trim();
        const width = Math.max(
            3,
            String(startIndex + groupCount - 1).length,
        );
        const groupIds = Array.from({ length: groupCount }, (_, index) => {
            const number = String(startIndex + index).padStart(width, "0");
            return `${normalizedPrefix}${number}`;
        });

        const existingChecks = await Promise.all(
            groupIds.map((groupId) => participantsService.groupExists(groupId)),
        );
        const conflictingGroups = groupIds.filter(
            (_, index) => existingChecks[index],
        );

        if (conflictingGroups.length) {
            return res.status(409).json({
                error: "One or more generated groups already exist.",
                conflictingGroups,
            });
        }

        const createdGroups = [];
        for (const groupId of groupIds) {
            const participants = await participantsService.bulkCreateParticipants(
                groupId,
                participantsPerGroup,
            );
            createdGroups.push({
                groupId,
                participantCount: participants.length,
                participants,
            });
        }

        res.status(201).json({
            message: "Groups created successfully.",
            groupPrefix: normalizedPrefix,
            groupCount: createdGroups.length,
            participantsPerGroup,
            groups: createdGroups,
        });
    } catch (error) {
        next(error);
    }
}

async function renameGroup(req, res, next) {
    try {
        const currentGroupId = String(req.params.groupId || "").trim();
        const newGroupId = String(req.body?.newGroupId || "").trim();

        if (!currentGroupId) {
            return res.status(400).json({ error: "groupId is required." });
        }

        if (!newGroupId) {
            return res.status(400).json({ error: "newGroupId is required." });
        }

        if (currentGroupId === newGroupId) {
            const participants =
                await participantsService.getParticipantsByGroupId(currentGroupId);
            return res.json({
                message: "Group ID is unchanged.",
                groupId: currentGroupId,
                participants,
            });
        }

        const targetExists = await participantsService.groupExists(newGroupId);
        if (targetExists) {
            return res.status(409).json({
                error: `Group ${newGroupId} already exists.`,
            });
        }

        const renamedParticipants = await participantsService.renameGroupId(
            currentGroupId,
            newGroupId,
        );

        if (!renamedParticipants) {
            return res.status(404).json({ error: "Group not found." });
        }

        res.json({
            message: `Renamed ${currentGroupId} to ${newGroupId}.`,
            groupId: newGroupId,
            participants: renamedParticipants,
        });
    } catch (error) {
        next(error);
    }
}

async function createParticipantInExistingGroup(req, res, next) {
    try {
        const groupId = String(req.params.groupId || "").trim();

        if (!groupId) {
            return res.status(400).json({ error: "groupId is required." });
        }

        const exists = await participantsService.groupExists(groupId);
        if (!exists) {
            return res.status(404).json({ error: "Group not found." });
        }

        const participant = await participantsService.createParticipantInGroup(
            groupId,
            {
                firstName: req.body?.firstName || "",
                lastName: req.body?.lastName || "",
            },
        );

        res.status(201).json({
            message: "Participant added successfully.",
            participant,
        });
    } catch (error) {
        next(error);
    }
}

async function importParticipants(req, res, next) {
    try {
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;

        if (!rows || !rows.length) {
            return res.status(400).json({ error: "rows array is required." });
        }

        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            const groupId = String(row?.groupId || "").trim();

            if (!groupId) {
                return res.status(400).json({
                    error: `Row ${index + 1} is missing groupId.`,
                });
            }
        }

        const participants = await participantsService.importParticipants(rows);

        res.status(201).json({
            message: `Imported ${participants.length} participant(s).`,
            count: participants.length,
            participants,
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        next(error);
    }
}

async function deleteGroup(req, res, next) {
    try {
        const groupId = String(req.params.groupId || "").trim();

        if (!groupId) {
            return res.status(400).json({ error: "groupId is required." });
        }

        const deletedParticipants =
            await participantsService.deleteGroupById(groupId);

        if (!deletedParticipants) {
            return res.status(404).json({ error: "Group not found." });
        }

        res.json({
            message: `Deleted ${groupId}.`,
            groupId,
            deletedCount: deletedParticipants.length,
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
                const profileLink = buildPublicStatsLookupUrl(
                    req,
                    participant.groupId,
                    participant.participantCode,
                );

                return `
        <div class="card">
          <div class="group">${participant.groupId}</div>
          <div class="code">${participant.participantCode}</div>
          <div class="name">${name || "&nbsp;"}</div>
          <div class="link">${profileLink}</div>
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
          .link {
            margin-top: 0.08in;
            font-size: 7pt;
            line-height: 1.25;
            word-break: break-all;
            color: #444;
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
    bulkCreateGroups,
    bulkCreateParticipants,
    createParticipant,
    createParticipantInExistingGroup,
    importParticipants,
    deleteGroup,
    getAllParticipants,
    getAllGroupIds,
    getParticipantById,
    getParticipantByCode,
    getParticipantByNfcId,
    getParticipantByGroupAndCode,
    getParticipantsByGroupId,
    getParticipantPublicLink,
    redirectPublicStatsByQuery,
    getPublicScoreboardData,
    getPublicStatsPage,
    getPrintableGroupCodes,
    linkNfcIdToParticipant,
    renameGroup,
    updateParticipantById,
    patchParticipantById,
    deleteParticipantById,
};
