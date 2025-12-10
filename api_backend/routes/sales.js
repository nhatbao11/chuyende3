const express = require('express');
const router = express.Router();
const db = require('../db.js');
const admin = require('firebase-admin');

// 1. Hiển thị trang bán hàng (Giữ nguyên)
router.get('/', (req, res) => {
  const lead_id = req.query.lead_id;
  if (!lead_id) return res.send("Lỗi: Thiếu lead_id.");
  res.render('shop', { lead_id: lead_id });
});

// 2. Xử lý khi bấm nút Thanh Toán (LOGIC CHÍNH)
router.post('/buy', async (req, res) => {
  try {
    const { lead_id, amount } = req.body;

console.log("Đang xử lý thanh toán cho ID:", lead_id);
    const amountNum = parseInt(amount);

    // --- BƯỚC 1: LẤY THÔNG TIN LEAD ĐỂ BIẾT CHIẾN DỊCH ---
    const leadDoc = await db.collection('leads').doc(lead_id).get();
    if (!leadDoc.exists) return res.send("Lỗi: Không tìm thấy khách hàng.");
    const leadData = leadDoc.data();
    
    // Lấy tên Campaign từ UTM (Quan trọng: Phải khớp với campaign_name bên Traffic)
    const campaignName = (leadData.utm && leadData.utm.campaign) ? leadData.utm.campaign : 'Direct';
    const sourceName = (leadData.utm && leadData.utm.source) ? leadData.utm.source.toLowerCase() : 'direct';

    // --- BƯỚC 2: TỰ ĐỘNG LẤY SỐ LIỆU TRAFFIC & LEADS ---
    
    // A. Đếm tổng Leads của chiến dịch này (Real-time)
    // Query: Tìm tất cả lead có utm.campaign trùng với tên chiến dịch hiện tại
    const leadsQuery = await db.collection('leads')
                               .where('utm.campaign', '==', campaignName)
                               .get();
    const totalLeadsCount = leadsQuery.size; // Đếm số lượng

    // B. Lấy số Traffic từ collection 'traffic'
    let trafficCount = 0;
    // Query: Tìm document traffic có field 'campaign_name' trùng tên chiến dịch
    const trafficQuery = await db.collection('traffic')
                                 .where('campaign_name', '==', campaignName) 
                                 .limit(1) // Chỉ lấy 1 kết quả
                                 .get();

    if (!trafficQuery.empty) {
        // Lấy số count từ kết quả tìm được
        trafficCount = trafficQuery.docs[0].data().count || 0;
    } else {
        console.log(`Cảnh báo: Không tìm thấy Traffic cho chiến dịch "${campaignName}"`);
    }

    // --- BƯỚC 3: LƯU ĐƠN HÀNG (Giữ nguyên) ---
    await db.collection('orders').add({
      lead_id: lead_id,
      amount: amountNum,
      status: 'paid',
      product_name: 'Khóa học Marketing Automation',
      campaign: campaignName,
      source: sourceName,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // --- BƯỚC 4: CẬP NHẬT VÀO PreROITracking (GOM SỐ LIỆU) ---
    const campaignRef = db.collection('PreROITracking').doc(campaignName);

    const updatePayload = {
        // Cộng dồn Doanh thu & Số đơn
        total_revenue: admin.firestore.FieldValue.increment(amountNum),
        total_orders: admin.firestore.FieldValue.increment(1),
        
        // CẬP NHẬT 2 SỐ LIỆU MỚI TÌM ĐƯỢC (Ghi đè số cũ)
        Leads: totalLeadsCount,
        Traffic: trafficCount,

        // Gom nhóm Source (Fix lỗi dấu chấm)
        Source: {
            [sourceName]: admin.firestore.FieldValue.increment(amountNum)
        }
    };

    // Lưu vào Firestore
    await campaignRef.set(updatePayload, { merge: true });

    // --- BƯỚC 5: UPDATE TRẠNG THÁI KHÁCH HÀNG ---
    await db.collection('leads').doc(lead_id).update({
      is_customer: true,
      total_spent: admin.firestore.FieldValue.increment(amountNum),
      last_activity: 'purchase'
    });

    res.render('thankyou');

  } catch (error) {
    console.error('Lỗi mua hàng:', error);
    res.send("Có lỗi: " + error.message);
  }
});

module.exports = router;
