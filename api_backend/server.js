const express = require('express');
const cors = require('cors');
const path = require('path');

const getLeadsRouter = require('./routes/getLeads.js');
const updateLeadsRouter = require('./routes/updateLeads.js');
const generateEmailRouter = require('./routes/generateEmail.js');
const trackingRouter = require('./routes/tracking.js');
const dashboardRouter = require('./routes/dashboard.js');

const app = express();
app.use(express.json());
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

// dashbpard
app.use('/stats', dashboardRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Backend API (đã chia file) đang chạy trên cổng ${PORT}`);
  console.log('Các API có sẵn:');
  console.log(`  GET  http://localhost:${PORT}/getNewLeads`);
  console.log(`  POST http://localhost:${PORT}/markLeadAsOld`);
});
