const express = require('express');
const cors = require('cors');
const path = require('path');

const sendEmailRouter = require('./routes/sendEmails.js');
const getLeadsRouter = require('./routes/getLeads.js');
const updateLeadsRouter = require('./routes/updateLeads.js');
const generateEmailRouter = require('./routes/generateEmail.js');
const trackingRouter = require('./routes/tracking.js');
const dashboardRouter = require('./routes/dashboard.js');
const salesRouter = require('./routes/sales.js');
const roiRouter = require('./routes/roi.js');
const ordersRouter = require('./routes/orders.js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const PORT = 3000;

// getNewLeads
app.use('/getNewLeads', getLeadsRouter);

// updateOldStatus
app.use('/markLeadAsOld', updateLeadsRouter);

// generateEmails
app.use('/generateEmail', generateEmailRouter);

// tracking
app.use('/tracking', trackingRouter);

// dashboard
app.use('/stats', dashboardRouter);

// send email
app.use('/sendEmail', sendEmailRouter);

// detail product
app.use('/shop', salesRouter);

// dashboard roi
app.use('/admin/roi', roiRouter);

// orders
app.use('/admin/orders', ordersRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Backend API (đã chia file) đang chạy trên cổng ${PORT}`);
  console.log('Các API có sẵn:');
  console.log(`  GET  http://localhost:${PORT}/getNewLeads`);
  console.log(`  POST http://localhost:${PORT}/markLeadAsOld`);
});
