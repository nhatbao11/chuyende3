const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  try {
    // 1. Nhận dữ liệu từ n8n gửi sang
    const { name, utm } = req.body;

    // Lấy nguồn khách hàng (nếu không có thì đặt là 'unknown')
    const source = (utm && utm.source) ? utm.source.toLowerCase() : 'unknown';

    let emailContent = {
      subject: "",
      body: ""
    };

    // 2. LOGIC VIẾT EMAIL (Nằm ở Backend theo yêu cầu của thầy)
    if (source.includes('facebook') || source.includes('tiktok')) {
      // Khách từ Mạng xã hội -> Phong cách trẻ trung, ưu đãi
      emailContent.subject = `🔥 Chào ${name}, ưu đãi độc quyền từ MXH dành cho bạn!`;
      emailContent.body = `Chào ${name},\n\nCảm ơn bạn đã quan tâm đến chúng tôi qua Facebook/Tiktok. Tặng bạn mã giảm giá SOCIAL10 để mua hàng ngay hôm nay!\n\nThân ái.`;

    } else if (source.includes('newsletter') || source.includes('blog')) {
      // Khách từ Bài viết/Tin tức -> Phong cách chuyên gia
      emailContent.subject = `Chào ${name}, tài liệu bạn quan tâm đã sẵn sàng`;
      emailContent.body = `Kính chào ${name},\n\nRất vui vì bạn đã đăng ký nhận tin (Newsletter). Chúng tôi gửi kèm các tài liệu chuyên sâu về sản phẩm mà bạn đang tìm kiếm.\n\nTrân trọng.`;

    } else {
      // Khách vãng lai / Nguồn khác -> Phong cách tiêu chuẩn
      emailContent.subject = `Xin chào ${name}, cảm ơn bạn đã đăng ký`;
      emailContent.body = `Xin chào ${name},\n\nChúng tôi đã nhận được thông tin của bạn. Đội ngũ tư vấn sẽ liên hệ sớm nhất.\n\nCảm ơn bạn.`;
    }

    // 3. Trả nội dung về cho n8n
    return res.status(200).json(emailContent);

  } catch (error) {
    console.error('Lỗi tạo email:', error);
    return res.status(500).json({ subject: "Lỗi", body: "Lỗi hệ thống" });
  }
});

module.exports = router;
