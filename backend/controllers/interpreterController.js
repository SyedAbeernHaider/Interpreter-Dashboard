const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');

// GET /api/interpreters
const getAllInterpreters = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                i.*,
                COALESCE(ms_stats.total_calls, 0)     AS total_calls,
                COALESCE(ms_stats.accepted_calls, 0)  AS accepted_calls,
                COALESCE(ms_stats.cancelled_calls, 0) AS cancelled_calls,
                COALESCE(inr_stats.missed_calls, 0)   AS missed_calls,
                ms_stats.last_call_time
            FROM interpreter i
            LEFT JOIN (
                SELECT 
                    ms.interpreter_id, 
                    COUNT(*)           AS total_calls,
                    SUM(ms.status = 2)    AS accepted_calls,
                    SUM(ms.status = 3)    AS cancelled_calls,
                    MAX(ms.created_at)    AS last_call_time
                FROM monitoring_sessions ms
                JOIN customers c ON ms.customer_id = c.customer_id
                WHERE c.email NOT IN (?)
                GROUP BY ms.interpreter_id
            ) ms_stats ON i.interpreter_id = ms_stats.interpreter_id
            LEFT JOIN (
                SELECT 
                    inr.interpreter_id,
                    COUNT(*) AS missed_calls
                FROM interpreter_notification_responses inr
                JOIN customers c ON inr.customer_id = c.customer_id
                WHERE c.email NOT IN (?)
                GROUP BY inr.interpreter_id
            ) inr_stats ON i.interpreter_id = inr_stats.interpreter_id
            ORDER BY i.name ASC
        `, [EXCLUDED_EMAILS, EXCLUDED_EMAILS]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/interpreters/:id
const getInterpreterById = async (req, res) => {
    try {
        const { id } = req.params;

        const [[interpreter]] = await pool.query(
            `SELECT * FROM interpreter WHERE interpreter_id = ?`, [id]
        );
        if (!interpreter) return res.status(404).json({ error: 'Interpreter not found' });

        // Optional date filter
        const { filter = 'all' } = req.query;
        let dateFilter = '';
        if (filter === 'daily') dateFilter = `AND DATE(ms.created_at) = CURDATE()`;
        else if (filter === 'weekly') dateFilter = `AND ms.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
        else if (filter === 'monthly') dateFilter = `AND ms.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
        else if (filter === 'yearly') dateFilter = `AND ms.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)`;

        const [calls] = await pool.query(`
            SELECT ms.*, c.name AS customer_name, c.email AS customer_email
            FROM monitoring_sessions ms
            LEFT JOIN customers c ON c.customer_id = ms.customer_id
            WHERE ms.interpreter_id = ? AND c.email NOT IN (?) ${dateFilter}
            ORDER BY ms.created_at DESC
        `, [id, EXCLUDED_EMAILS]);

        const [missed] = await pool.query(`
            SELECT inr.*, c.name AS customer_name
            FROM interpreter_notification_responses inr
            LEFT JOIN customers c ON c.customer_id = inr.customer_id
            WHERE inr.interpreter_id = ? AND c.email NOT IN (?)
            ORDER BY inr.missed_call_time DESC
        `, [id, EXCLUDED_EMAILS]);

        const [dailyStats] = await pool.query(`
            SELECT 
                DATE(ms.created_at) AS date,
                COUNT(*)         AS total,
                SUM(ms.status = 2)  AS completed,
                SUM(ms.status = 3)  AS cancelled
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.interpreter_id = ? AND c.email NOT IN (?) 
            AND ms.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(ms.created_at)
            ORDER BY date ASC
        `, [id, EXCLUDED_EMAILS]);

        res.json({ interpreter, calls, missed, dailyStats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllInterpreters, getInterpreterById };
