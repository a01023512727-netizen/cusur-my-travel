require("dotenv").config();
const express = require("express");
const path = require("path");

// Ensure fetch is available in Node (for api/sheet.js, api/festivals.js)
if (typeof fetch === "undefined") {
  global.fetch = require("node-fetch");
}

const app = express();
const PORT = process.env.PORT || 3000;

// JSON body 파싱 (AI 채팅 POST용)
app.use(express.json());

// Serve static files (HTML, CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname)));

// API routes wired to existing handlers
app.get("/api/sheet", require("./api/sheet"));
app.get("/api/festivals", require("./api/festivals"));
app.get("/api/sports", require("./api/sports"));
app.get("/api/tourvis-airports", require("./api/tourvis"));
app.post("/api/ai-chat", require("./api/ai-chat"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

