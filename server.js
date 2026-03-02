require("dotenv").config();
const express = require("express");
const path = require("path");

// Ensure fetch is available in Node (for api/sheet.js, api/festivals.js)
if (typeof fetch === "undefined") {
  global.fetch = require("node-fetch");
}

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (HTML, CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname)));

// API routes wired to existing handlers
app.get("/api/sheet", require("./api/sheet"));
app.get("/api/festivals", require("./api/festivals"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

