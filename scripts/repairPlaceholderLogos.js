require("dotenv").config();

const { MongoClient } = require("mongodb");
const { createCanvas, loadImage } = require("canvas");
const {
    generateBase64Logo,
    isGeneratedPlaceholderLogo,
} = require("../src/utils/generateLogo");

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME || "participants";

const shouldWrite = process.argv.includes("--write");

function decodeDataUrl(dataUrl = "") {
    const raw = String(dataUrl || "").trim();
    const parts = raw.split(",", 2);
    if (parts.length < 2) {
        return { mimeType: "", buffer: null };
    }

    const header = parts[0];
    const body = parts[1];
    const mimeMatch = header.match(/^data:([^;]+);base64$/i);
    if (!mimeMatch) {
        return { mimeType: "", buffer: null };
    }

    try {
        return {
            mimeType: mimeMatch[1].toLowerCase(),
            buffer: Buffer.from(body, "base64"),
        };
    } catch (error) {
        return { mimeType: "", buffer: null };
    }
}

function pixelsRoughlyMatch(left, right, tolerance = 6) {
    return (
        Math.abs(left[0] - right[0]) <= tolerance &&
        Math.abs(left[1] - right[1]) <= tolerance &&
        Math.abs(left[2] - right[2]) <= tolerance &&
        Math.abs(left[3] - right[3]) <= tolerance
    );
}

function pixelIsOpaque(pixel) {
    return pixel[3] >= 250;
}

function pixelIsNotNearWhite(pixel) {
    return pixel[0] < 245 || pixel[1] < 245 || pixel[2] < 245;
}

async function isLegacyGeneratedPlaceholderLogo(logo = "") {
    const normalized = String(logo || "").trim();
    if (!normalized.startsWith("data:image/png;base64,")) {
        return false;
    }

    const { mimeType, buffer } = decodeDataUrl(normalized);
    if (mimeType !== "image/png" || !buffer) {
        return false;
    }

    try {
        const image = await loadImage(buffer);
        if (image.width !== 200 || image.height !== 200) {
            return false;
        }

        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);

        const sample = (x, y) =>
            Array.from(ctx.getImageData(x, y, 1, 1).data);

        const corners = [
            sample(10, 10),
            sample(189, 10),
            sample(10, 189),
            sample(189, 189),
        ];

        if (
            corners.some(
                (pixel) =>
                    !pixelIsOpaque(pixel) || !pixelIsNotNearWhite(pixel),
            )
        ) {
            return false;
        }

        if (
            !pixelsRoughlyMatch(corners[0], corners[1]) ||
            !pixelsRoughlyMatch(corners[0], corners[2]) ||
            !pixelsRoughlyMatch(corners[0], corners[3])
        ) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

async function isRepairCandidate(participant) {
    const logo = String(participant?.logo || "").trim();
    if (!logo) {
        return false;
    }

    if (isGeneratedPlaceholderLogo(logo)) {
        return true;
    }

    return isLegacyGeneratedPlaceholderLogo(logo);
}

function buildReplacementLogo(participant) {
    return generateBase64Logo(
        participant?.firstName || "",
        participant?.lastName || "",
        participant?.participantCode || "",
    );
}

async function main() {
    if (!uri || !dbName || !collectionName) {
        throw new Error("Missing required Mongo environment variables.");
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const collection = client.db(dbName).collection(collectionName);
        const participants = await collection.find({}).toArray();

        let checkedCount = 0;
        let candidateCount = 0;
        let updatedCount = 0;

        for (const participant of participants) {
            checkedCount += 1;
            const candidate = await isRepairCandidate(participant);
            if (!candidate) {
                continue;
            }

            candidateCount += 1;
            const replacementLogo = buildReplacementLogo(participant);

            console.log(
                `${shouldWrite ? "Repairing" : "Would repair"} ${participant.groupId}/${participant.participantCode} (${participant._id})`,
            );

            if (!shouldWrite) {
                continue;
            }

            await collection.updateOne(
                { _id: participant._id },
                {
                    $set: {
                        logo: replacementLogo,
                        updatedAt: new Date(),
                    },
                },
            );
            updatedCount += 1;
        }

        console.log("");
        console.log(`Checked: ${checkedCount}`);
        console.log(`Candidates: ${candidateCount}`);
        if (shouldWrite) {
            console.log(`Updated: ${updatedCount}`);
        } else {
            console.log("Dry run only. Re-run with --write to apply changes.");
        }
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error("repairPlaceholderLogos failed:", error);
    process.exitCode = 1;
});
