const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPKTDate } = require('../utils/queryHelpers');

/**
 * Overall dashboard stat counters.
 * @param {string} filter  'today' | 'yesterday' | '1week' | '1month' | 'all'
 */
async function getDashboardStats(filter = 'today') {
    const dateClause = getDateFilter(filter, 'created_at');
    const missedDateClause = getDateFilter(filter, 'missed_call_time');

    const [
        [[{ total_interpreters }]],
        [[{ active_interpreters }]],
        [[{ on_call }]],
        [[{ total_customers }]],
        [[{ completed_count }]],
        [[{ missed_count }]],
        [[{ cancelled_count }]],
        [[{ disconnected_count }]]
    ] = await Promise.all([
        pool.query(`SELECT COUNT(*) AS total_interpreters FROM vw_interpreter_list`),
        pool.query(`SELECT COUNT(*) AS active_interpreters FROM vw_interpreter_list WHERE online_status = 1`),
        pool.query(`SELECT COUNT(*) AS on_call FROM vw_interpreter_list WHERE on_call_status = 1`),
        pool.query(`SELECT COUNT(*) AS total_customers FROM vw_customer_list WHERE email NOT IN (?)`, [EXCLUDED_EMAILS]),
        pool.query(`
            SELECT COUNT(*) AS completed_count
            FROM vw_completed_sessions
            WHERE status = 2
              AND customer_email NOT IN (?) ${dateClause}
        `, [EXCLUDED_EMAILS]),
        pool.query(`
            SELECT COUNT(DISTINCT monitoring_id) AS missed_count
            FROM vw_missed_calls
            WHERE customer_email NOT IN (?) ${missedDateClause}
        `, [EXCLUDED_EMAILS]),
        pool.query(`
            SELECT COUNT(*) AS cancelled_count
            FROM vw_completed_sessions
            WHERE status = 3
              AND customer_email NOT IN (?) ${dateClause}
              AND NOT EXISTS (
                  SELECT 1 FROM interpreter_notification_responses inr
                  WHERE inr.monitoring_id = vw_completed_sessions.monitoring_id
              )
        `, [EXCLUDED_EMAILS]),
        pool.query(`
            SELECT COUNT(*) AS disconnected_count
            FROM vw_completed_sessions
            WHERE interpreter_id IS NULL
              AND customer_email NOT IN (?) ${dateClause}
              AND NOT EXISTS (
                  SELECT 1 FROM interpreter_notification_responses inr
                  WHERE inr.monitoring_id = vw_completed_sessions.monitoring_id
              )
        `, [EXCLUDED_EMAILS])
    ]);

    return {
        total_interpreters,
        active_interpreters,
        on_call,
        total_customers,
        calls_today: completed_count + missed_count,
        missed_today: missed_count,
        cancelled_today: cancelled_count,
        completed_today: completed_count,
        disconnected_today: disconnected_count
    };
}

/**
 * 7-day calls trend.
 */
async function getCallsTrend() {
    const weekAgo = getPKTDate(-7);

    const [
        [rows],
        [missedRows]
    ] = await Promise.all([
        pool.query(`
            SELECT
                DATE(created_at) AS date,
                SUM(status = 2)  AS completed,
                SUM(
                    status = 3
                    AND NOT EXISTS (
                        SELECT 1 FROM interpreter_notification_responses inr
                        WHERE inr.monitoring_id = vw_completed_sessions.monitoring_id
                    )
                ) AS cancelled,
                SUM(
                    interpreter_id IS NULL
                    AND NOT EXISTS (
                        SELECT 1 FROM interpreter_notification_responses inr
                        WHERE inr.monitoring_id = vw_completed_sessions.monitoring_id
                    )
                ) AS disconnected
            FROM vw_completed_sessions
            WHERE created_at >= '${weekAgo} 00:00:00'
              AND customer_email NOT IN (?)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [EXCLUDED_EMAILS]),
        pool.query(`
            SELECT
                DATE(missed_call_time) AS date,
                COUNT(DISTINCT monitoring_id) AS missed
            FROM vw_missed_calls
            WHERE missed_call_time >= '${weekAgo} 00:00:00'
              AND customer_email NOT IN (?)
            GROUP BY DATE(missed_call_time)
            ORDER BY date ASC
        `, [EXCLUDED_EMAILS])
    ]);

    const missedMap = {};
    missedRows.forEach(r => { missedMap[r.date] = r.missed; });

    return rows.map(r => ({
        ...r,
        missed: missedMap[r.date] || 0,
        total: (r.completed || 0) + (missedMap[r.date] || 0)
    }));
}

/**
 * Recent sessions (last 10).
 * @param {string} filter
 */
async function getRecentSessions(filter = 'today') {
    const dateClause = getDateFilter(filter, 'created_at');

    const [rows] = await pool.query(`
        SELECT *
        FROM vw_sessions_with_details
        WHERE (customer_email NOT IN (?) OR customer_email IS NULL) ${dateClause}
        ORDER BY created_at DESC
        LIMIT 10
    `, [EXCLUDED_EMAILS]);

    return rows;
}

/**
 * Interpreter online/oncall/offline counts.
 */
async function getInterpreterStatusCounts() {
    const [
        [[{ online }]],
        [[{ on_call }]],
        [[{ offline }]]
    ] = await Promise.all([
        pool.query(`SELECT COUNT(*) AS online FROM vw_interpreter_list WHERE online_status=1 AND on_call_status=0`),
        pool.query(`SELECT COUNT(*) AS on_call FROM vw_interpreter_list WHERE on_call_status=1`),
        pool.query(`SELECT COUNT(*) AS offline FROM vw_interpreter_list WHERE online_status=0`)
    ]);

    return [
        { name: 'Online', value: online },
        { name: 'On Call', value: on_call },
        { name: 'Offline', value: offline },
    ];
}

module.exports = {
    getDashboardStats,
    getCallsTrend,
    getRecentSessions,
    getInterpreterStatusCounts
};
