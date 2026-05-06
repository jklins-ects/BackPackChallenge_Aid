const COLORS = ["#4A90E2", "#50E3C2", "#F5A623", "#BD10E0", "#7ED321"];

function escapeXml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function pickColor(seed = "") {
    const normalizedSeed = String(seed || "").trim() || "?";
    let hash = 0;

    for (let index = 0; index < normalizedSeed.length; index += 1) {
        hash = (hash * 31 + normalizedSeed.charCodeAt(index)) >>> 0;
    }

    return COLORS[hash % COLORS.length];
}

function buildInitials(firstName = "", lastName = "", participantCode = "") {
    const firstInitial = String(firstName || "").trim().charAt(0).toUpperCase();
    const lastInitial = String(lastName || "").trim().charAt(0).toUpperCase();
    const codeInitial = String(participantCode || "").trim().charAt(0).toUpperCase();

    return `${firstInitial}${lastInitial}`.trim() || codeInitial || "?";
}

function isGeneratedPlaceholderLogo(logo = "") {
    const normalized = String(logo || "").trim();
    if (!normalized.startsWith("data:image/svg+xml")) {
        return false;
    }

    try {
        const encoded = normalized.split(",")[1] || "";
        const decoded = decodeURIComponent(encoded);
        return decoded.includes('data-placeholder-logo="1"');
    } catch (error) {
        return false;
    }
}

function generateBase64Logo(firstName = "", lastName = "", participantCode = "") {
    const initials = buildInitials(firstName, lastName, participantCode);
    const fillColor = pickColor(`${participantCode}${firstName}${lastName}`);

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="${escapeXml(initials)}" data-placeholder-logo="1">
            <circle cx="100" cy="100" r="100" fill="${fillColor}" />
            <text
                x="100"
                y="100"
                text-anchor="middle"
                dominant-baseline="middle"
                fill="#FFFFFF"
                font-family="Arial, Helvetica, sans-serif"
                font-size="82"
                font-weight="700"
                letter-spacing="3"
            >${escapeXml(initials)}</text>
        </svg>
    `.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

module.exports = {
    buildInitials,
    generateBase64Logo,
    isGeneratedPlaceholderLogo,
};
