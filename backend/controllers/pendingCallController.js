const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');

// GET /api/pending-calls
const getPendingCalls = async (req, res) => {
    try {
        // 1. All pending calls with customer details (Last 30 days)
        const [allPending] = await pool.query(`
            SELECT ms.*, c.name AS customer_name, c.email AS customer_email
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.status = 0 
            AND c.email NOT IN (?)
            AND ms.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY ms.created_at DESC
        `, [EXCLUDED_EMAILS]);

        // 2. Frequent users who have pending calls (Top 10, Last 30 days)
        const [frequentPendingUsers] = await pool.query(`
            SELECT c.customer_id, c.name, c.email, COUNT(*) AS pending_count
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.status = 0 
            AND c.email NOT IN (?)
            AND ms.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY c.customer_id
            ORDER BY pending_count DESC
            LIMIT 10
        `, [EXCLUDED_EMAILS]);

        res.json({ allPending, frequentPendingUsers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getPendingCalls };
