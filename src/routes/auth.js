const express = require("express");
const {
    getAuthority,
    getMsalClient,
    getPostLogoutRedirectUri,
    isAzureAuthConfigured,
} = require("../config/auth");
const {
    createOauthState,
    isAuthorizedAdminUser,
} = require("../middleware/auth");

const router = express.Router();

function getRedirectUri() {
    return String(process.env.AZURE_REDIRECT_URI || "").trim();
}

function extractUserFromClaims(claims) {
    const preferredUsername = claims?.preferred_username || claims?.upn || "";
    const emailFromArray = Array.isArray(claims?.emails) ? claims.emails[0] : "";
    const email = preferredUsername || emailFromArray || "";

    return {
        name: claims?.name || email || "Signed-in user",
        email,
        preferred_username: preferredUsername,
        oid: claims?.oid || claims?.sub || "",
        claims: claims || {},
    };
}

router.get("/signin", async (req, res, next) => {
    try {
        if (!isAzureAuthConfigured()) {
            return res
                .status(503)
                .send("Microsoft sign-in is not configured yet.");
        }

        const msalClient = getMsalClient();
        const state = createOauthState();
        const returnTo = String(req.query.returnTo || "/").trim() || "/";

        req.session.authFlow = {
            oauthState: state,
            returnTo,
        };

        const authCodeUrl = await msalClient.getAuthCodeUrl({
            scopes: ["openid", "profile", "email"],
            redirectUri: getRedirectUri(),
            responseMode: "query",
            prompt: "select_account",
            state,
        });

        return res.redirect(authCodeUrl);
    } catch (error) {
        return next(error);
    }
});

router.get("/redirect", async (req, res, next) => {
    try {
        if (!isAzureAuthConfigured()) {
            return res
                .status(503)
                .send("Microsoft sign-in is not configured yet.");
        }

        const flow = req.session.authFlow || {};
        const expectedState = flow.oauthState;
        const returnTo = flow.returnTo || "/";
        const receivedState = String(req.query.state || "");
        const code = String(req.query.code || "");

        if (!expectedState || receivedState !== expectedState || !code) {
            return res.status(400).send("Invalid Microsoft sign-in response.");
        }

        const msalClient = getMsalClient();
        const tokenResponse = await msalClient.acquireTokenByCode({
            code,
            scopes: ["openid", "profile", "email"],
            redirectUri: getRedirectUri(),
        });

        const user = extractUserFromClaims(tokenResponse?.idTokenClaims);
        if (!isAuthorizedAdminUser(user)) {
            req.session.auth = null;
            req.session.authFlow = null;
            return res
                .status(403)
                .send("Signed-in account is not authorized for admin access.");
        }

        req.session.auth = {
            isAuthenticated: true,
            user,
        };
        req.session.authFlow = null;

        return req.session.save(() => {
            res.redirect(returnTo);
        });
    } catch (error) {
        return next(error);
    }
});

router.get("/signout", (req, res) => {
    const postLogoutRedirectUri = getPostLogoutRedirectUri();
    const logoutUrl = new URL(`${getAuthority()}/oauth2/v2.0/logout`);
    if (postLogoutRedirectUri) {
        logoutUrl.searchParams.set(
            "post_logout_redirect_uri",
            postLogoutRedirectUri,
        );
    }

    req.session.destroy(() => {
        res.redirect(logoutUrl.toString());
    });
});

module.exports = router;
