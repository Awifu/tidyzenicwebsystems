const express = require('express');
const router = express.Router();

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // TODO: Save to DB or send an email
    console.log('New contact form:', { name, email, message });

    return res.status(200).json({ message: 'Thank you! Your message has been sent.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

module.exports = router;
