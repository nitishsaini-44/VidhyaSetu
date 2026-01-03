const express = require('express');
const router = express.Router();
const { 
  uploadResource, 
  getResources, 
  getResource, 
  generateQuiz,
  publishQuiz,
  getAvailableQuizzes,
  getQuizForAttempt,
  getTeacherQuizHistory,
  getQuizAttempts,
  getStudentQuizHistory,
  generateLessonPlan,
  deleteResource 
} = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All routes are protected
router.use(protect);

// @route   GET /api/resources/quizzes/teacher-history
// Get teacher's published quizzes with attempt statistics
router.get('/quizzes/teacher-history', authorize('teacher', 'management'), getTeacherQuizHistory);

// @route   GET /api/resources/quizzes/student-history
// Get student's quiz history
router.get('/quizzes/student-history', authorize('student'), getStudentQuizHistory);

// @route   GET /api/resources/quizzes/available
// Get all available quizzes for students
router.get('/quizzes/available', getAvailableQuizzes);

// @route   GET /api/resources/quizzes/:quizId/attempts
// Get detailed quiz attempts for a specific quiz
router.get('/quizzes/:quizId/attempts', authorize('teacher', 'management'), getQuizAttempts);

// @route   GET /api/resources/quizzes/:quizId
// Get single quiz for attempting
router.get('/quizzes/:quizId', getQuizForAttempt);

// @route   GET /api/resources
router.get('/', getResources);

// @route   GET /api/resources/:id
router.get('/:id', getResource);

// @route   POST /api/resources/upload
router.post('/upload', authorize('teacher', 'management'), upload.single('file'), uploadResource);

// @route   POST /api/resources/:id/generate-quiz
router.post('/:id/generate-quiz', authorize('teacher', 'management'), generateQuiz);

// @route   POST /api/resources/:id/publish-quiz
// Publish generated quiz to students
router.post('/:id/publish-quiz', authorize('teacher', 'management'), publishQuiz);

// @route   POST /api/resources/:id/generate-lesson-plan
router.post('/:id/generate-lesson-plan', authorize('teacher', 'management'), generateLessonPlan);

// @route   DELETE /api/resources/:id
router.delete('/:id', authorize('teacher', 'management'), deleteResource);

module.exports = router;
