const express = require('express');
const router = express.Router();
const { getAllInterpreters, getInterpreterById } = require('../controllers/interpreterController');

router.get('/', getAllInterpreters);
router.get('/:id', getInterpreterById);

module.exports = router;
