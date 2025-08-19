// routes/newsletter.js
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Invalid email address.' });
  }

  try {
    const conn = await pool.getConnection();

    // Check for duplicates
    const [rows] = await conn.query('SELECT id FROM newsletter_subscribers WHERE email = ?', [email]);

    if (rows.length > 0) {
      conn.release();
      return res.status(409).json({ message: 'You are already subscribed.' });
    }

    // Insert new email
    await conn.query('INSERT INTO newsletter_subscribers (email) VALUES (?)', [email]);
    conn.release();

    return res.status(200).json({ message: 'Subscribed successfully!' });
  } catch (err) {
    console.error('❌ Newsletter DB error:', err);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

module.exports = router;
