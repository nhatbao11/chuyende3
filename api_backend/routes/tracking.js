const express = require('express');
const router = express.Router();
const db = require('../db.js');
const admin = require('firebase-admin');

router.post('/log', async (req, res) => {
  try {
    const { lead_id, email, action, campaign_name } = req.body;

    if (!lead_id || !action) {
      return res.status(400).send("Thiếu thông tin lead_id hoặc action");
    }

    // Save into collection 'email_events'
    const eventData = {
      lead_id: lead_id,
      email: email || 'unknown',
      action: action,
      campaign_name: campaign_name || 'default_campaign',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      
      // Lưu thêm User Agent để biết họ dùng Mobile hay PC (ROI cũng cần cái này để tối ưu hiển thị)
      device_info: req.headers['user-agent'] || 'unknown' 
    };

    await db.collection('email_events').add(eventData);

    // (Tùy chọn) Update ngược lại bảng leads để biết khách còn "sống" không
    await db.collection('leads').doc(lead_id).update({
      last_activity: action,
      last_activity_at: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Lỗi lưu email_events:', error);
    return res.status(200).json({ success: false }); // Luôn trả về true để flow không chết
  }
});

module.exports = router;
