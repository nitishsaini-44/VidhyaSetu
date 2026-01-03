const express = require('express');
const router = express.Router();
const {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
  addStudentToClass,
  seedClasses,
  getClassesWithStudents
} = require('../controllers/classController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// @route   GET /api/classes
router.get('/', getClasses);

// @route   GET /api/classes/with-students - Get classes that have enrolled students
router.get('/with-students', authorize('teacher', 'management'), getClassesWithStudents);

// @route   POST /api/classes/seed - Seed initial classes
router.post('/seed', authorize('management'), seedClasses);

// @route   GET /api/classes/:id
router.get('/:id', getClassById);

// @route   POST /api/classes
router.post('/', authorize('management'), createClass);

// @route   PUT /api/classes/:id
router.put('/:id', authorize('management'), updateClass);

// @route   DELETE /api/classes/:id
router.delete('/:id', authorize('management'), deleteClass);

// @route   GET /api/classes/:id/students
router.get('/:id/students', getClassStudents);

// @route   POST /api/classes/:id/students
router.post('/:id/students', authorize('teacher', 'management'), addStudentToClass);

module.exports = router;
