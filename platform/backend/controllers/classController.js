const Class = require('../models/Class');
const User = require('../models/User');
const Subject = require('../models/Subject'); // Import Subject model for populate
const mongoose = require('mongoose');

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private
const getClasses = async (req, res) => {
  try {
    const { grade, section, academicYear, isActive, all } = req.query;
    let query = {};

    if (grade) query.grade = grade;
    if (section) query.section = section;
    if (academicYear) query.academicYear = academicYear;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // For teachers, show classes they teach unless 'all' query param is true
    // This allows teachers to view all classes when needed (e.g., for attendance)
    if (req.user.role === 'teacher' && all !== 'true') {
      query.$or = [
        { classTeacher: req.user._id },
        { 'subjectTeachers.teacher': req.user._id },
        { 'schedule.periods.teacher': req.user._id }
      ];
    }

    let classes = await Class.find(query)
      .populate('classTeacher', 'name email')
      .populate('subjectTeachers.teacher', 'name email')
      .populate('subjectTeachers.subject', 'name code')
      .sort({ name: 1, section: 1 });

    // If no classes found and user is a teacher, return all active classes
    // This ensures teachers can still select classes even if not formally assigned
    if (classes.length === 0 && req.user.role === 'teacher') {
      classes = await Class.find({ isActive: true })
        .populate('classTeacher', 'name email')
        .populate('subjectTeachers.teacher', 'name email')
        .populate('subjectTeachers.subject', 'name code')
        .sort({ name: 1, section: 1 });
    }

    res.json(classes);
  } catch (error) {
    console.error('getClasses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private
const getClassById = async (req, res) => {
  try {
    const classDoc = await Class.findById(req.params.id)
      .populate('classTeacher', 'name email')
      .populate('students', 'name email studentInfo.rollNumber')
      .populate('subjects.teacher', 'name email')
      .populate('subjects.subject', 'name code');

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(classDoc);
  } catch (error) {
    console.error('getClassById error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create class
// @route   POST /api/classes
// @access  Private (Management)
const createClass = async (req, res) => {
  try {
    const { name, grade, section, academicYear, classTeacher, room, capacity, subjects } = req.body;

    // Check if class already exists
    const existingClass = await Class.findOne({ grade, section, academicYear });
    if (existingClass) {
      return res.status(400).json({ message: 'Class already exists for this grade, section, and academic year' });
    }

    const classDoc = await Class.create({
      name: name || `Class ${grade}-${section}`,
      grade,
      section,
      academicYear: academicYear || new Date().getFullYear().toString(),
      classTeacher,
      room,
      capacity,
      subjects
    });

    res.status(201).json(classDoc);
  } catch (error) {
    console.error('createClass error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private (Management)
const updateClass = async (req, res) => {
  try {
    const classDoc = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(classDoc);
  } catch (error) {
    console.error('updateClass error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private (Management)
const deleteClass = async (req, res) => {
  try {
    const classDoc = await Class.findById(req.params.id);

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    await classDoc.deleteOne();
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('deleteClass error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get students in a class
// @route   GET /api/classes/:id/students
// @access  Private
const getClassStudents = async (req, res) => {
  try {
    const classId = req.params.id;
    let studentQuery = { role: 'student' };

    // Check if it's a valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(classId) && 
                            (new mongoose.Types.ObjectId(classId)).toString() === classId;

    if (isValidObjectId) {
      // Search students by ObjectId class reference
      studentQuery.$or = [
        { 'studentInfo.class': new mongoose.Types.ObjectId(classId) },
        { 'studentInfo.class': classId },
        { 'class_id': classId }
      ];
    } else {
      // It's a string class name like "9-A" or "9a"
      // Search by string match (case-insensitive)
      const classNameRegex = new RegExp(`^${classId}$`, 'i');
      studentQuery.$or = [
        { 'studentInfo.class': classId },
        { 'studentInfo.class': classNameRegex },
        { 'class_id': classId },
        { 'class_id': classNameRegex }
      ];
      
      // Also try to find Class document and search by its ObjectId
      const classMatch = classId.match(/^(\d+)-?([A-Za-z])?$/i);
      if (classMatch) {
        const grade = classMatch[1];
        const section = classMatch[2]?.toUpperCase() || 'A';
        const classDoc = await Class.findOne({ 
          $or: [
            { grade: grade, section: section },
            { name: new RegExp(`^Class\\s*${grade}[\\s-]*${section}$`, 'i') },
            { name: new RegExp(`^${grade}[\\s-]*${section}$`, 'i') }
          ]
        });
        if (classDoc) {
          studentQuery.$or.push({ 'studentInfo.class': classDoc._id });
        }
      }
    }

    // Find students matching the query
    const students = await User.find(studentQuery)
      .select('name email studentInfo.rollNumber studentInfo.admissionNumber avatar');

    res.json(students);
  } catch (error) {
    console.error('getClassStudents error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add student to class
// @route   POST /api/classes/:id/students
// @access  Private (Management/Teacher)
const addStudentToClass = async (req, res) => {
  try {
    const { studentId } = req.body;
    
    const classDoc = await Class.findById(req.params.id);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Update student's class reference
    await User.findByIdAndUpdate(studentId, {
      'studentInfo.class': req.params.id
    });

    // Add to class students array if not already present
    if (!classDoc.students.includes(studentId)) {
      classDoc.students.push(studentId);
      await classDoc.save();
    }

    res.json({ message: 'Student added to class successfully' });
  } catch (error) {
    console.error('addStudentToClass error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Seed initial classes (for development)
// @route   POST /api/classes/seed
// @access  Private (Management)
const seedClasses = async (req, res) => {
  try {
    const grades = ['9', '10', '11', '12'];
    const sections = ['A', 'B'];
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    const classesToCreate = [];

    for (const grade of grades) {
      for (const section of sections) {
        const exists = await Class.findOne({ 
          name: `Class ${grade}-${section}`, 
          section, 
          academicYear 
        });
        if (!exists) {
          classesToCreate.push({
            name: `Class ${grade}-${section}`,
            section,
            academicYear,
            maxStrength: 40,
            isActive: true
          });
        }
      }
    }

    if (classesToCreate.length > 0) {
      await Class.insertMany(classesToCreate);
    }

    const allClasses = await Class.find({ academicYear });
    res.json({ 
      message: `${classesToCreate.length} classes created`, 
      classes: allClasses 
    });
  } catch (error) {
    console.error('seedClasses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get classes with enrolled students (for teacher resource/quiz creation)
// @route   GET /api/classes/with-students
// @access  Private (Teacher)
const getClassesWithStudents = async (req, res) => {
  try {
    // Get all students with class info
    const studentsWithClass = await User.find({ 
      role: 'student',
      $or: [
        { 'studentInfo.class': { $exists: true, $ne: null, $ne: '' } },
        { 'class_id': { $exists: true, $ne: null, $ne: '' } }
      ]
    }).select('studentInfo.class class_id').populate('studentInfo.class', 'name section grade');

    // Extract unique class identifiers
    const classMap = new Map(); // Map to store class info by identifier
    
    for (const student of studentsWithClass) {
      const classValue = student.studentInfo?.class || student.class_id;
      if (!classValue) continue;
      
      let classId, className;
      
      // Check if it's a populated object
      if (typeof classValue === 'object' && classValue.name) {
        classId = classValue._id?.toString() || classValue.name;
        className = classValue.name + (classValue.section ? `-${classValue.section}` : '');
      } else {
        const classStr = String(classValue);
        // If it's an ObjectId, try to look it up
        if (/^[a-fA-F0-9]{24}$/.test(classStr)) {
          // It's an ObjectId - we'll look up the name later
          classId = classStr;
          className = null; // Will be looked up
        } else {
          // It's a string class name like "10-A"
          classId = classStr;
          className = classStr;
        }
      }
      
      if (!classMap.has(classId)) {
        classMap.set(classId, { classId, className, count: 0 });
      }
      classMap.get(classId).count++;
    }

    // Look up names for ObjectId classes
    const result = [];
    for (const [classId, data] of classMap) {
      let displayName = data.className;
      
      // If className is null, it's an ObjectId - try to look up
      if (!displayName && /^[a-fA-F0-9]{24}$/.test(classId)) {
        try {
          const classDoc = await Class.findById(classId).select('name section grade');
          if (classDoc) {
            displayName = classDoc.name + (classDoc.section ? `-${classDoc.section}` : '');
          }
        } catch (e) {
          // Skip if lookup fails
          continue;
        }
      }
      
      // Only add if we have a valid display name (not an ObjectId)
      if (displayName && !/^[a-fA-F0-9]{24}$/.test(displayName)) {
        result.push({
          _id: classId,
          name: displayName,
          displayName: displayName.startsWith('Class') ? displayName : `Class ${displayName}`,
          studentCount: data.count
        });
      }
    }

    // Sort by class name
    result.sort((a, b) => {
      const numA = parseInt(a.name) || 0;
      const numB = parseInt(b.name) || 0;
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });

    res.json(result);
  } catch (error) {
    console.error('getClassesWithStudents error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
  addStudentToClass,
  seedClasses,
  getClassesWithStudents
};
