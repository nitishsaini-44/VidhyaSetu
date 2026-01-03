const express = require('express');
const router = express.Router();
const {
  getFRStudents,
  getFRStats,
  registerStudentFR,
  removeStudentFR,
  getFRAttendance,
  syncAttendance,
  startRecognition,
  stopRecognition,
  getServerStatus,
  clearAttendance,
  recognizeFace,
  getConfig,
  bulkRegister,
  markMyAttendance,
  getMyFRStatus
} = require('../controllers/faceRecognitionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// @route   GET /api/face-recognition/status
// @desc    Get FR server status
router.get('/status', authorize('teacher', 'management'), getServerStatus);

// @route   GET /api/face-recognition/config
// @desc    Get API configuration status
router.get('/config', authorize('management'), getConfig);

// @route   GET /api/face-recognition/students
// @desc    Get all registered students in FR system
router.get('/students', authorize('management'), getFRStudents);

// @route   GET /api/face-recognition/stats
// @desc    Get FR system statistics
router.get('/stats', authorize('management'), getFRStats);

// @route   GET /api/face-recognition/attendance
// @desc    Get today's attendance from FR system
router.get('/attendance', authorize('teacher', 'management'), getFRAttendance);

// @route   POST /api/face-recognition/register
// @desc    Register a student in FR system
router.post('/register', authorize('management'), registerStudentFR);

// @route   POST /api/face-recognition/bulk-register
// @desc    Bulk register students in FR system
router.post('/bulk-register', authorize('management'), bulkRegister);

// @route   POST /api/face-recognition/recognize
// @desc    Recognize face and mark attendance
router.post('/recognize', authorize('teacher', 'management'), recognizeFace);

// @route   DELETE /api/face-recognition/remove/:studentId
// @desc    Remove a student from FR system
router.delete('/remove/:studentId', authorize('management'), removeStudentFR);

// @route   POST /api/face-recognition/sync-attendance
// @desc    Sync attendance from FR system to platform
router.post('/sync-attendance', authorize('management'), syncAttendance);

// @route   POST /api/face-recognition/start
// @desc    Start face recognition on FR server
router.post('/start', authorize('teacher', 'management'), startRecognition);

// @route   POST /api/face-recognition/stop
// @desc    Stop face recognition on FR server
router.post('/stop', authorize('teacher', 'management'), stopRecognition);

// @route   POST /api/face-recognition/clear-attendance
// @desc    Clear today's attendance records
router.post('/clear-attendance', authorize('management'), clearAttendance);

// ==================== STUDENT ENDPOINTS ====================

// @route   GET /api/face-recognition/my-status
// @desc    Get student's face recognition status and today's attendance
router.get('/my-status', authorize('student'), getMyFRStatus);

// @route   POST /api/face-recognition/mark-my-attendance
// @desc    Student marks their own attendance via face recognition
router.post('/mark-my-attendance', authorize('student'), markMyAttendance);

module.exports = router;
