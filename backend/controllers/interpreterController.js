const ExcelJS = require('exceljs');
const cache = require('../utils/cache');
const db = require('../services');

// GET /api/interpreters
const getAllInterpreters = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'all', page = 1, limit = 20, search = '' } = req.query;
        const data = await db.getAllInterpreters({ filter, page, limit, search });

        cache.set(cacheKey, data);
        res.json(data);
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
        const data = await db.getInterpreterById(id, filter);

        if (!data) return res.status(404).json({ error: 'Interpreter not found' });

        cache.set(cacheKey, data);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/interpreters/:id/export
const exportInterpreterCalls = async (req, res) => {
    try {
        const { id } = req.params;
        const { filter = 'all', tab = 'calls' } = req.query;

        const result = await db.getInterpreterCallsForExport(id, filter);
        if (!result) return res.status(404).json({ error: 'Interpreter not found' });

        const { interpreter, calls, missed } = result;
        const completedCallsData = calls.filter(c => c.status === 2);

        const workbook = new ExcelJS.Workbook();
        const activeTabLabel = tab === 'missed' ? 'Missed' : 'Completed';

        // Helper to add styling to headers
        const styleHeader = (sheet, row) => {
            row.eachCell(cell => {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            });
        };

        if (tab === 'missed') {
            const sheet = workbook.addWorksheet('Missed Calls');
            sheet.addRow(['Total Missed Calls', missed.length]).getCell(1).font = { bold: true };
            sheet.addRow([]);
            const header = sheet.addRow(['Date', 'Customer']);
            styleHeader(sheet, header);
            missed.forEach(m => {
                sheet.addRow([
                    new Date(m.missed_call_time).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }),
                    m.customer_name || m.user_name || 'Unknown'
                ]);
            });
            sheet.getColumn(1).width = 25;
            sheet.getColumn(2).width = 30;
        } else {
            const sheet = workbook.addWorksheet('Call History');
            sheet.addRow(['Total Completed Calls', completedCallsData.length]).getCell(1).font = { bold: true };
            sheet.addRow([]);
            const header = sheet.addRow(['Date', 'Customer', 'Type', 'Duration (s)']);
            styleHeader(sheet, header);
            completedCallsData.forEach(c => {
                sheet.addRow([
                    new Date(c.created_at).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }),
                    c.customer_name || 'N/A',
                    c.is_chat ? 'Chat' : 'Voice',
                    c.duration || 0
                ]);
            });
            sheet.getColumn(1).width = 25;
            sheet.getColumn(2).width = 30;
            sheet.getColumn(3).width = 15;
            sheet.getColumn(4).width = 15;
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition',
            `attachment; filename="${interpreter.name.replace(/\s+/g, '_')}_${activeTabLabel}_Analytics_${filter}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllInterpreters, getInterpreterById, exportInterpreterCalls };
