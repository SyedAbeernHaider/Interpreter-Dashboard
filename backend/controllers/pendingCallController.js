const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');

const { getDateFilter, getPagination, getPKTDate } = require('../utils/queryHelpers');
const cache = require('../utils/cache');

// GET /api/pending-calls
const getPendingCalls = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'all', page = 1, limit = 20, search = '' } = req.query;
        const { limit: l, offset, page: p } = getPagination(page, limit);
        const dateClause = getDateFilter(filter, 'ms.created_at');

        const searchLower = `%${search.toLowerCase()}%`;
        const searchClause = search ? `AND (c.name LIKE ? OR c.email LIKE ?)` : '';
        const searchParams = search ? [searchLower, searchLower] : [];

        const [[{ total }]] = await pool.query(`
            SELECT COUNT(*) as total 
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.interpreter_id IS NULL 
            AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)
            AND c.email NOT IN (?) ${searchClause}
            ${dateClause || `AND ms.created_at >= '${getPKTDate(-30)} 00:00:00'`}
        `, [EXCLUDED_EMAILS, ...searchParams]);

        // 1. All disconnected calls with customer details
        const [allPending] = await pool.query(`
            SELECT ms.*, c.name AS customer_name, c.email AS customer_email
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.interpreter_id IS NULL 
            AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)
            AND c.email NOT IN (?) ${searchClause}
            ${dateClause || `AND ms.created_at >= '${getPKTDate(-30)} 00:00:00'`}
            ORDER BY ms.created_at DESC
            LIMIT ? OFFSET ?
        `, [EXCLUDED_EMAILS, ...searchParams, l, offset]);

        // 2. Frequent users who have disconnected calls (Top 10)
        const [frequentPendingUsers] = await pool.query(`
            SELECT c.customer_id, c.name, c.email, COUNT(*) AS pending_count
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.interpreter_id IS NULL 
            AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = ms.monitoring_id)
            AND c.email NOT IN (?)
            ${dateClause || `AND ms.created_at >= '${getPKTDate(-30)} 00:00:00'`}
            GROUP BY c.customer_id
            ORDER BY pending_count DESC
            LIMIT 10
        `, [EXCLUDED_EMAILS]);

        const responseData = {
            allDisconnected: allPending,
            frequentDisconnectedUsers: frequentPendingUsers,
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

module.exports = { getPendingCalls };
