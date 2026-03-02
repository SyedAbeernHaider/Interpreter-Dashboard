const ExcelJS = require('exceljs');
const pool = require('../config/db');
const { EXCLUDED_EMAILS } = require('../utils/excludeList');
const { getDateFilter, getPagination } = require('../utils/queryHelpers');
const cache = require('../utils/cache');

// GET /api/companies
const getAllCompanies = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'all', page = 1, limit = 20, search = '' } = req.query;
        const { limit: l, offset, page: p } = getPagination(page, limit);
        const dateClause = getDateFilter(filter, 'created_at');

        const searchLower = `%${search.toLowerCase()}%`;
        const searchClause = search ? `WHERE name LIKE ?` : '';
        const searchParams = search ? [searchLower] : [];

        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM companies ${searchClause}`, searchParams);

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
                WHERE 1=1 ${dateClause}
                GROUP BY customer_id
            ) ms_stats ON cu.customer_id = ms_stats.customer_id
            WHERE (cu.email NOT IN (?) OR cu.email IS NULL)
            ${search ? `AND co.name LIKE ?` : ''}
            GROUP BY co.company_id
            ORDER BY total_calls DESC
            LIMIT ? OFFSET ?
        `, [EXCLUDED_EMAILS, ...(search ? [searchLower] : []), l, offset]);

        // Aggregate stats across ALL companies (not just current page)
        const [[{ total_users_all, total_completed_all }]] = await pool.query(`
            SELECT 
                COUNT(DISTINCT cu.customer_id) AS total_users_all,
                COALESCE(SUM(ms_stats.completed_calls), 0) AS total_completed_all
            FROM companies co
            LEFT JOIN customers cu ON cu.company_id = co.company_id
            LEFT JOIN (
                SELECT customer_id, SUM(status = 2) AS completed_calls
                FROM monitoring_sessions
                WHERE 1=1 ${dateClause}
                GROUP BY customer_id
            ) ms_stats ON cu.customer_id = ms_stats.customer_id
            WHERE (cu.email NOT IN (?) OR cu.email IS NULL)
        `, [EXCLUDED_EMAILS]);

        const responseData = {
            data: rows,
            stats: {
                total_users: total_users_all,
                total_completed: total_completed_all
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

// GET /api/companies/:id
const getCompanyById = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { id } = req.params;
        const { filter = 'all' } = req.query;
        const dateFilter = getDateFilter(filter, 'ms.created_at');
        const userDateFilter = getDateFilter(filter, 'created_at'); // for ms_stats subquery

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
                WHERE 1=1 ${userDateFilter}
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
            WHERE cu.company_id = ? AND cu.email NOT IN (?) ${dateFilter}
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

        const responseData = { company, users, calls, dailyStats };
        cache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/companies/:id/export
const exportCompanyCalls = async (req, res) => {
    try {
        const { id } = req.params;
        const { filter = 'all' } = req.query;
        const dateFilter = getDateFilter(filter, 'ms.created_at');

        const [[company]] = await pool.query(
            `SELECT name FROM companies WHERE company_id = ?`, [id]
        );
        if (!company) return res.status(404).json({ error: 'Company not found' });

        const [calls] = await pool.query(`
            SELECT 
                ms.monitoring_id,
                ms.created_at,
                ms.duration,
                ms.status,
                ms.is_chat,
                cu.name AS customer_name,
                cu.email AS customer_email,
                i.name AS interpreter_name
            FROM monitoring_sessions ms
            LEFT JOIN customers cu ON cu.customer_id = ms.customer_id
            LEFT JOIN interpreter i ON i.interpreter_id = ms.interpreter_id
            WHERE cu.company_id = ? AND cu.email NOT IN (?) ${dateFilter}
            ORDER BY ms.created_at DESC
        `, [id, EXCLUDED_EMAILS]);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Call Records');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'Customer Email', key: 'email', width: 30 },
            { header: 'Interpreter', key: 'interpreter', width: 25 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Duration (s)', key: 'duration', width: 15 },
        ];

        calls.forEach(call => {
            let statusLabel = 'Unknown';
            if (call.status === 2) statusLabel = 'Completed';
            else if (call.status === 3) statusLabel = 'Cancelled';
            else if (call.status === 0) statusLabel = 'Disconnected';
            else if (call.status === 1) statusLabel = 'Connecting';
            else if (call.status === 4) statusLabel = 'In Session';

            worksheet.addRow({
                date: new Date(call.created_at).toLocaleString(),
                customer: call.customer_name || 'N/A',
                email: call.customer_email || 'N/A',
                interpreter: call.interpreter_name || 'N/A',
                type: call.is_chat ? 'Chat' : 'Voice Call',
                status: statusLabel,
                duration: call.duration || 0,
            });
        });

        // Header Style
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${company.name.replace(/\s+/g, '_')}_Calls_${filter}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllCompanies, getCompanyById, exportCompanyCalls };
