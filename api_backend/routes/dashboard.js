const express = require('express');
const router = express.Router();
const db = require('../db.js');

router.get('/', async (req, res) => {
  try {
    // 1. Lấy tất cả Leads
    const leadsSnapshot = await db.collection('leads').get();
    const leads = [];
    leadsSnapshot.forEach(doc => {
      leads.push({ id: doc.id, ...doc.data() });
    });

    // 2. Lấy tất cả Events (Open/Click)
    const eventsSnapshot = await db.collection('email_events').get();
    const events = [];
    eventsSnapshot.forEach(doc => {
      events.push(doc.data());
    });

    // 3. Xử lý logic: Map event vào từng lead để biết ai đã làm gì
    let totalOpens = 0;
    let totalClicks = 0;

    const processedLeads = leads.map(lead => {
      // Tìm các event của lead này
      const leadEvents = events.filter(e => e.lead_id === lead.id);
      
      const hasOpened = leadEvents.some(e => e.action === 'open');
      const hasClicked = leadEvents.some(e => e.action === 'click');

      if (hasOpened) totalOpens++;
      if (hasClicked) totalClicks++;

      // Lấy thời gian tương tác cuối cùng
      // (Logic đơn giản, lấy timestamp của event mới nhất nếu có)
      let lastInteractionTime = null;
      if (leadEvents.length > 0) {
         // Sắp xếp lấy cái mới nhất
         // Lưu ý: Timestamp Firestore cần xử lý toDate(), ở đây demo đơn giản
         const lastEvent = leadEvents[leadEvents.length - 1]; 
         if(lastEvent.timestamp && lastEvent.timestamp.toDate) {
            lastInteractionTime = lastEvent.timestamp.toDate();
         }
      }

      return {
        ...lead,
        hasOpened,
        hasClicked,
        lastInteractionTime
      };
    });

    // 4. Render ra file stats.ejs
    res.render('stats', {
      leads: processedLeads,
      totalLeads: leads.length,
      totalOpens,
      totalClicks
    });

  } catch (error) {
    console.error('Lỗi dashboard:', error);
    res.status(500).send('Lỗi server: ' + error.message);
  }
});

module.exports = router;
