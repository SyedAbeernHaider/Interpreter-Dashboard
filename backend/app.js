const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

// Routes
const dashboardRoutes = require('./routes/dashboard');
const interpreterRoutes = require('./routes/interpreters');
const customerRoutes = require('./routes/customers');
const missedCallRoutes = require('./routes/missedCalls');
const companyRoutes = require('./routes/companies');
const pendingCallRoutes = require('./routes/pendingCalls');
const { authRoutes } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/interpreters', interpreterRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/missed-calls', missedCallRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/pending-calls', pendingCallRoutes);
app.use('/api/auth', authRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
    res.json({ status: 'OK', timestamp: new Date().toISOString() })
);

// ── Start (only when not running as serverless) ───────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
}

module.exports = app;