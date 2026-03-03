const ExcelJS = require('exceljs');
const cache = require('../utils/cache');
const db = require('../services');

// GET /api/companies
const getAllCompanies = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'all', page = 1, limit = 20, search = '' } = req.query;
        const data = await db.getAllCompanies({ filter, page, limit, search });

        cache.set(cacheKey, data);
        res.json(data);
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
        const data = await db.getCompanyById(id, filter);

        if (!data) return res.status(404).json({ error: 'Company not found' });

        cache.set(cacheKey, data);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/companies/:id/export
const exportCompanyCalls = async (req, res) => {
    try {
        const { id } = req.params;
        const { filter = 'all' } = req.query;

        const result = await db.getCompanyCallsForExport(id, filter);
        if (!result) return res.status(404).json({ error: 'Company not found' });

        const { company, calls } = result;

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
                date: new Date(call.created_at).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }),
                customer: call.customer_name || 'N/A',
                email: call.customer_email || 'N/A',
                interpreter: call.interpreter_name || 'N/A',
                type: call.is_chat ? 'Chat' : 'Voice Call',
                status: statusLabel,
                duration: call.duration || 0,
            });
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition',
            `attachment; filename="${company.name.replace(/\s+/g, '_')}_Calls_${filter}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllCompanies, getCompanyById, exportCompanyCalls };
