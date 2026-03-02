const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPagination } = require('../utils/queryHelpers');
const cache = require('../utils/cache');

// GET /api/customers
const getAllCustomers = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'all', page = 1, limit = 20, search = '' } = req.query;
        const { limit: l, offset, page: p } = getPagination(page, limit);
        const msDateClause = getDateFilter(filter, 'created_at');
        const inrDateClause = getDateFilter(filter, 'missed_call_time');

        const searchLower = `%${search.toLowerCase()}%`;
        const searchClause = search ? `AND (name LIKE ? OR email LIKE ?)` : '';
        const searchParams = search ? [searchLower, searchLower] : [];

        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM customers WHERE email NOT IN (?) ${searchClause}`, [EXCLUDED_EMAILS, ...searchParams]);

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
                WHERE 1=1 ${msDateClause}
                GROUP BY customer_id
            ) ms_stats ON c.customer_id = ms_stats.customer_id
            LEFT JOIN (
                SELECT 
                    customer_id,
                    COUNT(*) AS missed_by_interpreters
                FROM interpreter_notification_responses
                WHERE 1=1 ${inrDateClause}
                GROUP BY customer_id
            ) inr_stats ON c.customer_id = inr_stats.customer_id
            WHERE c.email NOT IN (?) ${searchClause}
            ORDER BY total_calls DESC
            LIMIT ? OFFSET ?
        `, [EXCLUDED_EMAILS, ...searchParams, l, offset]);

        // Aggregate stats across ALL customers (not just current page)
        const [[{ frequent_count }]] = await pool.query(`
            SELECT COUNT(*) AS frequent_count FROM (
                SELECT c.customer_id
                FROM customers c
                LEFT JOIN (
                    SELECT customer_id, COUNT(*) AS total_calls
                    FROM monitoring_sessions
                    WHERE 1=1 ${msDateClause}
                    GROUP BY customer_id
                ) ms ON c.customer_id = ms.customer_id
                WHERE c.email NOT IN (?) AND COALESCE(ms.total_calls, 0) >= 2
            ) sub
        `, [EXCLUDED_EMAILS]);

        const [[{ neglected_count }]] = await pool.query(`
            SELECT COUNT(*) AS neglected_count FROM (
                SELECT c.customer_id
                FROM customers c
                LEFT JOIN (
                    SELECT customer_id, COUNT(*) AS total_calls
                    FROM monitoring_sessions
                    WHERE 1=1 ${msDateClause}
                    GROUP BY customer_id
                ) ms ON c.customer_id = ms.customer_id
                LEFT JOIN (
                    SELECT customer_id, COUNT(*) AS missed
                    FROM interpreter_notification_responses
                    WHERE 1=1 ${inrDateClause}
                    GROUP BY customer_id
                ) inr ON c.customer_id = inr.customer_id
                WHERE c.email NOT IN (?)
                AND COALESCE(ms.total_calls, 0) > 0
                AND COALESCE(inr.missed, 0) > 0
                AND COALESCE(inr.missed, 0) / GREATEST(COALESCE(ms.total_calls, 0), 1) > 0.4
            ) sub
        `, [EXCLUDED_EMAILS]);

        const responseData = {
            data: rows,
            stats: {
                frequent_count,
                neglected_count
            },
            pagination: {
                total,
                page: p,
                limit: l,
                totalPages: Math.ceil(total / l)
            }
        };

        cache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/customers/:id
const getCustomerById = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { id } = req.params;
        const { filter = 'all' } = req.query;
        const dateFilter = getDateFilter(filter, 'ms.created_at');
        const inrDateFilter = getDateFilter(filter, 'inr.missed_call_time');

        const [[customer]] = await pool.query(
            `SELECT * FROM customers WHERE customer_id = ? AND email NOT IN (?)`, [id, EXCLUDED_EMAILS]
        );
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const [calls] = await pool.query(`
            SELECT ms.*, i.name AS interpreter_name
            FROM monitoring_sessions ms
            LEFT JOIN interpreter i ON i.interpreter_id = ms.interpreter_id
            WHERE ms.customer_id = ? ${dateFilter}
            ORDER BY ms.created_at DESC
        `, [id]);

        const [missedByInterpreters] = await pool.query(`
            SELECT inr.*, i.name AS interpreter_name
            FROM interpreter_notification_responses inr
            LEFT JOIN interpreter i ON i.interpreter_id = inr.interpreter_id
            WHERE inr.customer_id = ? ${inrDateFilter}
            ORDER BY inr.missed_call_time DESC
        `, [id]);

        const responseData = { customer, calls, missedByInterpreters };
        cache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllCustomers, getCustomerById };
