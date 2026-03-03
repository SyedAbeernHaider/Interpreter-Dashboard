const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Secret for signing JWT tokens
const JWT_SECRET = process.env.JWT_SECRET || 'ch_secret_2024_auth_key';

// Hardcoded credentials
const ADMIN_EMAILS = ['admin@connecthear.org'];
const ADMIN_PASSWORD = 'admin@123';

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const inputEmail = email.toLowerCase().trim();
    const isValidEmail = ADMIN_EMAILS.includes(inputEmail);

    if (!isValidEmail || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userEmail = inputEmail; // Use the one they provided

    // Generate stateless JWT token
    const token = jwt.sign(
        { email: userEmail, name: 'Admin' },
        JWT_SECRET,
        { expiresIn: '30d' }
    );

    res.json({ token, user: { email: userEmail, name: 'Admin' } });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    // Stateless auth - frontend just needs to delete the token
    res.json({ message: 'Logged out' });
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, user: { email: decoded.email, name: decoded.name } });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
});

module.exports = { authRoutes: router };
