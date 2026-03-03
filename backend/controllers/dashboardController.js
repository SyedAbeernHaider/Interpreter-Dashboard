const cache = require('../utils/cache');
const db = require('../services');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'today' } = req.query;
        const responseData = await db.getDashboardStats(filter);

        cache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/calls-trend
const getCallsTrend = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const data = await db.getCallsTrend();
        cache.set(cacheKey, data);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/recent-sessions
const getRecentSessions = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'today' } = req.query;
        const rows = await db.getRecentSessions(filter);

        cache.set(cacheKey, rows);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/interpreter-status
const getInterpreterStatus = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const data = await db.getInterpreterStatusCounts();
        cache.set(cacheKey, data);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getStats, getCallsTrend, getRecentSessions, getInterpreterStatus };
