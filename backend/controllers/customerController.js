const cache = require('../utils/cache');
const db = require('../services');

// GET /api/customers
const getAllCustomers = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { filter = 'all', page = 1, limit = 20, search = '', subFilter = 'all' } = req.query;
        const data = await db.getAllCustomers({ filter, page, limit, search, subFilter });

        cache.set(cacheKey, data);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/customers/:id
const getCustomerById = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const { id } = req.params;
        const { filter = 'all' } = req.query;
        const data = await db.getCustomerById(id, filter);

        if (!data) return res.status(404).json({ error: 'Customer not found' });

        cache.set(cacheKey, data);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllCustomers, getCustomerById };
