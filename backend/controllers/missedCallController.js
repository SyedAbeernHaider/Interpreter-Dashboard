const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPagination } = require('../utils/queryHelpers');
const cache = require('../utils/cache');

// GET /api/missed-calls
const getMissedCalls = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'all', page = 1, limit = 20, search = '' } = req.query;
        const { limit: l, offset, page: p } = getPagination(page, limit);
        const dateClause = getDateFilter(filter, 'inr.missed_call_time');

        const searchLower = `%${search.toLowerCase()}%`;
        const searchClause = search ? `AND (i.name LIKE ? OR c.name LIKE ? OR inr.user_name LIKE ?)` : '';
        const searchParams = search ? [searchLower, searchLower, searchLower] : [];

        const [[{ total }]] = await pool.query(`
            SELECT COUNT(DISTINCT inr.monitoring_id, inr.customer_id) as total 
            FROM interpreter_notification_responses inr
            LEFT JOIN interpreter i ON i.interpreter_id = inr.interpreter_id
            JOIN customers c ON c.customer_id = inr.customer_id
            WHERE c.email NOT IN (?) ${dateClause} ${searchClause}
        `, [EXCLUDED_EMAILS, ...searchParams]);

        const [rows] = await pool.query(`
            SELECT inr.*, 
                   i.name AS interpreter_name_detail,
                   c.name AS customer_name_detail
            FROM interpreter_notification_responses inr
            LEFT JOIN interpreter i ON i.interpreter_id = inr.interpreter_id
            LEFT JOIN customers  c ON c.customer_id    = inr.customer_id
            WHERE c.email NOT IN (?) ${dateClause} ${searchClause}
            ORDER BY inr.missed_call_time DESC
            LIMIT ? OFFSET ?
        `, [EXCLUDED_EMAILS, ...searchParams, l, offset]);

        // Aggregate stats across ALL missed calls (not just current page)
        const [[{ unique_interpreters, unique_customers }]] = await pool.query(`
            SELECT 
                COUNT(DISTINCT inr.interpreter_id) AS unique_interpreters,
                COUNT(DISTINCT inr.customer_id) AS unique_customers
            FROM interpreter_notification_responses inr
            LEFT JOIN interpreter i ON i.interpreter_id = inr.interpreter_id
            JOIN customers c ON c.customer_id = inr.customer_id
            WHERE c.email NOT IN (?) ${dateClause}
        `, [EXCLUDED_EMAILS]);

        const responseData = {
            data: rows,
            stats: {
                unique_interpreters,
                unique_customers
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

module.exports = { getMissedCalls };
