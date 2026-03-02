const ExcelJS = require('exceljs');
const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPagination, getPKTDate } = require('../utils/queryHelpers');
const cache = require('../utils/cache');

// GET /api/interpreters
const getAllInterpreters = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'all', page = 1, limit = 20, search = '' } = req.query;
        const { limit: l, offset, page: p } = getPagination(page, limit);
        const msDateClause = getDateFilter(filter, 'ms.created_at');
        const inrDateClause = getDateFilter(filter, 'inr.missed_call_time');

        const searchLower = `%${search.toLowerCase()}%`;
        const searchClause = search ? `WHERE (name LIKE ? OR email LIKE ?)` : '';
        const searchParams = search ? [searchLower, searchLower] : [];

        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM interpreter ${searchClause}`, searchParams);

        const [rows] = await pool.query(`
            SELECT 
                i.*,
                COALESCE(ms_stats.total_calls, 0)     AS total_calls,
                COALESCE(ms_stats.accepted_calls, 0)  AS accepted_calls,
                COALESCE(inr_stats.missed_calls, 0)   AS missed_calls,
                ms_stats.last_call_time
            FROM interpreter i
            LEFT JOIN (
                SELECT 
                    ms.interpreter_id, 
                    COUNT(*)           AS total_calls,
                    SUM(ms.status = 2)    AS accepted_calls,
                    MAX(ms.created_at)    AS last_call_time
                FROM monitoring_sessions ms
                JOIN customers c ON ms.customer_id = c.customer_id
                WHERE c.email NOT IN (?) ${msDateClause}
                GROUP BY ms.interpreter_id
            ) ms_stats ON i.interpreter_id = ms_stats.interpreter_id
            LEFT JOIN (
                SELECT 
                    inr.interpreter_id,
                    COUNT(*) AS missed_calls
                FROM interpreter_notification_responses inr
                JOIN customers c ON inr.customer_id = c.customer_id
                WHERE c.email NOT IN (?) ${inrDateClause}
                GROUP BY inr.interpreter_id
            ) inr_stats ON i.interpreter_id = inr_stats.interpreter_id
            ${searchClause}
            ORDER BY i.name ASC
            LIMIT ? OFFSET ?
        `, [...searchParams, EXCLUDED_EMAILS, EXCLUDED_EMAILS, ...searchParams, l, offset]);

        const responseData = {
            data: rows,
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

// GET /api/interpreters/:id
const getInterpreterById = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { id } = req.params;
        const { filter = 'all' } = req.query;
        const dateFilter = getDateFilter(filter, 'ms.created_at');
        const inrDateFilter = getDateFilter(filter, 'inr.missed_call_time');

        const [[interpreter]] = await pool.query(
            `SELECT * FROM interpreter WHERE interpreter_id = ?`, [id]
        );
        if (!interpreter) return res.status(404).json({ error: 'Interpreter not found' });

        const [calls] = await pool.query(`
            SELECT ms.*, c.name AS customer_name, c.email AS customer_email
            FROM monitoring_sessions ms
            LEFT JOIN customers c ON c.customer_id = ms.customer_id
            WHERE ms.interpreter_id = ? AND c.email NOT IN (?) AND ms.status = 2 ${dateFilter}
            ORDER BY ms.created_at DESC
        `, [id, EXCLUDED_EMAILS]);

        const [missed] = await pool.query(`
            SELECT inr.*, c.name AS customer_name
            FROM interpreter_notification_responses inr
            LEFT JOIN customers c ON c.customer_id = inr.customer_id
            WHERE inr.interpreter_id = ? AND c.email NOT IN(?) ${inrDateFilter}
            ORDER BY inr.missed_call_time DESC
            `, [id, EXCLUDED_EMAILS]);

        const [dailyStats] = await pool.query(`
        SELECT
        DATE(ms.created_at) AS date,
            COUNT(*)         AS total,
                SUM(ms.status = 2)  AS completed
            FROM monitoring_sessions ms
            JOIN customers c ON ms.customer_id = c.customer_id
            WHERE ms.interpreter_id = ? AND c.email NOT IN(?) 
            AND ms.created_at >= '${getPKTDate(-30)} 00:00:00'
            GROUP BY DATE(ms.created_at)
            ORDER BY date ASC
        `, [id, EXCLUDED_EMAILS]);

        const responseData = { interpreter, calls, missed, dailyStats };
        cache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/interpreters/:id/export
const exportInterpreterCalls = async (req, res) => {
    try {
        const { id } = req.params;
        const { filter = 'all' } = req.query;
        const dateClause = getDateFilter(filter, 'ms.created_at');
        const inrDateClause = getDateFilter(filter, 'inr.missed_call_time');

        const [[interpreter]] = await pool.query(
            `SELECT name FROM interpreter WHERE interpreter_id = ? `, [id]
        );
        if (!interpreter) return res.status(404).json({ error: 'Interpreter not found' });

        // Fetch completed calls (status 2)
        const [calls] = await pool.query(`
            SELECT ms.*, c.name AS customer_name, c.email AS customer_email
            FROM monitoring_sessions ms
            LEFT JOIN customers c ON c.customer_id = ms.customer_id
            WHERE ms.interpreter_id = ? AND c.email NOT IN(?) AND ms.status = 2 ${dateClause}
            ORDER BY ms.created_at DESC
            `, [id, EXCLUDED_EMAILS]);

        // Fetch missed calls
        const [missed] = await pool.query(`
            SELECT inr.*, c.name AS customer_name, inr.user_name
            FROM interpreter_notification_responses inr
            LEFT JOIN customers c ON c.customer_id = inr.customer_id
            WHERE inr.interpreter_id = ? AND c.email NOT IN(?) ${inrDateClause}
            ORDER BY inr.missed_call_time DESC
        `, [id, EXCLUDED_EMAILS]);

        const completedCallsData = calls.filter(c => c.status === 2);

        const workbook = new ExcelJS.Workbook();

        // Sheet 1: Completed Calls
        const sheet1 = workbook.addWorksheet('Call History');

        // Summary Row
        const summary1 = sheet1.addRow(['Total Completed Calls', completedCallsData.length]);
        summary1.getCell(1).font = { bold: true };
        summary1.getCell(2).font = { bold: true };
        sheet1.addRow([]); // Spacer Row 2

        // Header Row 3
        const header1 = sheet1.addRow(['Date', 'Customer', 'Type', 'Duration (s)']);
        header1.eachCell(cell => {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        });

        // Data Rows
        completedCallsData.forEach(c => {
            sheet1.addRow([
                new Date(c.created_at).toLocaleString(),
                c.customer_name || 'N/A',
                c.is_chat ? 'Chat' : 'Voice',
                c.duration || 0
            ]);
        });

        // Column Widths
        sheet1.getColumn(1).width = 22;
        sheet1.getColumn(2).width = 25;
        sheet1.getColumn(3).width = 15;
        sheet1.getColumn(4).width = 15;

        // Sheet 2: Missed Calls
        const sheet2 = workbook.addWorksheet('Missed Calls');

        // Summary Row
        const summary2 = sheet2.addRow(['Total Missed Calls', missed.length]);
        summary2.getCell(1).font = { bold: true };
        summary2.getCell(2).font = { bold: true };
        sheet2.addRow([]); // Spacer Row 2

        // Header Row 3
        const header2 = sheet2.addRow(['Date', 'Customer']);
        header2.eachCell(cell => {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        });

        // Data Rows
        missed.forEach(m => {
            sheet2.addRow([
                new Date(m.missed_call_time).toLocaleString(),
                m.customer_name || m.user_name || 'Unknown'
            ]);
        });

        // Column Widths
        sheet2.getColumn(1).width = 22;
        sheet2.getColumn(2).width = 25;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename = "${interpreter.name.replace(/\s+/g, '_')}_Analytics_${filter}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllInterpreters, getInterpreterById, exportInterpreterCalls };
