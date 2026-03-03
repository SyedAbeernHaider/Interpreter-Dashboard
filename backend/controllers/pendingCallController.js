const cache = require('../utils/cache');
const db = require('../services');

// GET /api/pending-calls
const getPendingCalls = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'all', page = 1, limit = 20, search = '' } = req.query;
        const data = await db.getPendingCalls({ filter, page, limit, search });

        cache.set(cacheKey, data);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getPendingCalls };
