const faceRecognitionService = require('../services/faceRecognitionService');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// @desc    Get service status
// @route   GET /api/face-recognition/status
// @access  Private (Teacher/Management)
const getServerStatus = async (req, res) => {
  try {
    const status = faceRecognitionService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      online: false, 
      message: error.message 
    });
  }
};

// @desc    Get all registered students in face recognition system
// @route   GET /api/face-recognition/students
// @access  Private (Management)
const getFRStudents = async (req, res) => {
  try {
    const students = faceRecognitionService.getAllStudents();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching FR students', error: error.message });
  }
};

// @desc    Get face recognition system stats
// @route   GET /api/face-recognition/stats
// @access  Private (Management)
const getFRStats = async (req, res) => {
  try {
    const stats = faceRecognitionService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching FR stats', error: error.message });
  }
};

// @desc    Register a student in face recognition system
// @route   POST /api/face-recognition/register
// @access  Private (Management)
const registerStudentFR = async (req, res) => {
  try {
    const { student_id, name, image_data, platform_user_id } = req.body;

    if (!student_id || !name) {
      return res.status(400).json({ message: 'Student ID and Name are required' });
    }

    if (!image_data) {
      return res.status(400).json({ message: 'Image is required (capture from camera)' });
    }

    // Register face using the service
    const result = await faceRecognitionService.registerFace(student_id, name, image_data);

    // If successful and platform_user_id provided, update user record
    if (result.success && platform_user_id) {
      try {
        await User.findByIdAndUpdate(platform_user_id, {
          'studentInfo.faceRegistered': true,
          'studentInfo.faceRegistrationId': student_id
        });
      } catch (dbError) {
        console.error('Failed to update user record:', dbError);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error registering student' 
    });
  }
};

// @desc    Remove a student from face recognition system
// @route   DELETE /api/face-recognition/remove/:studentId
// @access  Private (Management)
const removeStudentFR = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const result = await faceRecognitionService.removeFace(studentId);

    // Update platform user record if exists
    if (result.success) {
      try {
        await User.findOneAndUpdate(
          { 'studentInfo.faceRegistrationId': studentId },
          {
            'studentInfo.faceRegistered': false,
            'studentInfo.faceRegistrationId': null
          }
        );
      } catch (dbError) {
        console.error('Failed to update user record:', dbError);
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error removing student' 
    });
  }
};

