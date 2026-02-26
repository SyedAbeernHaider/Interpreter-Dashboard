const express = require('express');
const router = express.Router();
const { getMissedCalls } = require('../controllers/missedCallController');

router.get('/', getMissedCalls);

module.exports = router;
