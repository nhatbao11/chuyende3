const express = require('express');
const router = express.Router();
const db = require('../db.js');
const admin = require('firebase-admin');

router.post('/log', async (req, res) => {
  try {
    const { lead_id, email, action, campaign_name } = req.body;

    if (!lead_id || !action) {
      return res.status(400).send("Thiếu thông tin");
    }

    // 1. VẪN GHI LOG CHI TIẾT (Cho Person 3 tính ROI theo thời gian)
    // Không chặn, cứ để nó ghi nhiều dòng cũng được
    await db.collection('email_events').add({
      lead_id,
      email,
      action,
      campaign_name: campaign_name || 'default',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: req.headers['user-agent'] // Lưu thiết bị (Mobile/PC)
    });

    // 2. CẬP NHẬT THÔNG MINH VÀO BẢNG LEADS (Cho Dashboard của bạn)
    const leadRef = db.collection('leads').doc(lead_id);
    
    // Tạo object update động
    let updateData = {
      last_activity: action,
      last_activity_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Nếu là 'open' -> Tăng biến open_count lên 1
    if (action === 'open') {
      updateData.open_count = admin.firestore.FieldValue.increment(1);
      updateData.hasOpened = true; // Đánh dấu là đã từng mở
    }

    // Nếu là 'click' -> Tăng biến click_count lên 1
    if (action === 'click') {
      updateData.click_count = admin.firestore.FieldValue.increment(1);
      updateData.hasClicked = true; // Đánh dấu là đã từng click
    }

    await leadRef.update(updateData);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Lỗi tracking:', error);
    return res.status(200).json({ success: false }); 
  }
});

module.exports = router;
