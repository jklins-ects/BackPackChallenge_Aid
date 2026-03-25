const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Participants API",
            version: "1.0.0",
            description: "API documentation for participants and activities",
        },
        servers: [
            {
                url: process.env.PUBLIC_API_URL || "http://localhost:3000",
                description: "Current server",
            },
        ],
    },
    apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);
