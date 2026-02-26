const express = require('express');
const router = express.Router();
const { getPendingCalls } = require('../controllers/pendingCallController');

router.get('/', getPendingCalls);

module.exports = router;
