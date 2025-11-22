const express = require('express');
const router = express.Router();
const db = require('../db.js');

router.get('/', async (req, res) => {
  try {
    // 1. Lấy danh sách Leads từ Firestore
    const leadsSnapshot = await db.collection('leads').get();
    const leads = [];

    // Biến để tính tổng cho cả chiến dịch
    let totalOpens = 0;
    let totalClicks = 0;

    leadsSnapshot.forEach(doc => {
      const data = doc.data();

      if (data.open_count && data.open_count > 0) {
        totalOpens += 1; 
      }

      if (data.click_count && data.click_count > 0) {
        totalClicks += 1;
      }

      leads.push({
        id: doc.id,
        ...data,
        // Đảm bảo luôn có giá trị mặc định để không lỗi giao diện
        open_count: data.open_count || 0,
        click_count: data.click_count || 0,
	lastInteractionTime: (data.last_activity_at && data.last_activity_at.toDate) ? data.last_activity_at.toDate() : null
      });
    });

    // 3. Trả dữ liệu ra file giao diện (stats.ejs)
    res.render('stats', {
      leads: leads,
      totalLeads: leads.length,
      totalOpens: totalOpens,   // Tổng số lần mở của tất cả mọi người
      totalClicks: totalClicks  // Tổng số lần click của tất cả mọi người
    });

  } catch (error) {
    console.error('Lỗi dashboard:', error);
    res.status(500).send('Lỗi server: ' + error.message);
  }
});

module.exports = router;
