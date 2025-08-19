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
    // Check for existing subscriber
    const [existing] = await pool.query(
      'SELECT id FROM newsletter_subscribers WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'You are already subscribed.' });
    }

    // Insert new subscriber
    await pool.query(
      'INSERT INTO newsletter_subscribers (email) VALUES (?)',
      [email]
    );

    res.status(200).json({ message: 'Subscribed successfully!' });
  } catch (err) {
    console.error('❌ Newsletter subscription error:', err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

module.exports = router;
