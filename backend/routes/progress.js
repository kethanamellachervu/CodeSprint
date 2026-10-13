const express = require('express');
const router = express.Router();
const {
  solveProblem,
  unsolveProblem,
  getProgress,
  getProgressStats,
  syncGuestProgress
} = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.post('/solve', protect, solveProblem);
router.delete('/solve/:problemId', protect, unsolveProblem);
router.get('/', protect, getProgress);
router.get('/stats', protect, getProgressStats);
router.post('/sync', protect, syncGuestProgress);

module.exports = router;
