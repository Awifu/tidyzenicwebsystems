// routes/newsletter.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.post("/", async (req, res) => {
  const { email } = req.body;

  // Simple validation
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  try {
    // Insert email into DB (ignore if duplicate)
    await pool.query(
      `INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)`,
      [email.toLowerCase()]
    );

    console.log("📬 New newsletter subscriber:", email);
    return res.status(200).json({ message: "Subscribed successfully" });
  } catch (error) {
    console.error("❌ Error saving subscriber:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
