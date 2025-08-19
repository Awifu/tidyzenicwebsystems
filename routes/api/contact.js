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
    // Save to MySQL
    const sql = `INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)`;
    await pool.execute(sql, [name, email, message]);

    // Send email to super admin
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SUPER_ADMIN_EMAIL,
        pass: process.env.SUPER_ADMIN_PASS,
      },
    });

    await transporter.sendMail({
      from: `"TidyZenic Contact" <${process.env.SUPER_ADMIN_EMAIL}>`,
      to: process.env.SUPER_ADMIN_EMAIL,
      subject: '📥 New Contact Submission',
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
    });

    res.json({ message: 'Your message has been sent successfully!' });
  } catch (err) {
    console.error('[CONTACT ERROR]', err);
    res.status(500).json({ message: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
