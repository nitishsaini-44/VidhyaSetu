const express = require('express');
const router = express.Router();
const {
  chat,
  generateRoadmap,
  analyzePerformance,
  getConversations,
  deleteConversation
} = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// @route   POST /api/ai/chat
// @desc    Chat with AI assistant
router.post('/chat', authorize('student', 'teacher'), chat);

// @route   POST /api/ai/generate-roadmap
// @desc    Generate personalized learning roadmap
router.post('/generate-roadmap', authorize('student'), generateRoadmap);

// @route   POST /api/ai/analyze-performance
// @desc    Analyze student performance
router.post('/analyze-performance', authorize('student'), analyzePerformance);

// @route   GET /api/ai/conversations
// @desc    Get user's conversation history
router.get('/conversations', authorize('student', 'teacher'), getConversations);

// @route   DELETE /api/ai/conversations/:id
// @desc    Delete a conversation
router.delete('/conversations/:id', authorize('student', 'teacher'), deleteConversation);

module.exports = router;
