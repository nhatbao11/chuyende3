const express = require('express');
const router = express.Router();
const db = require('../db.js'); 

const admin = require('firebase-admin'); 

router.post('/', async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).send("Missing 'id' in body");
    }

    await db.collection('leads').doc(id).update({
      status: 'OLD',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(), // Giờ đã chạy
    });

    return res
      .status(200)
      .json({ success: true, message: `Lead ${id} updated to OLD` });
  } catch (error) {
    console.error('Error updating lead status to OLD:', error);
    return res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