// @desc    Recognize face and mark attendance
// @route   POST /api/face-recognition/recognize
// @access  Private (Teacher/Management)
const recognizeFace = async (req, res) => {
  try {
    const { image_data, class_id } = req.body;

    if (!image_data) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    // Recognize face
    const result = await faceRecognitionService.recognizeFace(image_data);

    if (result.success && result.recognized) {
      // Mark attendance in local FR system
      const attendanceResult = faceRecognitionService.markAttendance(
        result.studentId,
        result.name,
        result.confidence
      );

      // Also save attendance to database
      let dbAttendanceResult = null;
      try {
        dbAttendanceResult = await saveAttendanceToDatabase(
          result.studentId,
          result.name,
          result.confidence,
          class_id,
          req.user?._id
        );
      } catch (dbError) {
        console.error('Failed to save attendance to database:', dbError);
      }

      return res.json({
        ...result,
        attendance: attendanceResult,
        dbAttendance: dbAttendanceResult
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Recognition error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error recognizing face' 
    });
  }
};

// Helper function to save face recognition attendance to database
const saveAttendanceToDatabase = async (studentId, studentName, confidence, classId, markedById) => {
  try {
    // Find the user by face registration ID
    const user = await User.findOne({
      'studentInfo.faceRegistrationId': studentId
    });

    if (!user) {
      console.log(`User not found for faceRegistrationId: ${studentId}`);
      return { success: false, message: 'User not linked to platform' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Determine class to use
    const attendanceClass = classId || user.studentInfo?.class;
    
    if (!attendanceClass) {
      return { success: false, message: 'No class assigned to student' };
    }

    // Check if attendance record exists for today and this class
    let attendance = await Attendance.findOne({
      date: { $gte: today, $lt: tomorrow },
      class: attendanceClass
    });

    if (!attendance) {
      // Create new attendance record for today
      attendance = new Attendance({
        date: new Date(),
        class: attendanceClass,
        session: 'full-day',
        records: [],
        markedBy: markedById || user._id, // Use the user themselves if no teacher
        summary: { totalStudents: 0, present: 0, absent: 0, late: 0, excused: 0 }
      });
    }

    // Check if student already marked present today
    const existingRecord = attendance.records.find(
      r => r.student.toString() === user._id.toString()
    );

    if (existingRecord) {
      return { 
        success: true, 
        message: 'Attendance already marked for today',
        alreadyMarked: true,
        studentName: user.name
      };
    }

    // Determine status based on time (e.g., late if after 9:30 AM)
    const now = new Date();
    const lateThreshold = new Date();
    lateThreshold.setHours(9, 30, 0, 0); // 9:30 AM
    const status = now > lateThreshold ? 'late' : 'present';

    // Add the attendance record
    attendance.records.push({
      student: user._id,
      status: status,
      markedAt: new Date(),
      markedMethod: 'face-recognition',
      confidenceScore: confidence / 100, // Convert to 0-1 scale
      arrivalTime: new Date(),
      remarks: `Marked via Face Recognition (Confidence: ${confidence}%)`
    });

    await attendance.save();

    console.log(`Attendance saved for ${user.name} (${studentId}) - Status: ${status}`);

    return {
      success: true,
      message: `Attendance marked as ${status}`,
      studentName: user.name,
      status: status,
      time: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error saving attendance to database:', error);
    return { success: false, message: error.message };
  }
};

// @desc    Get today's attendance from face recognition system
// @route   GET /api/face-recognition/attendance
// @access  Private (Teacher/Management)
const getFRAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    
    let attendance;
    if (date) {
      attendance = faceRecognitionService.getAttendanceByDate(date);
    } else {
      attendance = faceRecognitionService.getTodayAttendance();
    }
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};

// @desc    Sync attendance from FR system to platform database
// @route   POST /api/face-recognition/sync-attendance
// @access  Private (Management)
const syncAttendance = async (req, res) => {
  try {
    const { class_id, subject_id, date } = req.body;
    const teacherId = req.user._id;
    
    // Get attendance from FR system
    const frAttendance = date 
      ? faceRecognitionService.getAttendanceByDate(date)
      : faceRecognitionService.getTodayAttendance();
    
    if (!frAttendance || frAttendance.length === 0) {
      return res.json({ message: 'No attendance records to sync', synced: 0 });
    }

    let syncedCount = 0;
    const syncErrors = [];
    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // Process each attendance record
    for (const record of frAttendance) {
      try {
        // Find user by face registration ID
        const user = await User.findOne({
          'studentInfo.faceRegistrationId': record.student_id
        });

        if (user) {
          // Check if attendance already exists
          const existingAttendance = await Attendance.findOne({
            student: user._id,
            date: {
              $gte: new Date(attendanceDate),
              $lt: new Date(new Date(attendanceDate).setDate(new Date(attendanceDate).getDate() + 1))
            }
          });

          if (!existingAttendance) {
            // Create new attendance record
            await Attendance.create({
              student: user._id,
              class: class_id || user.studentInfo?.class,
              subject: subject_id,
              date: new Date(record.time || attendanceDate),
              status: 'present',
              markedBy: teacherId,
              method: 'face_recognition',
              metadata: {
                confidence: record.confidence,
                recognitionTime: record.time
              }
            });
            syncedCount++;
          }
        } else {
          syncErrors.push({
            student_id: record.student_id,
            error: 'User not found in platform'
          });
        }
      } catch (err) {
        syncErrors.push({
          student_id: record.student_id,
          error: err.message
        });
      }
    }

    res.json({ 
      message: 'Attendance sync completed', 
      synced: syncedCount,
      total: frAttendance.length,
      errors: syncErrors.length > 0 ? syncErrors : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Error syncing attendance', error: error.message });
  }
};

// @desc    Start face recognition mode (continuous recognition)
// @route   POST /api/face-recognition/start
// @access  Private (Teacher/Management)
const startRecognition = async (req, res) => {
  try {
    // In API-based mode, recognition is done per-request
    // This endpoint can be used to initialize/validate the service
    const status = faceRecognitionService.getStatus();
    
    if (!status.api_configured && status.provider !== 'local') {
      return res.status(400).json({
        success: false,
        message: 'Face Recognition API not configured. Please set up API keys in environment variables.'
      });
    }

    res.json({
      success: true,
      message: 'Face Recognition service is ready',
      provider: status.provider,
      instructions: 'Use POST /api/face-recognition/recognize with image_data to recognize faces'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error starting recognition', error: error.message });
  }
};

// @desc    Stop face recognition mode
// @route   POST /api/face-recognition/stop
// @access  Private (Teacher/Management)
const stopRecognition = async (req, res) => {
  try {
    // In API-based mode, there's no continuous process to stop
    res.json({
      success: true,
      message: 'Recognition mode stopped'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error stopping recognition', error: error.message });
  }
};

// @desc    Clear today's attendance on FR system
// @route   POST /api/face-recognition/clear-attendance
// @access  Private (Management)
const clearAttendance = async (req, res) => {
  try {
    const result = faceRecognitionService.clearTodayAttendance();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error clearing attendance', error: error.message });
  }
};

// @desc    Get API configuration status
// @route   GET /api/face-recognition/config
// @access  Private (Management)
const getConfig = async (req, res) => {
  try {
    const status = faceRecognitionService.getStatus();
    res.json({
      provider: status.provider,
      configured: status.api_configured,
      supportedProviders: ['azure', 'facepp', 'aws', 'local'],
      instructions: {
        azure: 'Set AZURE_FACE_ENDPOINT and AZURE_FACE_API_KEY environment variables',
        facepp: 'Set FACEPP_API_KEY and FACEPP_API_SECRET environment variables',
        aws: 'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables',
        local: 'No configuration needed (limited functionality)'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error getting config', error: error.message });
  }
};

// @desc    Bulk register students
// @route   POST /api/face-recognition/bulk-register
// @access  Private (Management)
const bulkRegister = async (req, res) => {
  try {
    const { students } = req.body;
    
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Students array is required' });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const student of students) {
      try {
        if (!student.student_id || !student.name || !student.image_data) {
          results.failed.push({
            student_id: student.student_id,
            error: 'Missing required fields'
          });
          continue;
        }

        const result = await faceRecognitionService.registerFace(
          student.student_id,
          student.name,
          student.image_data
        );

        if (result.success) {
          results.success.push(result);
          
          // Update platform user if exists
          if (student.platform_user_id) {
            try {
              await User.findByIdAndUpdate(student.platform_user_id, {
                'studentInfo.faceRegistered': true,
                'studentInfo.faceRegistrationId': student.student_id
              });
            } catch (dbError) {
              console.error('Failed to update user record:', dbError);
            }
          }
        } else {
          results.failed.push({
            student_id: student.student_id,
            error: result.message
          });
        }
      } catch (error) {
        results.failed.push({
          student_id: student.student_id,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Bulk registration completed',
      registered: results.success.length,
      failed: results.failed.length,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Error in bulk registration', error: error.message });
  }
};

// @desc    Student marks their own attendance via face recognition
// @route   POST /api/face-recognition/mark-my-attendance
// @access  Private (Student)
const markMyAttendance = async (req, res) => {
  try {
    const { image_data } = req.body;
    const studentUser = req.user;

    if (!image_data) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    // Check if user is a student
    if (studentUser.role !== 'student') {
      return res.status(403).json({ message: 'Only students can use this endpoint' });
    }

    // Check if student has face registered
    if (!studentUser.studentInfo?.faceRegistered || !studentUser.studentInfo?.faceRegistrationId) {
      return res.status(400).json({ 
        message: 'Your face is not registered. Please contact management to register your face first.',
        faceRegistered: false
      });
    }

    // Recognize face
    const result = await faceRecognitionService.recognizeFace(image_data);

    if (!result.success) {
      return res.status(400).json({ 
        success: false,
        message: 'Face recognition failed. Please try again.'
      });
    }

    if (!result.recognized) {
      return res.status(400).json({ 
        success: false,
        message: 'Face not recognized. Please ensure good lighting and face the camera directly.'
      });
    }

    // Verify the recognized face matches the logged-in student
    if (result.studentId !== studentUser.studentInfo.faceRegistrationId) {
      return res.status(403).json({ 
        success: false,
        message: 'Face does not match your registered profile. Please use your own face to mark attendance.'
      });
    }

    // Mark attendance in local FR system
    const attendanceResult = faceRecognitionService.markAttendance(
      result.studentId,
      result.name,
      result.confidence
    );

    // Save attendance to database
    const dbResult = await saveAttendanceToDatabase(
      result.studentId,
      studentUser.name,
      result.confidence,
      studentUser.studentInfo?.class,
      studentUser._id // Student marks their own attendance
    );

    return res.json({
      success: true,
      message: dbResult.alreadyMarked 
        ? 'Your attendance was already marked for today!' 
        : `Attendance marked successfully as ${dbResult.status || 'present'}!`,
      studentName: studentUser.name,
      confidence: result.confidence,
      status: dbResult.status || 'present',
      time: new Date().toISOString(),
      alreadyMarked: dbResult.alreadyMarked || false
    });

  } catch (error) {
    console.error('Mark my attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error marking attendance' 
    });
  }
};

// @desc    Check if student's face is registered
// @route   GET /api/face-recognition/my-status
// @access  Private (Student)
const getMyFRStatus = async (req, res) => {
  try {
    const studentUser = req.user;

    if (studentUser.role !== 'student') {
      return res.status(403).json({ message: 'Only students can use this endpoint' });
    }

    // First check the database field
    let faceRegistered = studentUser.studentInfo?.faceRegistered || false;
    let faceRegistrationId = studentUser.studentInfo?.faceRegistrationId || null;

    // If not marked in DB, check the FR service directly by student name
    if (!faceRegistered) {
      try {
        const frStudents = faceRecognitionService.getAllStudents();
        // Try to find by name match
        const matchingStudent = frStudents.find(s => 
          s.name.toLowerCase() === studentUser.name.toLowerCase() ||
          s.name.toLowerCase().includes(studentUser.name.toLowerCase().split(' ')[0])
        );
        
        if (matchingStudent) {
          faceRegistered = true;
          faceRegistrationId = matchingStudent.student_id;
          
          // Update the user record for future
          await User.findByIdAndUpdate(studentUser._id, {
            'studentInfo.faceRegistered': true,
            'studentInfo.faceRegistrationId': matchingStudent.student_id
          });
        }
      } catch (frError) {
        console.log('FR service check failed:', frError.message);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already marked today
    let attendanceToday = null;
    if (studentUser.studentInfo?.class) {
      const attendance = await Attendance.findOne({
        date: { $gte: today, $lt: tomorrow },
        class: studentUser.studentInfo.class,
        'records.student': studentUser._id
      });
      
      if (attendance) {
        const record = attendance.records.find(
          r => r.student.toString() === studentUser._id.toString()
        );
        attendanceToday = record ? {
          status: record.status,
          markedAt: record.markedAt,
          method: record.markedMethod
        } : null;
      }
    }

    res.json({
      faceRegistered: faceRegistered,
      faceRegistrationId: faceRegistrationId,
      attendanceToday: attendanceToday,
      canMarkAttendance: faceRegistered && !attendanceToday
    });

  } catch (error) {
    res.status(500).json({ message: 'Error getting status', error: error.message });
  }
};

module.exports = {
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
};
