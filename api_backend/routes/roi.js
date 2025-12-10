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
      profit: 0,
      orders: 0,
      leads: 0,
      traffic: 0
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // --- KHỚP LỆNH FIELD FIRESTORE (QUAN TRỌNG) ---
      // Dựa vào ảnh bạn gửi: Cost, Leads, Traffic viết Hoa. total_revenue viết thường.
      const cost = Number(data.Cost) || 0;
      const revenue = Number(data.total_revenue) || 0;
      const orders = Number(data.total_orders) || 0;
      const leads = Number(data.Leads) || 0;
      const traffic = Number(data.Traffic) || 0;
      const sources = data.Source || {}; // Lấy map Source (Viết hoa chữ S)
      
      const profit = revenue - cost;
      
      // Cộng dồn tổng thể
      globalStats.revenue += revenue;
      globalStats.cost += cost;
      globalStats.orders += orders;
      globalStats.leads += leads;
      globalStats.traffic += traffic;

      campaigns.push({
        id: doc.id,
        name: data.CampaignID || doc.id, // Lấy CampaignID hoặc ID document
        cost: cost,
        revenue: revenue,
        profit: profit,
        orders: orders,
        leads: leads,
        traffic: traffic,
        sources: sources
      });
    });

    globalStats.profit = globalStats.revenue - globalStats.cost;
    // Tính ROI (Tránh chia cho 0)
    globalStats.roi = globalStats.cost > 0 ? ((globalStats.profit / globalStats.cost) * 100).toFixed(1) : 0;

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
