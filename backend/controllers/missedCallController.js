const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');

// GET /api/missed-calls
const getMissedCalls = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT inr.*, 
                   i.name AS interpreter_name_detail,
                   c.name AS customer_name_detail
            FROM interpreter_notification_responses inr
            LEFT JOIN interpreter i ON i.interpreter_id = inr.interpreter_id
            LEFT JOIN customers  c ON c.customer_id    = inr.customer_id
            WHERE c.email NOT IN (?)
            ORDER BY inr.missed_call_time DESC
            LIMIT 100
        `, [EXCLUDED_EMAILS]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getMissedCalls };
