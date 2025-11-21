const express = require('express');
const cors = require('cors');

const getLeadsRouter = require('./routes/getLeads.js');
const updateLeadsRouter = require('./routes/updateLeads.js');
const generateEmailRouter = require('./routes/generateEmail.js');
const trackingRouter = require('./routes/tracking.js');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

// getNewLeads
app.use('/getNewLeads', getLeadsRouter);

// updateOldStatus
app.use('/markLeadAsOld', updateLeadsRouter);

// generateEmails
app.use('/generateEmail', generateEmailRouter);

// tracking
app.use('/tracking', trackingRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Backend API (đã chia file) đang chạy trên cổng ${PORT}`);
  console.log('Các API có sẵn:');
  console.log(`  GET  http://localhost:${PORT}/getNewLeads`);
  console.log(`  POST http://localhost:${PORT}/markLeadAsOld`);
});
