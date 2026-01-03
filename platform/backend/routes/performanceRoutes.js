const express = require('express');
const router = express.Router();
const { 
  getPerformance, 
  submitQuiz, 
  getPerformanceStats,
  aiQuery,
  getLeaderboard,
  getClassStats
} = require('../controllers/performanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// @route   GET /api/performance
router.get('/', getPerformance);

// @route   GET /api/performance/stats
router.get('/stats', getPerformanceStats);

// @route   GET /api/performance/leaderboard
// @desc    Get top performing students
router.get('/leaderboard', authorize('teacher', 'management'), getLeaderboard);

// @route   GET /api/performance/class-stats
// @desc    Get class-wide performance statistics
router.get('/class-stats', authorize('teacher', 'management'), getClassStats);

// @route   POST /api/performance/submit-quiz
router.post('/submit-quiz', authorize('student'), submitQuiz);

// @route   POST /api/performance/ai-query
router.post('/ai-query', authorize('teacher', 'management'), aiQuery);

module.exports = router;
