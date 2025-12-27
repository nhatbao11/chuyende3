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

    await db.collection('email_events').add({
      lead_id,
      email,
      action,
      campaign_name: campaign_name || 'default',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: req.headers['user-agent']
    });

    const leadRef = db.collection('leads').doc(lead_id);
    
    let updateData = {
      last_activity: action,
      last_activity_at: admin.firestore.FieldValue.serverTimestamp()
    };

    if (action === 'open') {
      updateData.open_count = admin.firestore.FieldValue.increment(1);
      updateData.hasOpened = true;
    }

    if (action === 'click') {
      updateData.click_count = admin.firestore.FieldValue.increment(1);
      updateData.hasClicked = true;
    }

    await leadRef.update(updateData);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Lỗi tracking:', error);
    return res.status(200).json({ success: false }); 
  }
});

module.exports = router;
