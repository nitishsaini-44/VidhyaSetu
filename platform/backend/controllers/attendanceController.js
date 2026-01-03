const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Class = require('../models/Class');
const mongoose = require('mongoose');

// Helper function to check if string is valid ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && 
         (new mongoose.Types.ObjectId(id)).toString() === id;
};

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
  try {
    const { class_id, date, startDate, endDate, session } = req.query;
    let query = {};

    // Date filtering
    if (date) {
      // Match exact date (start of day to end of day)
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: targetDate, $lt: nextDay };
    } else if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Handle class_id - could be ObjectId or class name like "10-A"
    if (class_id) {
      if (isValidObjectId(class_id)) {
        query.class = class_id;
      } else {
        // Try to find class by name pattern (e.g., "10-A" -> grade: 10, section: A)
        const classMatch = class_id.match(/^(\d+)-([A-Za-z])$/);
        if (classMatch) {
          const classDoc = await Class.findOne({ 
            grade: classMatch[1], 
            section: classMatch[2].toUpperCase() 
          });
          if (classDoc) {
            query.class = classDoc._id;
          }
        }
      }
    }
    if (session) query.session = session;

    // If student role, get attendance records that include them
    if (req.user.role === 'student') {
      const attendance = await Attendance.find({
        ...query,
        'records.student': req.user._id
      })
        .populate('class', 'name section grade')
        .populate('subject', 'name')
        .populate('markedBy', 'name')
        .sort({ date: -1 })
        .limit(100);

      // Filter records to only include the current student's record
      const filteredAttendance = attendance.map(att => {
        const studentRecord = att.records.find(
          r => r.student.toString() === req.user._id.toString()
        );
        return {
          _id: att._id,
          date: att.date,
          class: att.class,
          subject: att.subject,
          session: att.session,
          status: studentRecord?.status,
          markedAt: studentRecord?.markedAt,
          markedMethod: studentRecord?.markedMethod,
          remarks: studentRecord?.remarks
        };
      });

      return res.json(filteredAttendance);
    }

    // For teacher/management - return full attendance records
    const attendance = await Attendance.find(query)
      .populate('class', 'name section grade')
      .populate('subject', 'name')
      .populate('records.student', 'name email studentInfo.rollNumber')
      .populate('markedBy', 'name')
      .sort({ date: -1 })
      .limit(100);

    res.json(attendance);
  } catch (error) {
    console.error('getAttendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark attendance for a single student (add to existing class attendance)
// @route   POST /api/attendance
// @access  Private (Teacher/Management)
const markAttendance = async (req, res) => {
  try {
    const { student_id, class_id, date, status, method, session, subject_id, remarks } = req.body;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Resolve class_id to ObjectId if it's a string like "10-A"
    let resolvedClassId = class_id;
    if (!isValidObjectId(class_id)) {
      const classMatch = class_id.match(/^(\d+)-([A-Za-z])$/);
      if (classMatch) {
        let classDoc = await Class.findOne({ 
          grade: classMatch[1], 
          section: classMatch[2].toUpperCase() 
        });
        if (classDoc) {
          resolvedClassId = classDoc._id;
        } else {
          // Auto-create the class if it doesn't exist
          const currentYear = new Date().getFullYear();
          classDoc = await Class.create({
            name: `Class ${classMatch[1]}-${classMatch[2].toUpperCase()}`,
            grade: classMatch[1],
            section: classMatch[2].toUpperCase(),
            academicYear: `${currentYear}-${currentYear + 1}`,
            isActive: true
          });
          resolvedClassId = classDoc._id;
        }
      } else {
        return res.status(400).json({ message: `Invalid class ID format: ${class_id}` });
      }
    }

    // Find existing attendance for this class and date
    let attendance = await Attendance.findOne({
      class: resolvedClassId,
      date: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
      },
      session: session || 'full-day'
    });

    if (attendance) {
      // Check if student already has a record
      const existingRecordIndex = attendance.records.findIndex(
        r => r.student.toString() === student_id
      );

      if (existingRecordIndex !== -1) {
        // Update existing record
        attendance.records[existingRecordIndex].status = status;
        attendance.records[existingRecordIndex].markedMethod = method || 'manual';
        attendance.records[existingRecordIndex].markedAt = new Date();
        attendance.records[existingRecordIndex].remarks = remarks;
      } else {
        // Add new record
        attendance.records.push({
          student: student_id,
          status,
          markedMethod: method || 'manual',
          remarks
        });
      }

      await attendance.save();
      return res.json(attendance);
    }

    // Create new attendance for the class
    attendance = await Attendance.create({
      date: targetDate,
      class: resolvedClassId,
      subject: subject_id,
      session: session || 'full-day',
      records: [{
        student: student_id,
        status,
        markedMethod: method || 'manual',
        remarks
      }],
      markedBy: req.user._id
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error('markAttendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Bulk mark attendance for multiple students
// @route   POST /api/attendance/bulk
// @access  Private (Teacher/Management)
const bulkMarkAttendance = async (req, res) => {
  try {
    const { class_id, date, students, records: recordsInput, method, session, subject_id } = req.body;
    
    // Support both 'students' and 'records' array formats for compatibility
    const studentRecords = students || recordsInput;

    if (!studentRecords || !Array.isArray(studentRecords) || studentRecords.length === 0) {
      return res.status(400).json({ message: 'Students/records array is required' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Resolve class_id to ObjectId if it's a string like "10-A" or "10A" or "9a"
    let resolvedClassId = class_id;
    if (!isValidObjectId(class_id)) {
      // Try different class name formats
      const classMatch = class_id.match(/^(\d+)[- ]?([A-Za-z])?$/i);
      if (classMatch) {
        const grade = classMatch[1];
        const section = (classMatch[2] || 'A').toUpperCase();
        
        let classDoc = await Class.findOne({ 
          $or: [
            { grade: grade, section: section },
            { name: new RegExp(`^Class\\s*${grade}[\\s-]*${section}$`, 'i') },
            { name: new RegExp(`^${grade}[\\s-]*${section}$`, 'i') }
          ]
        });
        
        if (classDoc) {
          resolvedClassId = classDoc._id;
        } else {
          // Auto-create the class if it doesn't exist
          const currentYear = new Date().getFullYear();
          classDoc = await Class.create({
            name: `Class ${grade}-${section}`,
            grade: grade,
            section: section,
            academicYear: `${currentYear}-${currentYear + 1}`,
            isActive: true
          });
          resolvedClassId = classDoc._id;
        }
      } else {
        // If still not matched, try to find by exact name
        const classDoc = await Class.findOne({ 
          name: new RegExp(`^${class_id}$`, 'i') 
        });
        if (classDoc) {
          resolvedClassId = classDoc._id;
        } else {
          return res.status(400).json({ message: `Invalid class ID format: ${class_id}` });
        }
      }
    }

    // Find existing attendance for this class and date
    let attendance = await Attendance.findOne({
      class: resolvedClassId,
      date: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
      },
      session: session || 'full-day'
    });

    // Build records array
    const records = studentRecords.map(student => ({
      student: student.student_id,
      status: student.status,
      markedMethod: method || 'manual',
      remarks: student.remarks
    }));

    if (attendance) {
      // Update existing attendance - merge records
      for (const newRecord of records) {
        const existingIndex = attendance.records.findIndex(
          r => r.student.toString() === newRecord.student.toString()
        );

        if (existingIndex !== -1) {
          attendance.records[existingIndex] = {
            ...attendance.records[existingIndex].toObject(),
            ...newRecord,
            markedAt: new Date()
          };
        } else {
          attendance.records.push(newRecord);
        }
      }

      await attendance.save();
    } else {
      // Create new attendance
      attendance = await Attendance.create({
        date: targetDate,
        class: resolvedClassId,
        subject: subject_id,
        session: session || 'full-day',
        records,
        markedBy: req.user._id
      });
    }

    // Populate for response
    await attendance.populate([
      { path: 'class', select: 'name section grade' },
      { path: 'records.student', select: 'name email studentInfo.rollNumber' },
      { path: 'markedBy', select: 'name' }
    ]);

    res.json({
      message: 'Attendance marked successfully',
      success: records.length,
      failed: 0,
      attendance
    });
  } catch (error) {
    console.error('bulkMarkAttendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats
// @access  Private
const getAttendanceStats = async (req, res) => {
  try {
    const { class_id, month, year, startDate, endDate } = req.query;
    const ObjectId = mongoose.Types.ObjectId;

    let dateMatch = {};

    // Filter by month/year if provided
    if (month && year) {
      const start = new Date(year, parseInt(month) - 1, 1);
      const end = new Date(year, parseInt(month), 0, 23, 59, 59);
      dateMatch = { date: { $gte: start, $lte: end } };
    } else if (startDate && endDate) {
      dateMatch = { date: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    } else {
      // Default: last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      dateMatch = { date: { $gte: start, $lte: end } };
    }

    // Student: get their own stats
    if (req.user.role === 'student') {
      const stats = await Attendance.aggregate([
        { $match: { ...dateMatch, 'records.student': new ObjectId(req.user._id) } },
        { $unwind: '$records' },
        { $match: { 'records.student': new ObjectId(req.user._id) } },
        {
          $group: {
            _id: '$records.status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalRecords = stats.reduce((acc, curr) => acc + curr.count, 0);
      const statsObj = {
        total: totalRecords,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        percentage: 0
      };

      stats.forEach(s => {
        if (s._id === 'present') statsObj.present = s.count;
        else if (s._id === 'absent') statsObj.absent = s.count;
        else if (s._id === 'late') statsObj.late = s.count;
        else if (s._id === 'excused') statsObj.excused = s.count;
      });

      if (totalRecords > 0) {
        statsObj.percentage = Math.round(((statsObj.present + statsObj.late) / totalRecords) * 100);
      }

      return res.json(statsObj);
    }

    // Teacher/Management: get class stats or overall stats
    let matchQuery = { ...dateMatch };
    if (class_id) {
      matchQuery.class = new ObjectId(class_id);
    }

    const stats = await Attendance.aggregate([
      { $match: matchQuery },
      { $unwind: '$records' },
      {
        $group: {
          _id: '$records.status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalRecords = stats.reduce((acc, curr) => acc + curr.count, 0);
    const statsObj = {
      total: totalRecords,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      percentage: 0
    };

    stats.forEach(s => {
      if (s._id === 'present') statsObj.present = s.count;
      else if (s._id === 'absent') statsObj.absent = s.count;
      else if (s._id === 'late') statsObj.late = s.count;
      else if (s._id === 'excused') statsObj.excused = s.count;
    });

    if (totalRecords > 0) {
      statsObj.percentage = Math.round(((statsObj.present + statsObj.late) / totalRecords) * 100);
    }

    res.json(statsObj);
  } catch (error) {
    console.error('getAttendanceStats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get attendance by ID
// @route   GET /api/attendance/:id
// @access  Private
const getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('class', 'name section grade')
      .populate('subject', 'name')
      .populate('records.student', 'name email studentInfo.rollNumber')
      .populate('markedBy', 'name');

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json(attendance);
  } catch (error) {
    console.error('getAttendanceById error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private (Management only)
const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (attendance.isLocked) {
      return res.status(403).json({ message: 'This attendance record is locked and cannot be deleted' });
    }

    await attendance.deleteOne();
    res.json({ message: 'Attendance record deleted' });
  } catch (error) {
    console.error('deleteAttendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAttendance,
  markAttendance,
  bulkMarkAttendance,
  getAttendanceStats,
  getAttendanceById,
  deleteAttendance
};
