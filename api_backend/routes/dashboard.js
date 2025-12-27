const express = require('express');
const router = express.Router();
const db = require('../db.js');

router.get('/', async (req, res) => {
  try {
    const leadsSnapshot = await db.collection('leads').get();
    const leads = [];

    let totalUniqueOpens = 0;
    let totalUniqueClicks = 0;

    leadsSnapshot.forEach(doc => {
      const data = doc.data();

      const hasOpened = (data.open_count && data.open_count > 0);
      const hasClicked = (data.click_count && data.click_count > 0);

      if (hasOpened) totalUniqueOpens++;
      if (hasClicked) totalUniqueClicks++;

      let timeDisplay = null;
      if (data.last_activity_at && typeof data.last_activity_at.toDate === 'function') {
          timeDisplay = data.last_activity_at.toDate();
      }

      leads.push({
        id: doc.id,
        ...data,
        hasOpened: hasOpened,
        hasClicked: hasClicked,
        lastInteractionTime: timeDisplay
      });
    });

    res.render('stats', {
      leads: leads,
      totalLeads: leads.length,
      totalOpens: totalUniqueOpens,
      totalClicks: totalUniqueClicks
    });

  } catch (error) {
    console.error('Lỗi dashboard:', error);
    res.status(500).send('Lỗi server: ' + error.message);
  }
});

module.exports = router;
