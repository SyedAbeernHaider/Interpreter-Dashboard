const express = require('express');
const router = express.Router();
const { getStats, getCallsTrend, getRecentSessions, getInterpreterStatus } = require('../controllers/dashboardController');

router.get('/stats', getStats);
router.get('/calls-trend', getCallsTrend);
router.get('/recent-sessions', getRecentSessions);
router.get('/interpreter-status', getInterpreterStatus);

module.exports = router;
