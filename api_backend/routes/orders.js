const express = require('express');
const router = express.Router();
const db = require('../db.js');

router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
                             .orderBy('created_at', 'desc') // Sắp xếp ngày mới nhất lên đầu
                             .get();
    
    // 1. Lấy danh sách đơn hàng & tên khách
    let orders = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let customerName = 'Khách vãng lai'; 
      if (data.lead_id) {
          try {
              const leadDoc = await db.collection('leads').doc(data.lead_id).get();
              if (leadDoc.exists) customerName = leadDoc.data().name || data.lead_id;
          } catch (err) {}
      }
      return {
        id: doc.id,
        customerName: customerName,
        amount: data.amount || 0,
        status: data.status || 'pending',
        campaign: data.campaign || 'Direct',
        source: data.source || 'direct',
        date: data.created_at ? data.created_at.toDate() : new Date() 
      };
    }));

    // 2. TẠO DANH SÁCH CHIẾN DỊCH KHÔNG TRÙNG LẶP (UNIQUE CAMPAIGNS)
    // Để hiển thị vào cái ô chọn lọc (Dropdown)
    const uniqueCampaigns = [...new Set(orders.map(item => item.campaign))];

    // Gửi cả orders và uniqueCampaigns sang giao diện
    res.render('order_list', { orders: orders, campaigns: uniqueCampaigns });

  } catch (error) {
    console.error("Lỗi:", error);
    res.send("Lỗi: " + error.message);
  }
});

module.exports = router;
