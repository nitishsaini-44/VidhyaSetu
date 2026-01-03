const User = require('../models/User');
const Class = require('../models/Class');
const mongoose = require('mongoose');

// Helper function to check if string is valid ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && 
         (new mongoose.Types.ObjectId(id)).toString() === id;
};

// @desc    Get all users (with filters)
// @route   GET /api/users
// @access  Private (Management/Teacher)
const getUsers = async (req, res) => {
  try {
    const { role, class_id, search } = req.query;
    let query = {};

    if (role) query.role = role;
    if (class_id) query['studentInfo.class'] = class_id;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Teachers can only see students
    if (req.user.role === 'teacher') {
      query.role = 'student';
    }

    const users = await User.find(query)
      .select('-password -face_encoding')
      .sort({ created_at: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get students by class
// @route   GET /api/users/class/:classId
// @access  Private (Teacher/Management)
const getStudentsByClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    let query = { role: 'student' };

    if (isValidObjectId(classId)) {
      // If it's a valid ObjectId, search by studentInfo.class
      query['studentInfo.class'] = classId;
    } else {
      // Try to parse as grade-section (e.g., "10-A")
      const classMatch = classId.match(/^(\d+)-([A-Za-z])$/);
      if (classMatch) {
        // Find the class first
        const classDoc = await Class.findOne({ 
          grade: classMatch[1], 
          section: classMatch[2].toUpperCase() 
        });
        if (classDoc) {
          query['studentInfo.class'] = classDoc._id;
        } else {
          // Fallback to old class_id field
          query.class_id = classId;
        }
      } else {
        // Use as-is for backward compatibility
        query.class_id = classId;
      }
    }

    const students = await User.find(query).select('-password -faceEmbedding');

    res.json(students);
  } catch (error) {
    console.error('getStudentsByClass error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user (Management only)
// @route   PUT /api/users/:id
// @access  Private (Management)
const updateUser = async (req, res) => {
  try {
    const { name, email, role, class_id, isActive, subject, department } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    
    // Update student-specific fields
    if (user.role === 'student' || role === 'student') {
      if (!user.studentInfo) {
        user.studentInfo = {};
      }
      if (class_id !== undefined) {
        user.studentInfo.class = class_id || null;
      }
    }
    
    // Update teacher-specific fields
    if (user.role === 'teacher' || role === 'teacher') {
      if (!user.teacherInfo) {
        user.teacherInfo = {};
      }
      if (subject) {
        user.teacherInfo.specialization = subject;
      }
      if (department) {
        user.teacherInfo.department = department;
      }
    }
    
    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      class_id: updatedUser.studentInfo?.class || null,
      subject: updatedUser.teacherInfo?.specialization || null,
      department: updatedUser.teacherInfo?.department || null,
      studentInfo: updatedUser.studentInfo,
      teacherInfo: updatedUser.teacherInfo,
      isActive: updatedUser.isActive
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Management)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/users/dashboard/stats
// @access  Private (Management)
const getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const activeUsers = await User.countDocuments({ isActive: true });

    // Get class distribution
    const classDistribution = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$studentInfo.class', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalStudents,
      totalTeachers,
      activeUsers,
      classDistribution
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getUsers,
  getUser,
  getStudentsByClass,
  updateUser,
  deleteUser,
  getDashboardStats
};
