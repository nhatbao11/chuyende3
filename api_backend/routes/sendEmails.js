const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configure email account
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'phongfdj21@gmail.com',
    pass: 'jchu ylbp wnqw cyet'
  }
});

router.post('/', async (req, res) => {
  try {
    const { to, subject, contentRaw, lead_id } = req.body;

    if (!to || !lead_id) {
      return res.status(400).send("Thiếu email nhận hoặc lead_id");
    }

    // URL Webhook 
    const trackingBaseUrl = "http://103.75.183.194:5678/webhook/emailTrack";
    
    // Link Click
    const clickLink = `${trackingBaseUrl}?action=click&lead_id=${lead_id}&email=${to}`;

    // Link Open
    const openPixel = `${trackingBaseUrl}?action=open&lead_id=${lead_id}&email=${to}`;

    const formattedContent = contentRaw.replace(/\n/g, '<br>');

    // Content
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        ${formattedContent}
        
        <p style="margin-top: 20px;">
          <a href="${clickLink}" 
             style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
             Xem ưu đãi ngay
          </a>
        </p>
        
        <p>Trân trọng,<br>Team BQP.</p>
        
        <img src="${openPixel}" width="1" height="1" style="display:none;" alt="" />
      </div>
    `;

    // Send emails
    await transporter.sendMail({
      from: '"Team BQP" <teamBQP@gmail.com>',
      to: to,
      subject: subject,
      html: htmlBody
    });

    console.log(`Đã gửi mail thành công cho: ${to}`);
    return res.status(200).json({ success: true, message: "Email sent" });

  } catch (error) {
    console.error('Lỗi gửi mail:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
