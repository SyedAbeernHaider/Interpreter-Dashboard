require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Routes
const dashboardRoutes = require('./routes/dashboard');
const interpreterRoutes = require('./routes/interpreters');
const customerRoutes = require('./routes/customers');
const missedCallRoutes = require('./routes/missedCalls');
const companyRoutes = require('./routes/companies');
const pendingCallRoutes = require('./routes/pendingCalls');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/interpreters', interpreterRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/missed-calls', missedCallRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/pending-calls', pendingCallRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
    res.json({ status: 'OK', timestamp: new Date().toISOString() })
);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});