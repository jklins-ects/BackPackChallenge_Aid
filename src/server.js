require("dotenv").config();

const app = require("./app");
const { connectToMongo } = require("./db/mongo");

const port = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectToMongo();

        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
