const express = require('express');
const router = express.Router();
const db = require('../db.js');

router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('PreROITracking').get();
    
    let campaigns = [];
    let globalStats = {
      revenue: 0,
      cost: 0,
      orders: 0,
      leads: 0,
      traffic: 0
    };

    // Dùng vòng lặp for...of để xử lý bất đồng bộ (Async/Await) chuẩn xác
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const campaignName = data.CampaignID || doc.id; // Lấy tên chiến dịch (ví dụ: evergreen)

      // --- 1. LẤY TRAFFIC REAL-TIME (Như cũ) ---
      let realTimeTraffic = 0;
      const trafficDoc = await db.collection('traffic').doc(campaignName).get();
      if (trafficDoc.exists) {
          realTimeTraffic = trafficDoc.data().count || 0;
      } else {
          const trafficQuery = await db.collection('traffic').where('campaign_name', '==', campaignName).limit(1).get();
          if (!trafficQuery.empty) realTimeTraffic = trafficQuery.docs[0].data().count || 0;
      }

      // --- 2. LẤY LEADS REAL-TIME (MỚI THÊM) ---
      // Chạy sang collection 'leads', đếm xem có bao nhiêu người thuộc chiến dịch này
      const leadsQuery = await db.collection('leads')
                                 .where('utm.campaign', '==', campaignName)
                                 .get();
      const realTimeLeads = leadsQuery.size; // Hàm .size trả về số lượng bản ghi tìm thấy
      // ------------------------------------------

      // Lấy các chỉ số tài chính (Giữ nguyên)
      const cost = Number(data.Cost) || 0;
      const revenue = Number(data.total_revenue) || 0;
      const orders = Number(data.total_orders) || 0;
      const sources = data.Source || {};

      // Cộng dồn vào tổng thể
      globalStats.revenue += revenue;
      globalStats.cost += cost;
      globalStats.orders += orders;
      globalStats.leads += realTimeLeads; // Dùng số mới đếm được
      globalStats.traffic += realTimeTraffic;

      campaigns.push({
        id: doc.id,
        name: campaignName,
        cost: cost,
        revenue: revenue,
        orders: orders,
        leads: realTimeLeads, // Hiển thị số mới đếm được ra bảng
        traffic: realTimeTraffic,
        sources: sources
      });
    }

    res.render('roi_dashboard', { 
      campaigns: campaigns,
      stats: globalStats
    });

  } catch (error) {
    console.error("Lỗi ROI Dashboard:", error);
    res.send("Lỗi lấy dữ liệu: " + error.message);
  }
});

module.exports = router;
