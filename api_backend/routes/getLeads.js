const express = require('express');
const router = express.Router();
const db = require('../db.js'); // Lấy kết nối db từ file db.js

// Lưu ý: router.get('/') thay vì router.get('/getNewLeads')
// vì file server.js sẽ xử lý phần '/getNewLeads'
router.get('/', async (req, res) => {
  try {
    const leadsCollection = db.collection('leads');
    const query = leadsCollection.where('status', '==', 'NEW');
    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('No matching documents with status NEW.');
      return res.status(200).json([]);
    }

    const newLeads = [];
    snapshot.forEach((doc) => {
      newLeads.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.status(200).json(newLeads);
  } catch (error) {
    console.error('Error fetching new leads:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Export cái router này ra
module.exports = router;
