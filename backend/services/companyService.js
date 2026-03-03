const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPKTDate, getPagination } = require('../utils/queryHelpers');

/**
 * Paginated company list with aggregated call stats.
 */
async function getAllCompanies({ filter = 'all', page = 1, limit = 20, search = '' } = {}) {
    const { limit: l, offset, page: p } = getPagination(page, limit);
    const dateClause = getDateFilter(filter, 'created_at');

    const searchLower = `%${search.toLowerCase()}%`;
    const searchClause = search ? `WHERE name LIKE ?` : '';
    const searchParams = search ? [searchLower] : [];

    const [
        [[{ total }]],
        [rows],
        [[{ total_users_all, total_completed_all }]]
    ] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM vw_company_list ${searchClause}`, searchParams),
        pool.query(`
            SELECT
                cpl.*,
                COUNT(DISTINCT cl.customer_id)             AS total_users,
                COALESCE(SUM(ms_stats.total_calls), 0)     AS total_calls,
                COALESCE(SUM(ms_stats.completed_calls), 0) AS completed_calls,
                COALESCE(SUM(ms_stats.cancelled_calls), 0) AS cancelled_calls,
                MAX(ms_stats.last_call)                    AS last_call
            FROM vw_company_list cpl
            LEFT JOIN vw_customer_list cl ON cl.company_id = cpl.company_id
            LEFT JOIN (
                SELECT
                    customer_id,
                    COUNT(*)        AS total_calls,
                    SUM(status = 2) AS completed_calls,
                    SUM(status = 3) AS cancelled_calls,
                    MAX(created_at) AS last_call
                FROM vw_completed_sessions
                WHERE 1=1 ${dateClause}
                GROUP BY customer_id
            ) ms_stats ON cl.customer_id = ms_stats.customer_id
            WHERE (cl.email NOT IN (?) OR cl.email IS NULL)
            ${search ? `AND cpl.name LIKE ?` : ''}
            GROUP BY cpl.company_id
            ORDER BY total_calls DESC
            LIMIT ? OFFSET ?
        `, [EXCLUDED_EMAILS, ...(search ? [searchLower] : []), l, offset]),
        pool.query(`
            SELECT
                COUNT(DISTINCT cl.customer_id)             AS total_users_all,
                COALESCE(SUM(ms_stats.completed_calls), 0) AS total_completed_all
            FROM vw_company_list cpl
            LEFT JOIN vw_customer_list cl ON cl.company_id = cpl.company_id
            LEFT JOIN (
                SELECT customer_id, SUM(status = 2) AS completed_calls
                FROM vw_completed_sessions
                WHERE 1=1 ${dateClause}
                GROUP BY customer_id
            ) ms_stats ON cl.customer_id = ms_stats.customer_id
            WHERE (cl.email NOT IN (?) OR cl.email IS NULL)
        `, [EXCLUDED_EMAILS])
    ]);

    return {
        data: rows,
        stats: { total_users: total_users_all, total_completed: total_completed_all },
        pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) }
    };
}

/**
 * Single company detail + users + call history + daily stats.
 */
async function getCompanyById(id, filter = 'all') {
    const dateFilter = getDateFilter(filter, 'created_at');
    const userDateFilter = getDateFilter(filter, 'created_at');

    const [[company]] = await pool.query(
        `SELECT * FROM vw_company_list WHERE company_id = ?`, [id]
    );
    if (!company) return null;

    const chartDateClause = dateFilter || `AND created_at >= '${getPKTDate(-30)} 00:00:00'`;

    const [
        [users],
        [calls],
        [dailyStats]
    ] = await Promise.all([
        pool.query(`
            SELECT cl.*, COALESCE(ms_stats.total_calls, 0) AS total_calls, 
                   COALESCE(ms_stats.completed_calls, 0) AS completed_calls, 
                   COALESCE(ms_stats.cancelled_calls, 0) AS cancelled_calls, ms_stats.last_call
            FROM vw_customer_list cl
            LEFT JOIN (
                SELECT customer_id, COUNT(*) AS total_calls, SUM(status = 2) AS completed_calls, 
                       SUM(status = 3) AS cancelled_calls, MAX(created_at) AS last_call
                FROM vw_completed_sessions WHERE 1=1 ${userDateFilter} GROUP BY customer_id
            ) ms_stats ON cl.customer_id = ms_stats.customer_id
            WHERE cl.company_id = ? AND cl.email NOT IN (?) ORDER BY total_calls DESC
        `, [id, EXCLUDED_EMAILS]),
        pool.query(`
            SELECT * FROM vw_completed_sessions WHERE customer_company_id = ? AND customer_email NOT IN (?) ${dateFilter} 
            ORDER BY created_at DESC LIMIT 200
        `, [id, EXCLUDED_EMAILS]),
        pool.query(`
            SELECT DATE(created_at) AS date, COUNT(*) AS total, SUM(status = 2) AS completed, SUM(status = 3) AS cancelled
            FROM vw_completed_sessions WHERE customer_company_id = ? AND customer_email NOT IN (?) ${chartDateClause}
            GROUP BY DATE(created_at) ORDER BY date ASC
        `, [id, EXCLUDED_EMAILS])
    ]);

    return { company, users, calls, dailyStats };
}

/**
 * Company calls for Excel export.
 */
async function getCompanyCallsForExport(id, filter = 'all') {
    const dateFilter = getDateFilter(filter, 'created_at');

    const [[company]] = await pool.query(
        `SELECT name FROM vw_company_list WHERE company_id = ?`, [id]
    );
    if (!company) return null;

    const [calls] = await pool.query(`
        SELECT *
        FROM vw_completed_sessions
        WHERE customer_company_id = ?
          AND customer_email NOT IN (?) ${dateFilter}
        ORDER BY created_at DESC
    `, [id, EXCLUDED_EMAILS]);

    return { company, calls };
}

module.exports = {
    getAllCompanies,
    getCompanyById,
    getCompanyCallsForExport
};
