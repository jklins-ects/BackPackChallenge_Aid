const express = require("express");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger/swagger");
const participantsRouter = require("./routes/participants");
const activitiesRouter = require("./routes/activities");
const participantsController = require("./controllers/participantsController");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json({ limit: "10mb" }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public") + "/index.html");
});

app.get("/laser", (req, res) => {
    res.sendFile(path.join(__dirname, "public") + "/group-print.html");
});

app.get("/assign-name", (req, res) => {
    res.sendFile(path.join(__dirname, "public") + "/assign-name.html");
});

app.get("/create-logo", (req, res) => {
    res.sendFile(path.join(__dirname, "public") + "/logo-creator.html");
});

app.get("/participants/:id/stats", participantsController.getPublicStatsPage);

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

app.use("/api/participants", participantsRouter);
app.use("/api/activities", activitiesRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
