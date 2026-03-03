const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPKTDate, getPagination } = require('../utils/queryHelpers');

/**
 * Paginated customer list with aggregated call stats.
 */
async function getAllCustomers({ filter = 'all', page = 1, limit = 20, search = '', subFilter = 'all' } = {}) {
    const { limit: l, offset, page: p } = getPagination(page, limit);
    const msDateClause = getDateFilter(filter, 'created_at');
    const inrDateClause = getDateFilter(filter, 'missed_call_time');

    const searchLower = `%${search.toLowerCase()}%`;
    const searchClause = search ? `AND (cl.name LIKE ? OR cl.email LIKE ?)` : '';
    const searchParams = search ? [searchLower, searchLower] : [];

    // Sub-queries for statistics
    const statsQuery = `
        SELECT
            cl.customer_id,
            COALESCE(ms_stats.total_calls,    0) AS total_calls,
            COALESCE(ms_stats.completed_calls, 0) AS completed_calls,
            COALESCE(ms_stats.cancelled_calls, 0) AS cancelled_calls,
            COALESCE(inr_stats.missed_by_interpreters, 0) AS missed_by_interpreters,
            ms_stats.last_call,
            COALESCE(monthly_consistency.min_monthly_calls, 0) AS min_monthly_calls,
            (COALESCE(monthly_consistency.min_monthly_calls, 0) >= 2 AND ms_stats.last_call >= DATE_SUB(NOW(), INTERVAL 45 DAY)) AS is_frequent
        FROM vw_customer_list cl
        LEFT JOIN (
            SELECT
                customer_id,
                COUNT(*)        AS total_calls,
                SUM(status = 2) AS completed_calls,
                SUM(status = 3) AS cancelled_calls,
                MAX(created_at) AS last_call
            FROM vw_completed_sessions
            WHERE 1=1 ${msDateClause}
            GROUP BY customer_id
        ) ms_stats ON cl.customer_id = ms_stats.customer_id
        LEFT JOIN (
            SELECT
                customer_id,
                COUNT(*) AS missed_by_interpreters
            FROM vw_missed_calls
            WHERE 1=1 ${inrDateClause}
            GROUP BY customer_id
        ) inr_stats ON cl.customer_id = inr_stats.customer_id
        LEFT JOIN (
            SELECT customer_id, MIN(monthly_total) as min_monthly_calls
            FROM (
                SELECT customer_id, DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as monthly_total
                FROM vw_completed_sessions
                WHERE status = 2 AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                GROUP BY customer_id, month
            ) AS mstats
            GROUP BY customer_id
        ) monthly_consistency ON cl.customer_id = monthly_consistency.customer_id
        WHERE cl.email NOT IN (?) ${searchClause}
    `;

    // Apply sub-filters
    let subFilterClause = '';
    const recencyLimit = "DATE_SUB(NOW(), INTERVAL 45 DAY)";
    if (subFilter === 'frequent') {
        subFilterClause = `WHERE min_monthly_calls >= 2 AND last_call >= ${recencyLimit}`;
    } else if (subFilter === 'neglected') {
        subFilterClause = 'WHERE total_calls > 0 AND missed_by_interpreters / GREATEST(total_calls, 1) > 0.4';
    } else if (subFilter === 'both') {
        subFilterClause = `WHERE min_monthly_calls >= 2 AND last_call >= ${recencyLimit} AND total_calls > 0 AND missed_by_interpreters / GREATEST(total_calls, 1) > 0.4`;
    }

    const finalQuery = `
        SELECT cl_main.*, stats.*
        FROM vw_customer_list cl_main
        JOIN (${statsQuery}) stats ON cl_main.customer_id = stats.customer_id
        ${subFilterClause}
        ORDER BY total_calls DESC
        LIMIT ? OFFSET ?
    `;

    const countQuery = `
        SELECT COUNT(*) as total
        FROM vw_customer_list cl_main
        JOIN (${statsQuery}) stats ON cl_main.customer_id = stats.customer_id
        ${subFilterClause}
    `;

    const [
        [[{ total }]],
        [rows],
        [[{ frequent_count }]],
        [[{ neglected_count }]],
        [[{ both_count }]]
    ] = await Promise.all([
        pool.query(countQuery, [EXCLUDED_EMAILS, ...searchParams]),
        pool.query(finalQuery, [EXCLUDED_EMAILS, ...searchParams, l, offset]),
        pool.query(`
            SELECT COUNT(*) AS frequent_count FROM (
                SELECT monthly_stats.customer_id
                FROM (
                    SELECT customer_id, DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as monthly_total, MAX(created_at) as last_call
                    FROM vw_completed_sessions
                    WHERE status = 2 AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    GROUP BY customer_id, month
                ) AS monthly_stats
                INNER JOIN (
                    SELECT customer_id FROM vw_completed_sessions WHERE 1=1 ${msDateClause} GROUP BY customer_id
                ) AS active_period ON monthly_stats.customer_id = active_period.customer_id
                WHERE monthly_stats.customer_id NOT IN (
                    SELECT id FROM (SELECT cl.customer_id as id FROM vw_customer_list cl WHERE cl.email IN (?)) as ex
                )
                GROUP BY monthly_stats.customer_id
                HAVING MIN(monthly_total) >= 2 AND MAX(last_call) >= DATE_SUB(NOW(), INTERVAL 45 DAY)
            ) AS final
        `, [EXCLUDED_EMAILS]),
        pool.query(`
            SELECT COUNT(*) AS neglected_count FROM (
                SELECT cl.customer_id
                FROM vw_customer_list cl
                LEFT JOIN (
                    SELECT customer_id, COUNT(*) AS total_calls
                    FROM vw_completed_sessions
                    WHERE 1=1 ${msDateClause}
                    GROUP BY customer_id
                ) ms ON cl.customer_id = ms.customer_id
                LEFT JOIN (
                    SELECT customer_id, COUNT(*) AS missed
                    FROM vw_missed_calls
                    WHERE 1=1 ${inrDateClause}
                    GROUP BY customer_id
                ) inr ON cl.customer_id = inr.customer_id
                WHERE cl.email NOT IN (?)
                  AND COALESCE(ms.total_calls, 0) > 0
                  AND COALESCE(inr.missed, 0) > 0
                  AND COALESCE(inr.missed, 0) / GREATEST(COALESCE(ms.total_calls, 0), 1) > 0.4
            ) sub
        `, [EXCLUDED_EMAILS]),
        pool.query(`
            SELECT COUNT(*) AS both_count FROM (
                SELECT cl.customer_id
                FROM vw_customer_list cl
                LEFT JOIN (
                    SELECT customer_id, COUNT(*) AS total_calls
                    FROM vw_completed_sessions
                    WHERE 1=1 ${msDateClause}
                    GROUP BY customer_id
                ) ms ON cl.customer_id = ms.customer_id
                LEFT JOIN (
                    SELECT customer_id, COUNT(*) AS missed
                    FROM vw_missed_calls
                    WHERE 1=1 ${inrDateClause}
                    GROUP BY customer_id
                ) inr ON cl.customer_id = inr.customer_id
                LEFT JOIN (
                    SELECT customer_id, MIN(monthly_total) as min_monthly_calls, MAX(last_month_call) as last_call
                    FROM (
                        SELECT customer_id, DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as monthly_total, MAX(created_at) as last_month_call
                        FROM vw_completed_sessions
                        WHERE status = 2 AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                        GROUP BY customer_id, month
                    ) AS mstats
                    GROUP BY customer_id
                ) monthly_consistency ON cl.customer_id = monthly_consistency.customer_id
                WHERE cl.email NOT IN (?)
                  AND COALESCE(monthly_consistency.min_monthly_calls, 0) >= 2
                  AND COALESCE(monthly_consistency.last_call, '1970-01-01') >= DATE_SUB(NOW(), INTERVAL 45 DAY)
                  AND COALESCE(ms.total_calls, 0) > 0
                  AND COALESCE(inr.missed, 0) > 0
                  AND COALESCE(inr.missed, 0) / GREATEST(COALESCE(ms.total_calls, 0), 1) > 0.4
            ) sub
        `, [EXCLUDED_EMAILS])
    ]);

    return {
        data: rows,
        stats: { frequent_count, neglected_count, both_count },
        pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) }
    };
}

/**
 * Single customer detail + call history + missed-by-interpreters.
 */
async function getCustomerById(id, filter = 'all') {
    const dateFilter = getDateFilter(filter, 'created_at');
    const inrDateFilter = getDateFilter(filter, 'missed_call_time');

    const [[customer]] = await pool.query(
        `SELECT * FROM vw_customer_list WHERE customer_id = ? AND email NOT IN (?)`,
        [id, EXCLUDED_EMAILS]
    );
    if (!customer) return null;

    const [
        [calls],
        [missedByInterpreters]
    ] = await Promise.all([
        pool.query(`SELECT * FROM vw_completed_sessions WHERE customer_id = ? ${dateFilter} ORDER BY created_at DESC`, [id]),
        pool.query(`SELECT * FROM vw_missed_calls WHERE customer_id = ? ${inrDateFilter} ORDER BY missed_call_time DESC`, [id])
    ]);

    return { customer, calls, missedByInterpreters };
}

module.exports = {
    getAllCustomers,
    getCustomerById
};
