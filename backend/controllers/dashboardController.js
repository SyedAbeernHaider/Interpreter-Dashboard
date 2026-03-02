const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPKTDate } = require('../utils/queryHelpers');
const cache = require('../utils/cache');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'today' } = req.query;
        const dateClause = getDateFilter(filter, 'ms.created_at');

        const [[{ total_interpreters }]] = await pool.query(`SELECT COUNT(*) AS total_interpreters FROM interpreter`);
        const [[{ active_interpreters }]] = await pool.query(`SELECT COUNT(*) AS active_interpreters FROM interpreter WHERE online_status = 1`);
        const [[{ on_call }]] = await pool.query(`SELECT COUNT(*) AS on_call FROM interpreter WHERE on_call_status = 1`);

        const [[{ total_customers }]] = await pool.query(`
            SELECT COUNT(*) AS total_customers FROM customers  
            WHERE email NOT IN (?)
        `, [EXCLUDED_EMAILS]);

        // Completed calls: status = 2
        const [[{ completed_count }]] = await pool.query(`
            SELECT COUNT(*) AS completed_count 
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.status = 2
            AND c.email NOT IN (?) ${dateClause}
        `, [EXCLUDED_EMAILS]);

        // Missed calls: unique monitoring_ids in interpreter_notification_responses
        // (one call missed by multiple interpreters = 1 missed call)
        const missedDateClause = getDateFilter(filter, 'inr.missed_call_time');
        const [[{ missed_count }]] = await pool.query(`
            SELECT COUNT(DISTINCT inr.monitoring_id) AS missed_count 
            FROM interpreter_notification_responses inr
            JOIN customers c ON c.customer_id = inr.customer_id
            WHERE c.email NOT IN (?) ${missedDateClause}
        `, [EXCLUDED_EMAILS]);

        // Total calls = completed + missed
        const calls_count = completed_count + missed_count;

        // Cancelled calls: status = 3 AND NOT in interpreter_notification_responses
        const [[{ cancelled_count }]] = await pool.query(`
            SELECT COUNT(*) AS cancelled_count 
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.status = 3
            AND c.email NOT IN (?) ${dateClause}
            AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)
        `, [EXCLUDED_EMAILS]);

        // Disconnected calls: interpreter_id IS NULL AND NOT in interpreter_notification_responses
        const [[{ disconnected_count }]] = await pool.query(`
            SELECT COUNT(*) AS disconnected_count 
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.interpreter_id IS NULL
            AND c.email NOT IN (?) ${dateClause}
            AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)
        `, [EXCLUDED_EMAILS]);

        const responseData = {
            total_interpreters,
            active_interpreters,
            on_call,
            total_customers,
            calls_today: calls_count,
            missed_today: missed_count,
            cancelled_today: cancelled_count,
            completed_today: completed_count,
            disconnected_today: disconnected_count
        };

        cache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/calls-trend  (last 7 days)
const getCallsTrend = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);
        const weekAgo = getPKTDate(-7);
        const [rows] = await pool.query(`
            SELECT 
                DATE(ms.created_at) AS date,
                SUM(ms.status = 2) AS completed,
                SUM(ms.status = 3 AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)) AS cancelled,
                SUM(ms.interpreter_id IS NULL AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)) AS disconnected
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.created_at >= '${weekAgo} 00:00:00'
            AND c.email NOT IN (?)
            GROUP BY DATE(ms.created_at)
            ORDER BY date ASC
        `, [EXCLUDED_EMAILS]);

        // Get missed calls from notification_responses grouped by date
        const [missedRows] = await pool.query(`
            SELECT 
                DATE(inr.missed_call_time) AS date,
                COUNT(DISTINCT inr.monitoring_id) AS missed
            FROM interpreter_notification_responses inr
            JOIN customers c ON c.customer_id = inr.customer_id
            WHERE inr.missed_call_time >= '${weekAgo} 00:00:00'
            AND c.email NOT IN (?)
            GROUP BY DATE(inr.missed_call_time)
            ORDER BY date ASC
        `, [EXCLUDED_EMAILS]);

        // Merge missed counts into the main rows
        const missedMap = {};
        missedRows.forEach(r => { missedMap[r.date] = r.missed; });
        const merged = rows.map(r => ({
            ...r,
            missed: missedMap[r.date] || 0,
            total: (r.completed || 0) + (missedMap[r.date] || 0)
        }));
        cache.set(cacheKey, merged);
        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/recent-sessions
const getRecentSessions = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'today' } = req.query;
        const dateClause = getDateFilter(filter, 'ms.created_at');

        const [rows] = await pool.query(`
            SELECT ms.monitoring_id, ms.status, ms.duration, ms.is_chat, ms.created_at,
                   c.name AS customer_name, c.email AS customer_email,
                   i.name AS interpreter_name,
                   (SELECT COUNT(*) FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id) AS notification_count
            FROM monitoring_sessions ms
            LEFT JOIN customers c ON c.customer_id = ms.customer_id
            LEFT JOIN interpreter i ON i.interpreter_id = ms.interpreter_id
            WHERE (c.email NOT IN (?) OR c.email IS NULL) ${dateClause}
            ORDER BY ms.created_at DESC
            LIMIT 10
        `, [EXCLUDED_EMAILS]);
        cache.set(cacheKey, rows);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/interpreter-status
const getInterpreterStatus = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);
        const [[{ online }]] = await pool.query(`SELECT COUNT(*) AS online FROM interpreter WHERE online_status=1 AND on_call_status=0`);
        const [[{ on_call }]] = await pool.query(`SELECT COUNT(*) AS on_call FROM interpreter WHERE on_call_status=1`);
        const [[{ offline }]] = await pool.query(`SELECT COUNT(*) AS offline FROM interpreter WHERE online_status=0`);
        const responseData = [
            { name: 'Online', value: online },
            { name: 'On Call', value: on_call },
            { name: 'Offline', value: offline },
        ];
        cache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getStats, getCallsTrend, getRecentSessions, getInterpreterStatus };
