require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.set("trust proxy", 1);
app.use(express.json());

// --- MySQL pool ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,         // e.g. srv1697.hstgr.io
  user: process.env.DB_USER,         // e.g. tidyzenic_user
  password: process.env.DB_PASSWORD, // keep secret in env
  database: process.env.DB_NAME,     // e.g. tidyzenic_saas
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --- Routes ---
app.get("/healthz", (_req, res) => res.send("ok"));

app.get("/db-health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ db: "up", result: rows[0] });
  } catch (err) {
    console.error("DB health error:", err.message);
    res.status(500).json({ db: "down", error: err.message });
  }
});

app.get("/", (_req, res) => {
  res.send("TidyZenic SaaS (Node) is running. 👋");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Graceful shutdown
const shutdown = async () => {
  try { await pool.end(); } catch {}
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
