const express = require("express");
const session = require("express-session");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger/swagger");
const authRouter = require("./routes/auth");
const participantsRouter = require("./routes/participants");
const activitiesRouter = require("./routes/activities");
const participantsController = require("./controllers/participantsController");
const { requireApiAccess, requireWebAuth } = require("./middleware/auth");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "10mb" }));

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "replace-this-session-secret-in-production",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 8,
        },
    }),
);

app.get("/favicon.svg", (req, res) => {
    res.sendFile(path.join(__dirname, "public") + "/favicon.svg");
});

app.use("/auth", authRouter);

app.get("/participants/:id/stats", participantsController.getPublicStatsPage);
app.get("/", (req, res) => {
    return requireWebAuth(req, res, () =>
        res.sendFile(path.join(__dirname, "public") + "/index.html"),
    );
});

app.get("/laser", (req, res) => {
    return requireWebAuth(req, res, () =>
        res.sendFile(path.join(__dirname, "public") + "/group-print.html"),
    );
});

app.get("/assign-name", (req, res) => {
    return requireWebAuth(req, res, () =>
        res.sendFile(path.join(__dirname, "public") + "/assign-name.html"),
    );
});

app.get("/create-logo", (req, res) => {
    return requireWebAuth(req, res, () =>
        res.sendFile(path.join(__dirname, "public") + "/logo-creator.html"),
    );
});

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.use(
    "/api-docs",
    requireWebAuth,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec),
);

app.get("/api-docs.json", requireWebAuth, (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

app.use("/api/participants", requireApiAccess, participantsRouter);
app.use("/api/activities", requireApiAccess, activitiesRouter);

app.get("/signed-out", (req, res) => {
    res.send(`
        <!doctype html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Signed Out</title>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <style>
                    body {
                        margin: 0;
                        font-family: Arial, Helvetica, sans-serif;
                        background: radial-gradient(circle at top, #f9fcfb 0%, #edf5f1 42%, #e3efe9 100%);
                        color: #173129;
                        padding: 32px 16px;
                    }
                    .card {
                        width: min(640px, 100%);
                        margin: 0 auto;
                        background: #fff;
                        border: 1px solid #d4e2db;
                        border-radius: 22px;
                        box-shadow: 0 18px 40px rgba(23, 49, 41, 0.12);
                        padding: 28px;
                    }
                    a {
                        color: #15553f;
                        font-weight: 700;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Signed Out</h1>
                    <p>Your admin session has ended.</p>
                    <p><a href="/auth/signin">Sign in again</a></p>
                </div>
            </body>
        </html>
    `);
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
