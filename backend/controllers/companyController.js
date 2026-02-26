const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');

// GET /api/companies
const getAllCompanies = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                co.*,
                COUNT(DISTINCT cu.customer_id)              AS total_users,
                COALESCE(SUM(ms_stats.total_calls), 0)      AS total_calls,
                COALESCE(SUM(ms_stats.completed_calls), 0)  AS completed_calls,
                COALESCE(SUM(ms_stats.cancelled_calls), 0)  AS cancelled_calls,
                MAX(ms_stats.last_call)                     AS last_call
            FROM companies co
            LEFT JOIN customers cu ON cu.company_id = co.company_id
            LEFT JOIN (
                SELECT 
                    customer_id,
                    COUNT(*)        AS total_calls,
                    SUM(status = 2) AS completed_calls,
                    SUM(status = 3) AS cancelled_calls,
                    MAX(created_at) AS last_call
                FROM monitoring_sessions
                GROUP BY customer_id
            ) ms_stats ON cu.customer_id = ms_stats.customer_id
            WHERE cu.email NOT IN (?)
            GROUP BY co.id
            ORDER BY total_calls DESC
        `, [EXCLUDED_EMAILS]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/companies/:id
const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;

        const [[company]] = await pool.query(
            `SELECT * FROM companies WHERE company_id = ?`, [id]
        );
        if (!company) return res.status(404).json({ error: 'Company not found' });

        // All users belonging to this company
        const [users] = await pool.query(`
            SELECT 
                cu.*,
                COALESCE(ms_stats.total_calls, 0)      AS total_calls,
                COALESCE(ms_stats.completed_calls, 0)  AS completed_calls,
                COALESCE(ms_stats.cancelled_calls, 0)  AS cancelled_calls,
                ms_stats.last_call
            FROM customers cu
            LEFT JOIN (
                SELECT 
                    customer_id,
                    COUNT(*)        AS total_calls,
                    SUM(status = 2) AS completed_calls,
                    SUM(status = 3) AS cancelled_calls,
                    MAX(created_at) AS last_call
                FROM monitoring_sessions
                GROUP BY customer_id
            ) ms_stats ON cu.customer_id = ms_stats.customer_id
            WHERE cu.company_id = ? AND cu.email NOT IN (?)
            ORDER BY total_calls DESC
        `, [id, EXCLUDED_EMAILS]);

        // All call history for all users of this company
        const [calls] = await pool.query(`
            SELECT 
                ms.*,
                cu.name AS customer_name,
                cu.email AS customer_email,
                i.name AS interpreter_name
            FROM monitoring_sessions ms
            LEFT JOIN customers cu ON cu.customer_id = ms.customer_id
            LEFT JOIN interpreter i ON i.interpreter_id = ms.interpreter_id
            WHERE cu.company_id = ? AND cu.email NOT IN (?)
            ORDER BY ms.created_at DESC
            LIMIT 200
        `, [id, EXCLUDED_EMAILS]);

        // Daily call trend for chart (last 30 days)
        const [dailyStats] = await pool.query(`
            SELECT
                DATE(ms.created_at) AS date,
                COUNT(*)            AS total,
                SUM(ms.status = 2)  AS completed,
                SUM(ms.status = 3)  AS cancelled
            FROM monitoring_sessions ms
            LEFT JOIN customers cu ON cu.customer_id = ms.customer_id
            WHERE cu.company_id = ? AND cu.email NOT IN (?) 
            AND ms.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(ms.created_at)
            ORDER BY date ASC
        `, [id, EXCLUDED_EMAILS]);

        res.json({ company, users, calls, dailyStats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllCompanies, getCompanyById };
