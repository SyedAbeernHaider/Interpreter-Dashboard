const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);

        const [[{ total_interpreters }]] = await pool.query(`SELECT COUNT(*) AS total_interpreters FROM interpreter`);
        const [[{ active_interpreters }]] = await pool.query(`SELECT COUNT(*) AS active_interpreters FROM interpreter WHERE online_status = 1`);
        const [[{ on_call }]] = await pool.query(`SELECT COUNT(*) AS on_call FROM interpreter WHERE on_call_status = 1`);

        const [[{ total_customers }]] = await pool.query(`
            SELECT COUNT(*) AS total_customers FROM customers 
            WHERE email NOT IN (?)
        `, [EXCLUDED_EMAILS]);

        const [[{ calls_today }]] = await pool.query(`
            SELECT COUNT(*) AS calls_today 
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE DATE(ms.created_at) = ? AND c.email NOT IN (?)
        `, [today, EXCLUDED_EMAILS]);

        const [[{ missed_today }]] = await pool.query(`
            SELECT COUNT(*) AS missed_today 
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE DATE(ms.created_at) = ? AND ms.status = 3
            AND c.email NOT IN (?)
            AND EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)
        `, [today, EXCLUDED_EMAILS]);

        const [[{ cancelled_today }]] = await pool.query(`
            SELECT COUNT(*) AS cancelled_today 
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE DATE(ms.created_at) = ? AND ms.status = 3
            AND c.email NOT IN (?)
            AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)
        `, [today, EXCLUDED_EMAILS]);

        const [[{ completed_today }]] = await pool.query(`
            SELECT COUNT(*) AS completed_today 
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE DATE(ms.created_at) = ? AND ms.status = 2
            AND c.email NOT IN (?)
        `, [today, EXCLUDED_EMAILS]);

        const [[{ pending_today }]] = await pool.query(`
            SELECT COUNT(*) AS pending_today 
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE DATE(ms.created_at) = ? AND ms.status = 0
            AND c.email NOT IN (?)
        `, [today, EXCLUDED_EMAILS]);

        res.json({ total_interpreters, active_interpreters, on_call, total_customers, calls_today, missed_today, cancelled_today, completed_today, pending_today });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/calls-trend  (last 7 days)
const getCallsTrend = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                DATE(ms.created_at) AS date,
                COUNT(*) AS total,
                SUM(ms.status = 2) AS completed,
                SUM(ms.status = 3 AND EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)) AS missed,
                SUM(ms.status = 3 AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)) AS cancelled,
                SUM(ms.status = 0) AS pending
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND c.email NOT IN (?)
            GROUP BY DATE(ms.created_at)
            ORDER BY date ASC
        `, [EXCLUDED_EMAILS]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/recent-sessions
const getRecentSessions = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ms.monitoring_id, ms.status, ms.duration, ms.is_chat, ms.created_at,
                   c.name AS customer_name, c.email AS customer_email,
                   i.name AS interpreter_name,
                   (SELECT COUNT(*) FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id) AS notification_count
            FROM monitoring_sessions ms
            LEFT JOIN customers c ON c.customer_id = ms.customer_id
            LEFT JOIN interpreter i ON i.interpreter_id = ms.interpreter_id
            WHERE c.email NOT IN (?) OR c.email IS NULL
            ORDER BY ms.created_at DESC
            LIMIT 10
        `, [EXCLUDED_EMAILS]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/interpreter-status
const getInterpreterStatus = async (req, res) => {
    try {
        const [[{ online }]] = await pool.query(`SELECT COUNT(*) AS online FROM interpreter WHERE online_status=1 AND on_call_status=0`);
        const [[{ on_call }]] = await pool.query(`SELECT COUNT(*) AS on_call FROM interpreter WHERE on_call_status=1`);
        const [[{ offline }]] = await pool.query(`SELECT COUNT(*) AS offline FROM interpreter WHERE online_status=0`);
        res.json([
            { name: 'Online', value: online },
            { name: 'On Call', value: on_call },
            { name: 'Offline', value: offline },
        ]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getStats, getCallsTrend, getRecentSessions, getInterpreterStatus };
