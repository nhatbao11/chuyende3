const express = require('express');
const cors = require('cors');

// 1. Import các file router (logic con)
const getLeadsRouter = require('./routes/getLeads.js');
const updateLeadsRouter = require('./routes/updateLeads.js');

// 2. Khởi tạo App
const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

// 3. Điều phối (Rất quan trọng)
// Khi có ai đó gọi /getNewLeads -> hãy đưa họ đến file getLeadsRouter
app.use('/getNewLeads', getLeadsRouter);

// Khi có ai đó gọi /markLeadAsOld -> hãy đưa họ đến file updateLeadsRouter
app.use('/markLeadAsOld', updateLeadsRouter);


// 4. Khởi động máy chủ
app.listen(PORT, () => {
  console.log(`Backend API (đã chia file) đang chạy trên cổng ${PORT}`);
  console.log('Các API có sẵn:');
  console.log(`  GET  http://localhost:${PORT}/getNewLeads`);
  console.log(`  POST http://localhost:${PORT}/markLeadAsOld`);
});
