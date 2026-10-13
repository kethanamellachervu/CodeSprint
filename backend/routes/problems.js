const express = require('express');
const router = express.Router();
const { getProblems, getProblemById } = require('../controllers/problemController');

router.get('/', getProblems);
router.get('/:id', getProblemById);

module.exports = router;
