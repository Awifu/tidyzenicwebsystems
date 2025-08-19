// routes/newsletter.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Assuming you have db connection setup

router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    // Check for duplicates
    const existing = await db('newsletter_subscribers').where({ email }).first();
    if (existing) {
      return res.status(409).json({ error: 'You are already subscribed.' });
    }

    // Insert the new email
    await db('newsletter_subscribers').insert({ email });

    return res.status(200).json({ message: 'Subscribed successfully!' });
  } catch (error) {
    console.error('❌ Error saving email:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
