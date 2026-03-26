const crypto = require("crypto");
const {
    getAdminAllowedDomains,
    getAdminAllowedEmails,
    getStationApiKeys,
    isAzureAuthConfigured,
} = require("../config/auth");

function getSessionUser(req) {
    return req.session?.auth?.user || null;
}

function getUserEmail(user) {
    if (!user || typeof user !== "object") {
        return "";
    }

    return String(
        user.email || user.preferred_username || user.upn || "",
    ).toLowerCase();
}

function isAuthorizedAdminUser(user) {
    if (!user) {
        return false;
    }

    const allowedEmails = getAdminAllowedEmails();
    const allowedDomains = getAdminAllowedDomains();
    const email = getUserEmail(user);

    if (!allowedEmails.length && !allowedDomains.length) {
        return true;
    }

    if (allowedEmails.includes(email)) {
        return true;
    }

    const domain = email.includes("@") ? email.split("@")[1] : "";
    return Boolean(domain && allowedDomains.includes(domain));
}

function hasAdminSession(req) {
    const user = getSessionUser(req);
    return Boolean(req.session?.auth?.isAuthenticated && isAuthorizedAdminUser(user));
}

function extractStationKey(req) {
    const headerKey =
        req.get("x-station-key") ||
        req.get("x-api-key") ||
        "";
    const authHeader = req.get("authorization") || "";

    if (headerKey.trim()) {
        return headerKey.trim();
    }

    const bearerPrefix = "bearer ";
    if (authHeader.toLowerCase().startsWith(bearerPrefix)) {
        return authHeader.slice(bearerPrefix.length).trim();
    }

    return "";
}

function hasValidStationKey(req) {
    const providedKey = extractStationKey(req);
    const allowedKeys = getStationApiKeys();

    if (!providedKey || !allowedKeys.length) {
        return false;
    }

    return allowedKeys.includes(providedKey);
}

function requireWebAuth(req, res, next) {
    if (!isAzureAuthConfigured()) {
        return res.status(503).send(
            "Microsoft sign-in is not configured yet. Set the Azure authentication environment variables.",
        );
    }

    if (hasAdminSession(req)) {
        return next();
    }

    const returnTo = encodeURIComponent(req.originalUrl || "/");
    return res.redirect(`/auth/signin?returnTo=${returnTo}`);
}

function requireApiAccess(req, res, next) {
    if (hasAdminSession(req) || hasValidStationKey(req)) {
        return next();
    }

    return res.status(401).json({
        error: "Authentication is required for this endpoint.",
    });
}

function ensureAuthorizedAdminOrThrow(req) {
    if (!hasAdminSession(req)) {
        const error = new Error("Signed-in user is not authorized for admin access.");
        error.statusCode = 403;
        throw error;
    }
}

function createOauthState() {
    return crypto.randomBytes(24).toString("hex");
}

module.exports = {
    createOauthState,
    ensureAuthorizedAdminOrThrow,
    getSessionUser,
    hasAdminSession,
    hasValidStationKey,
    isAuthorizedAdminUser,
    requireApiAccess,
    requireWebAuth,
};
