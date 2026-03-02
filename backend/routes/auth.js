const express = require('express');
const router = express.Router();

// Hardcoded credentials
const ADMIN_EMAIL = 'admin@connecthear.org';
const ADMIN_PASSWORD = 'admin@123';

// Simple token generator
function generateToken() {
    return 'ch_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// In-memory valid tokens set
const validTokens = new Set();

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken();
    validTokens.add(token);

    res.json({ token, user: { email: ADMIN_EMAIL, name: 'Admin' } });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) validTokens.delete(token);
    res.json({ message: 'Logged out' });
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || !validTokens.has(token)) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    res.json({ valid: true, user: { email: ADMIN_EMAIL, name: 'Admin' } });
});

module.exports = { authRoutes: router, validTokens };
