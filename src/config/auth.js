const { ConfidentialClientApplication } = require("@azure/msal-node");

function parseList(rawValue) {
    return String(rawValue || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function getStationApiKeys() {
    return parseList(process.env.STATION_API_KEYS);
}

function getAdminAllowedEmails() {
    return parseList(process.env.ADMIN_ALLOWED_EMAILS).map((value) =>
        value.toLowerCase(),
    );
}

function getAdminAllowedDomains() {
    return parseList(process.env.ADMIN_ALLOWED_DOMAINS).map((value) =>
        value.toLowerCase(),
    );
}

function isAzureAuthConfigured() {
    return Boolean(
        process.env.AZURE_CLIENT_ID &&
            process.env.AZURE_CLIENT_SECRET &&
            process.env.AZURE_TENANT_ID &&
            process.env.AZURE_REDIRECT_URI,
    );
}

function getAuthority() {
    const host = String(process.env.AZURE_AUTHORITY_HOST || "https://login.microsoftonline.com").replace(
        /\/+$/,
        "",
    );
    const tenantId = String(process.env.AZURE_TENANT_ID || "").trim();
    return `${host}/${tenantId}`;
}

function getMsalClient() {
    if (!isAzureAuthConfigured()) {
        return null;
    }

    return new ConfidentialClientApplication({
        auth: {
            clientId: process.env.AZURE_CLIENT_ID,
            clientSecret: process.env.AZURE_CLIENT_SECRET,
            authority: getAuthority(),
        },
    });
}

function getPostLogoutRedirectUri() {
    return (
        String(process.env.AZURE_POST_LOGOUT_REDIRECT_URI || "").trim() ||
        String(process.env.PUBLIC_API_URL || "").trim() ||
        ""
    );
}

module.exports = {
    getAdminAllowedDomains,
    getAdminAllowedEmails,
    getAuthority,
    getMsalClient,
    getPostLogoutRedirectUri,
    getStationApiKeys,
    isAzureAuthConfigured,
};
