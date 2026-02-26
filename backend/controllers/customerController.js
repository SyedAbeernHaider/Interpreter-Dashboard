const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');

// GET /api/customers
const getAllCustomers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                c.*,
                COALESCE(ms_stats.total_calls, 0)            AS total_calls,
                COALESCE(ms_stats.completed_calls, 0)        AS completed_calls,
                COALESCE(ms_stats.cancelled_calls, 0)        AS cancelled_calls,
                COALESCE(inr_stats.missed_by_interpreters, 0) AS missed_by_interpreters,
                ms_stats.last_call
            FROM customers c
            LEFT JOIN (
                SELECT 
                    customer_id,
                    COUNT(*)        AS total_calls,
                    SUM(status = 2) AS completed_calls,
                    SUM(status = 3) AS cancelled_calls,
                    MAX(created_at) AS last_call
                FROM monitoring_sessions
                GROUP BY customer_id
            ) ms_stats ON c.customer_id = ms_stats.customer_id
            LEFT JOIN (
                SELECT 
                    customer_id,
                    COUNT(*) AS missed_by_interpreters
                FROM interpreter_notification_responses
                GROUP BY customer_id
            ) inr_stats ON c.customer_id = inr_stats.customer_id
            WHERE c.email NOT IN (?)
            ORDER BY total_calls DESC
        `, [EXCLUDED_EMAILS]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/customers/:id
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const [[customer]] = await pool.query(
            `SELECT * FROM customers WHERE customer_id = ? AND email NOT IN (?)`, [id, EXCLUDED_EMAILS]
        );
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const [calls] = await pool.query(`
            SELECT ms.*, i.name AS interpreter_name
            FROM monitoring_sessions ms
            LEFT JOIN interpreter i ON i.interpreter_id = ms.interpreter_id
            WHERE ms.customer_id = ?
    ORDER BY ms.created_at DESC
        `, [id]);

        const [missedByInterpreters] = await pool.query(`
            SELECT inr.*, i.name AS interpreter_name
            FROM interpreter_notification_responses inr
            LEFT JOIN interpreter i ON i.interpreter_id = inr.interpreter_id
            WHERE inr.customer_id = ?
    ORDER BY inr.missed_call_time DESC
        `, [id]);

        res.json({ customer, calls, missedByInterpreters });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllCustomers, getCustomerById };
