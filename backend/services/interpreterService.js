const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPKTDate, getPagination } = require('../utils/queryHelpers');

/**
 * Paginated interpreter list with aggregated call stats.
 */
async function getAllInterpreters({ filter = 'all', page = 1, limit = 20, search = '' } = {}) {
    const { limit: l, offset, page: p } = getPagination(page, limit);
    const msDateClause = getDateFilter(filter, 'cs.created_at');
    const inrDateClause = getDateFilter(filter, 'mc.missed_call_time');

    const searchLower = `%${search.toLowerCase()}%`;
    const searchClause = search ? `WHERE (name LIKE ? OR email LIKE ?)` : '';
    const searchParams = search ? [searchLower, searchLower] : [];

    const [
        [[{ total }]],
        [rows]
    ] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM vw_interpreter_list ${searchClause}`, searchParams),
        pool.query(`
            SELECT
                il.*,
                COALESCE(ms_stats.total_calls,    0) AS total_calls,
                COALESCE(ms_stats.accepted_calls, 0) AS accepted_calls,
                COALESCE(inr_stats.missed_calls,  0) AS missed_calls,
                ms_stats.last_call_time
            FROM vw_interpreter_list il
            LEFT JOIN (
                SELECT
                    interpreter_id,
                    COUNT(*)           AS total_calls,
                    SUM(status = 2)    AS accepted_calls,
                    MAX(created_at)    AS last_call_time
                FROM vw_completed_sessions cs
                WHERE customer_email NOT IN (?) ${msDateClause}
                GROUP BY interpreter_id
            ) ms_stats ON il.interpreter_id = ms_stats.interpreter_id
            LEFT JOIN (
                SELECT
                    interpreter_id,
                    COUNT(*) AS missed_calls
                FROM vw_missed_calls mc
                WHERE customer_email NOT IN (?) ${inrDateClause}
                GROUP BY interpreter_id
            ) inr_stats ON il.interpreter_id = inr_stats.interpreter_id
            ${searchClause}
            ORDER BY il.name ASC
            LIMIT ? OFFSET ?
        `, [...searchParams, EXCLUDED_EMAILS, EXCLUDED_EMAILS, ...searchParams, l, offset])
    ]);

    return {
        data: rows,
        pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) }
    };
}

/**
 * Single interpreter detail + calls + missed calls + daily stats.
 */
async function getInterpreterById(id, filter = 'all') {
    const dateFilter = getDateFilter(filter, 'created_at');
    const inrDateFilter = getDateFilter(filter, 'missed_call_time');

    const [[interpreter]] = await pool.query(
        `SELECT * FROM vw_interpreter_list WHERE interpreter_id = ?`, [id]
    );
    if (!interpreter) return null;

    const chartDateClause = dateFilter || `AND created_at >= '${getPKTDate(-30)} 00:00:00'`;

    const [
        [calls],
        [missed],
        [dailyStats]
    ] = await Promise.all([
        pool.query(`
            SELECT * FROM vw_completed_sessions
            WHERE interpreter_id = ? AND customer_email NOT IN (?) AND status = 2 ${dateFilter}
            ORDER BY created_at DESC
        `, [id, EXCLUDED_EMAILS]),
        pool.query(`
            SELECT * FROM vw_missed_calls
            WHERE interpreter_id = ? AND customer_email NOT IN (?) ${inrDateFilter}
            ORDER BY missed_call_time DESC
        `, [id, EXCLUDED_EMAILS]),
        pool.query(`
            SELECT DATE(created_at) AS date, COUNT(*) AS total, SUM(status = 2) AS completed
            FROM vw_completed_sessions
            WHERE interpreter_id = ? AND customer_email NOT IN (?) ${chartDateClause}
            GROUP BY DATE(created_at) ORDER BY date ASC
        `, [id, EXCLUDED_EMAILS])
    ]);

    return { interpreter, calls, missed, dailyStats };
}

/**
 * Completed + missed calls for Excel export.
 */
async function getInterpreterCallsForExport(id, filter = 'all') {
    const dateClause = getDateFilter(filter, 'created_at');
    const inrDateClause = getDateFilter(filter, 'missed_call_time');

    const [[interpreter]] = await pool.query(
        `SELECT name FROM vw_interpreter_list WHERE interpreter_id = ?`, [id]
    );
    if (!interpreter) return null;

    const [
        [calls],
        [missed]
    ] = await Promise.all([
        pool.query(`
            SELECT * FROM vw_completed_sessions
            WHERE interpreter_id = ? AND customer_email NOT IN (?) AND status = 2 ${dateClause}
            ORDER BY created_at DESC
        `, [id, EXCLUDED_EMAILS]),
        pool.query(`
            SELECT * FROM vw_missed_calls
            WHERE interpreter_id = ? AND customer_email NOT IN (?) ${inrDateClause}
            ORDER BY missed_call_time DESC
        `, [id, EXCLUDED_EMAILS])
    ]);

    return { interpreter, calls, missed };
}

module.exports = {
    getAllInterpreters,
    getInterpreterById,
    getInterpreterCallsForExport
};
