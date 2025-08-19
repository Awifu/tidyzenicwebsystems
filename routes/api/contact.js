const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('../../db/pool');

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Save message to the database
    const query = `INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)`;
    await pool.execute(query, [name.trim(), email.trim(), message.trim()]);

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify transporter (optional but useful during debugging)
    await transporter.verify();

    // Send notification to admin
    await transporter.sendMail({
      from: `"TidyZenic Contact Form" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: '📩 New Contact Form Submission',
      html: `
        <h2 style="margin-bottom: 10px;">You have a new message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
        <hr />
        <p style="font-size: 12px; color: #888;">TidyZenic Contact API</p>
      `,
    });

    res.status(200).json({ message: 'Your message has been successfully sent.' });
  } catch (err) {
    console.error('[CONTACT ERROR]', err);
    res.status(500).json({ message: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
