const express = require('express');
const router = express.Router();
const db = require('../db.js');
const admin = require('firebase-admin');

// 1. Hiển thị trang bán hàng (GET /shop?lead_id=xyz)
router.get('/', (req, res) => {
  const lead_id = req.query.lead_id;
  
  if (!lead_id) {
    return res.send("Lỗi: Không tìm thấy thông tin khách hàng (Thiếu lead_id). Hãy click từ email.");
  }

  // Render trang shop.ejs và truyền lead_id vào để gắn vào nút Mua
  res.render('shop', { lead_id: lead_id });
});

// 2. Xử lý khi bấm nút Thanh Toán (POST /shop/buy)
router.post('/buy', async (req, res) => {
  try {
    const { lead_id, amount } = req.body;
    const amountNum = parseInt(amount);

    // 1. LẤY THÔNG TIN KHÁCH HÀNG (để biết nguồn và chiến dịch)
    const leadDoc = await db.collection('leads').doc(lead_id).get();
    
    if (!leadDoc.exists) {
        return res.send("Lỗi: Không tìm thấy khách hàng.");
    }
    
    const leadData = leadDoc.data();
    
    // Lấy tên Campaign và Source từ UTM (Nếu không có thì để mặc định)
    // Lưu ý: Đảm bảo khi lưu Lead bạn đã lưu utm: { campaign: '...', source: '...' }
    const campaignName = (leadData.utm && leadData.utm.campaign) ? leadData.utm.campaign : 'Unknown_Campaign';
    
    // Chuyển nguồn về chữ thường (google, facebook) để làm Key cho đẹp
    const sourceName = (leadData.utm && leadData.utm.source) ? leadData.utm.source.toLowerCase() : 'direct';

    // 2. LƯU ĐƠN HÀNG VÀO BẢNG ORDERS (Để lưu vết chi tiết)
    await db.collection('orders').add({
      lead_id: lead_id,
      amount: amountNum,
      status: 'paid',
      product_name: 'Khóa học Marketing Automation',
      campaign: campaignName,
      source: sourceName,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. GOM NHÓM DOANH THU VÀO COLLECTION CHIẾN DỊCH (QUAN TRỌNG NHẤT)
    const campaignRef = db.collection('PreROITracking').doc(campaignName);

    // Tạo object update
    // 'sources' là tên Field cha, 'sourceName' là tên Field con (google/facebook)
    const updatePayload = {
        total_revenue: admin.firestore.FieldValue.increment(amountNum), // Cộng tổng
        total_orders: admin.firestore.FieldValue.increment(1)           // Cộng số đơn
    };

    // KỸ THUẬT DOT NOTATION: Tạo key động dạng "sources.google"
    // Cú pháp này bảo Firestore: "Hãy tìm vào trong object 'sources', tìm đúng thằng 'google' và cộng tiền vào đó"
    updatePayload[`sources.${sourceName}`] = admin.firestore.FieldValue.increment(amountNum);

    // Thực hiện Update (Dùng set merge để tự tạo document nếu chưa có)
    await campaignRef.set(updatePayload, { merge: true });


    // 4. UPDATE TRẠNG THÁI KHÁCH HÀNG (Như cũ)
    await db.collection('leads').doc(lead_id).update({
      is_customer: true,
      total_spent: admin.firestore.FieldValue.increment(amountNum),
      last_activity: 'purchase'
    });

    res.render('thankyou');

  } catch (error) {
    console.error('Lỗi mua hàng:', error);
    res.send("Có lỗi xảy ra khi thanh toán: " + error.message);
  }
});

module.exports = router;
