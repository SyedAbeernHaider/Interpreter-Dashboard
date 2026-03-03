const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPagination } = require('../utils/queryHelpers');

/**
 * Paginated missed calls list.
 */
async function getMissedCalls({ filter = 'all', page = 1, limit = 20, search = '' } = {}) {
    const { limit: l, offset, page: p } = getPagination(page, limit);
    const dateClause = getDateFilter(filter, 'missed_call_time');

    const searchLower = `%${search.toLowerCase()}%`;
    const searchClause = search
        ? `AND (interpreter_name LIKE ? OR customer_name LIKE ? OR user_name LIKE ?)`
        : '';
    const searchParams = search ? [searchLower, searchLower, searchLower] : [];

    const [
        [[{ total }]],
        [rows],
        [[{ unique_interpreters, unique_customers }]]
    ] = await Promise.all([
        pool.query(`SELECT COUNT(DISTINCT monitoring_id, customer_id) as total FROM vw_missed_calls WHERE customer_email NOT IN (?) ${dateClause} ${searchClause}`, [EXCLUDED_EMAILS, ...searchParams]),
        pool.query(`SELECT * FROM vw_missed_calls WHERE customer_email NOT IN (?) ${dateClause} ${searchClause} ORDER BY missed_call_time DESC LIMIT ? OFFSET ?`, [EXCLUDED_EMAILS, ...searchParams, l, offset]),
        pool.query(`SELECT COUNT(DISTINCT interpreter_id) AS unique_interpreters, COUNT(DISTINCT customer_id) AS unique_customers FROM vw_missed_calls WHERE customer_email NOT IN (?) ${dateClause}`, [EXCLUDED_EMAILS])
    ]);

    return {
        data: rows,
        stats: { unique_interpreters, unique_customers },
        pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) }
    };
}

/**
 * Paginated disconnected/pending calls with frequent-user aggregation.
 * Uses vw_completed_sessions for the join, but filters to calls where
 * no interpreter handled the session and no notification was sent.
 */
async function getPendingCalls({ filter = 'all', page = 1, limit = 20, search = '' } = {}) {
    const { limit: l, offset, page: p } = getPagination(page, limit);
    const dateClause = getDateFilter(filter, 'created_at');

    const searchLower = `%${search.toLowerCase()}%`;
    const searchClause = search ? `AND (customer_name LIKE ? OR customer_email LIKE ?)` : '';
    const searchParams = search ? [searchLower, searchLower] : [];

    const [
        [[{ total }]],
        [allPending],
        [frequentPendingUsers]
    ] = await Promise.all([
        pool.query(`
            SELECT COUNT(*) as total FROM vw_completed_sessions WHERE interpreter_id IS NULL AND customer_email NOT IN (?) ${dateClause} ${searchClause}
            AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = vw_completed_sessions.monitoring_id)
        `, [EXCLUDED_EMAILS, ...searchParams]),
        pool.query(`
            SELECT * FROM vw_completed_sessions WHERE interpreter_id IS NULL AND customer_email NOT IN (?) ${dateClause} ${searchClause}
            AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = vw_completed_sessions.monitoring_id)
            ORDER BY created_at DESC LIMIT ? OFFSET ?
        `, [EXCLUDED_EMAILS, ...searchParams, l, offset]),
        pool.query(`
            SELECT customer_id, customer_name AS name, customer_email AS email, COUNT(*) AS pending_count
            FROM vw_completed_sessions WHERE interpreter_id IS NULL AND customer_email NOT IN (?) ${dateClause}
            AND NOT EXISTS (SELECT 1 FROM interpreter_notification_responses inr WHERE inr.monitoring_id = vw_completed_sessions.monitoring_id)
            GROUP BY customer_id, customer_name, customer_email ORDER BY pending_count DESC LIMIT 10
        `, [EXCLUDED_EMAILS])
    ]);

    return {
        allDisconnected: allPending,
        frequentDisconnectedUsers: frequentPendingUsers,
        pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) }
    };
}

module.exports = {
    getMissedCalls,
    getPendingCalls
};
