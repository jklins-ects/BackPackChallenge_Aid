const { createCanvas } = require("canvas");

function generateBase64Logo(firstName = "", lastName = "") {
    const width = 200;
    const height = 200;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const colors = ["#4A90E2", "#50E3C2", "#F5A623", "#BD10E0", "#7ED321"];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(0, 0, width, height);

    const firstInitial = firstName?.charAt(0)?.toUpperCase() || "?";
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || "";
    const initials = `${firstInitial}${lastInitial}`;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.floor(width / 2.5)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, width / 2, height / 2);

    const buffer = canvas.toBuffer("image/png");
    const base64 = buffer.toString("base64");

    return `data:image/png;base64,${base64}`;
}

module.exports = {
    generateBase64Logo,
};
