const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const { generateContent } = require('../services/geminiService');

// @desc    Get performance records (quiz attempts)
// @route   GET /api/performance
// @access  Private
const getPerformance = async (req, res) => {
  try {
    const { student_id, subject, startDate, endDate } = req.query;
    let query = {};

    // Students can only see their own performance
    if (req.user.role === 'student') {
      query.student_id = req.user._id;
    } else if (student_id) {
      query.student_id = student_id;
    }

    if (subject) query.subject = subject;

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Fetch from QuizAttempt model (real quiz data)
    const performance = await QuizAttempt.find(query)
      .populate('student_id', 'name email class_id')
      .populate('resource_id', 'title subject')
      .sort({ date: -1 });

    res.json(performance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Submit quiz answers and calculate score
// @route   POST /api/performance/submit-quiz
// @access  Private (Student)
const submitQuiz = async (req, res) => {
  try {
    const Quiz = require('../models/Quiz');
    const { resource_id, quiz_id, quiz_topic, subject, answers } = req.body;
    // answers: [{question_id, student_answer}]

    // Fetch the quiz with correct answers from database
    const quiz = await Quiz.findById(quiz_id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Build questions array with correct answers from the quiz
    const questions = quiz.questions.map((q, index) => {
      // Find the correct option (the one with isCorrect: true)
      const correctOption = q.options.findIndex(opt => opt.isCorrect);
      const correctAnswer = correctOption !== -1 ? String.fromCharCode(65 + correctOption) : q.correctAnswer;
      
      return {
        id: index + 1,
        question: q.questionText,
        correct_answer: correctAnswer
      };
    });

    let score = 0;
    const totalMarks = questions.length;
    const detailedAnswers = [];

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.question_id);
      const isCorrect = question && question.correct_answer === answer.student_answer;
      
      if (isCorrect) score++;

      detailedAnswers.push({
        question: question?.question || '',
        student_answer: answer.student_answer,
        correct_answer: question?.correct_answer || '',
        is_correct: isCorrect
      });
    }

    // Generate AI feedback
    const percentage = Math.round((score / totalMarks) * 100);
    let ai_feedback = '';

    try {
      const feedbackPrompt = `A student scored ${score}/${totalMarks} (${percentage}%) on a quiz about ${quiz_topic || subject}. 
      The following questions were answered incorrectly:
      ${detailedAnswers.filter(a => !a.is_correct).map(a => `- ${a.question}`).join('\n')}
      
      Provide brief, encouraging feedback (2-3 sentences) focusing on areas for improvement.`;

      ai_feedback = await generateContent(feedbackPrompt, { maxTokens: 150 });
    } catch (aiError) {
      console.error('AI feedback error:', aiError);
      ai_feedback = percentage >= 70 ? 'Good job! Keep up the good work.' : 'Keep practicing, you\'re making progress!';
    }

    const quizAttempt = await QuizAttempt.create({
      student_id: req.user._id,
      resource_id,
      quiz_id,
      quiz_topic: quiz_topic || quiz.title,
      subject: subject || quiz.subject,
      score,
      total_marks: totalMarks,
      percentage,
      answers: detailedAnswers,
      ai_feedback
    });

    res.status(201).json({
      _id: quizAttempt._id,
      score: quizAttempt.score,
      total_marks: quizAttempt.total_marks,
      percentage: quizAttempt.percentage,
      ai_feedback: quizAttempt.ai_feedback,
      answers: quizAttempt.answers
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get performance statistics (from QuizAttempt)
// @route   GET /api/performance/stats
// @access  Private
const getPerformanceStats = async (req, res) => {
  try {
    const { student_id, class_id } = req.query;
    const mongoose = require('mongoose');
    let matchQuery = {};

    if (req.user.role === 'student') {
      matchQuery.student_id = new mongoose.Types.ObjectId(req.user._id);
    } else if (student_id) {
      matchQuery.student_id = new mongoose.Types.ObjectId(student_id);
    }

    // Overall stats from QuizAttempt
    const overallStats = await QuizAttempt.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          avgPercentage: { $avg: '$percentage' },
          totalScore: { $sum: '$score' },
          totalMarks: { $sum: '$total_marks' }
        }
      }
    ]);

    // Subject-wise stats from QuizAttempt
    const subjectStats = await QuizAttempt.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$subject',
          quizCount: { $sum: 1 },
          avgPercentage: { $avg: '$percentage' },
          highestScore: { $max: '$percentage' },
          lowestScore: { $min: '$percentage' }
        }
      },
      { $sort: { avgPercentage: -1 } }
    ]);

    // Recent performance trend (last 10) from QuizAttempt
    const recentTrend = await QuizAttempt.find(matchQuery)
      .select('subject percentage date quiz_topic')
      .sort({ date: -1 })
      .limit(10);

    res.json({
      overall: overallStats[0] || { totalQuizzes: 0, avgPercentage: 0 },
      bySubject: subjectStats,
      recentTrend
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    AI Chat for performance/attendance queries (Voice-enabled)
// @route   POST /api/performance/ai-query
// @access  Private (Teacher/Management)
const aiQuery = async (req, res) => {
  try {
    const { query, student_id, class_id } = req.body;
    const mongoose = require('mongoose');
    const Attendance = require('../models/Attendance');

    // Gather relevant data based on query context
    let context = '';
    let dataAvailable = false;

    if (student_id) {
      const student = await User.findById(student_id).select('name class_id email');
      
      if (!student) {
        return res.json({
          response: "I couldn't find the selected student in the database. Please make sure a valid student is selected.",
          context_used: false
        });
      }

      // Get quiz attempts from QuizAttempt model
      const quizAttempts = await QuizAttempt.find({ student_id: new mongoose.Types.ObjectId(student_id) })
        .sort({ date: -1 })
        .limit(10);
      
      // Calculate overall stats
      const totalQuizzes = quizAttempts.length;
      const avgPercentage = totalQuizzes > 0 
        ? Math.round(quizAttempts.reduce((sum, q) => sum + q.percentage, 0) / totalQuizzes) 
        : 0;
      const highestScore = totalQuizzes > 0 
        ? Math.max(...quizAttempts.map(q => q.percentage)) 
        : 0;
      const lowestScore = totalQuizzes > 0 
        ? Math.min(...quizAttempts.map(q => q.percentage)) 
        : 0;

      // Get subject-wise breakdown
      const subjectStats = {};
      quizAttempts.forEach(q => {
        const subj = q.subject || 'General';
        if (!subjectStats[subj]) {
          subjectStats[subj] = { total: 0, sum: 0 };
        }
        subjectStats[subj].total++;
        subjectStats[subj].sum += q.percentage;
      });

      // Get attendance data
      const attendanceRecords = await Attendance.find({
        'records.student': new mongoose.Types.ObjectId(student_id)
      });

      let presentDays = 0, absentDays = 0, lateDays = 0;
      attendanceRecords.forEach(record => {
        const studentRecord = record.records.find(r => r.student.toString() === student_id);
        if (studentRecord) {
          if (studentRecord.status === 'present') presentDays++;
          else if (studentRecord.status === 'absent') absentDays++;
          else if (studentRecord.status === 'late') lateDays++;
        }
      });

      const totalDays = presentDays + absentDays + lateDays;
      const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      dataAvailable = totalQuizzes > 0 || totalDays > 0;

      context = `
STUDENT PROFILE:
- Name: ${student.name}
- Email: ${student.email || 'N/A'}
- Class: ${student.class_id || 'Not assigned'}

QUIZ PERFORMANCE SUMMARY:
- Total Quizzes Attempted: ${totalQuizzes}
${totalQuizzes > 0 ? `- Average Score: ${avgPercentage}%
- Highest Score: ${highestScore}%
- Lowest Score: ${lowestScore}%` : '- No quiz attempts yet'}

${Object.keys(subjectStats).length > 0 ? `SUBJECT-WISE PERFORMANCE:
${Object.entries(subjectStats).map(([subject, stats]) => 
  `- ${subject}: ${Math.round(stats.sum / stats.total)}% average (${stats.total} quizzes)`
).join('\n')}` : ''}

${quizAttempts.length > 0 ? `RECENT QUIZ ATTEMPTS:
${quizAttempts.slice(0, 5).map(q => 
  `- ${q.quiz_topic || 'Quiz'} (${q.subject || 'General'}): ${q.score}/${q.total_marks} (${q.percentage}%) on ${new Date(q.date).toLocaleDateString()}`
).join('\n')}` : ''}

ATTENDANCE SUMMARY:
${totalDays > 0 ? `- Present: ${presentDays} days
- Absent: ${absentDays} days
- Late: ${lateDays} days
- Attendance Rate: ${attendancePercentage}%` : '- No attendance records yet'}
`;
    } else {
      // General query - get overview of all data
      const totalStudents = await User.countDocuments({ role: 'student' });
      const totalTeachers = await User.countDocuments({ role: 'teacher' });
      const allAttempts = await QuizAttempt.find().sort({ date: -1 }).limit(50);
      
      const overallAvg = allAttempts.length > 0 
        ? Math.round(allAttempts.reduce((sum, q) => sum + q.percentage, 0) / allAttempts.length) 
        : 0;

      // Get top performers
      const studentScores = {};
      allAttempts.forEach(a => {
        const sid = a.student_id?.toString();
        if (sid) {
          if (!studentScores[sid]) {
            studentScores[sid] = { total: 0, sum: 0 };
          }
          studentScores[sid].total++;
          studentScores[sid].sum += a.percentage;
        }
      });

      // Get subject-wise stats
      const subjectStats = {};
      allAttempts.forEach(a => {
        const subj = a.subject || 'General';
        if (!subjectStats[subj]) {
          subjectStats[subj] = { total: 0, sum: 0 };
        }
        subjectStats[subj].total++;
        subjectStats[subj].sum += a.percentage;
      });

      // Score distribution
      const excellent = allAttempts.filter(a => a.percentage >= 80).length;
      const good = allAttempts.filter(a => a.percentage >= 60 && a.percentage < 80).length;
      const average = allAttempts.filter(a => a.percentage >= 40 && a.percentage < 60).length;
      const needsImprovement = allAttempts.filter(a => a.percentage < 40).length;

      dataAvailable = totalStudents > 0 || allAttempts.length > 0;

      context = `
SYSTEM OVERVIEW:
- Total Students: ${totalStudents}
- Total Teachers: ${totalTeachers}
- Total Quiz Attempts: ${allAttempts.length}
${allAttempts.length > 0 ? `- Overall Average Score: ${overallAvg}%` : ''}

${allAttempts.length > 0 ? `SCORE DISTRIBUTION:
- Excellent (80%+): ${excellent} attempts (${Math.round(excellent/allAttempts.length*100)}%)
- Good (60-79%): ${good} attempts (${Math.round(good/allAttempts.length*100)}%)
- Average (40-59%): ${average} attempts (${Math.round(average/allAttempts.length*100)}%)
- Needs Improvement (<40%): ${needsImprovement} attempts (${Math.round(needsImprovement/allAttempts.length*100)}%)` : ''}

${Object.keys(subjectStats).length > 0 ? `SUBJECT-WISE PERFORMANCE:
${Object.entries(subjectStats).map(([subject, stats]) => 
  `- ${subject}: ${Math.round(stats.sum / stats.total)}% average (${stats.total} attempts)`
).join('\n')}` : ''}

${allAttempts.length > 0 ? `RECENT ACTIVITY:
${allAttempts.slice(0, 5).map(q => 
  `- ${q.quiz_topic || 'Quiz'}: ${q.percentage}% on ${new Date(q.date).toLocaleDateString()}`
).join('\n')}` : 'No quiz attempts recorded yet.'}
`;
    }

    const prompt = `You are VidyaSetu AI, an educational assistant helping teachers analyze student performance data stored in MongoDB.

AVAILABLE DATA FROM DATABASE:
${context}

TEACHER'S QUESTION: ${query}

INSTRUCTIONS:
- Provide a helpful, clear, and actionable response based on the data provided above
- Use the actual numbers and statistics from the data
- If data shows good performance, acknowledge and encourage
- If data shows areas needing improvement, suggest specific actions
- If no quiz data exists yet, explain that students need to complete quizzes first
- Be encouraging and constructive
- Keep the response concise but informative`;

    const response = await generateContent(prompt, { temperature: 0.7, maxTokens: 500 });

    res.json({
      response: response,
      context_used: dataAvailable
    });
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ message: 'Error processing query', error: error.message });
  }
};

// @desc    Get leaderboard - top performing students
// @route   GET /api/performance/leaderboard
// @access  Private (Teacher/Management)
const getLeaderboard = async (req, res) => {
  try {
    const { limit = 10, class_id } = req.query;

    // Aggregate quiz attempts to get average scores per student
    const pipeline = [
      // Group by student
      {
        $group: {
          _id: '$student_id',
          avgScore: { $avg: '$percentage' },
          totalScore: { $sum: '$score' },
          totalQuizzes: { $sum: 1 },
          quizCount: { $sum: 1 },
          lastQuizDate: { $max: '$date' }
        }
      },
      // Sort by average score descending
      { $sort: { avgScore: -1 } },
      // Limit results
      { $limit: parseInt(limit) }
    ];

    const leaderboardData = await QuizAttempt.aggregate(pipeline);

    // Populate student details
    const leaderboard = await Promise.all(
      leaderboardData.map(async (entry) => {
        const student = await User.findById(entry._id).select('name email studentInfo.class');
        return {
          _id: entry._id,
          name: student?.name || 'Unknown Student',
          email: student?.email,
          class: student?.studentInfo?.class,
          avgScore: Math.round(entry.avgScore * 10) / 10,
          quizCount: entry.quizCount,
          lastQuizDate: entry.lastQuizDate
        };
      })
    );

    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
};

// @desc    Get class-wide performance statistics
// @route   GET /api/performance/class-stats
// @access  Private (Teacher/Management)
const getClassStats = async (req, res) => {
  try {
    const { class_id } = req.query;

    // Get all quiz attempts with student info
    const attempts = await QuizAttempt.find()
      .populate('student_id', 'name studentInfo.class')
      .sort({ date: -1 });

    // Group by student and calculate averages
    const studentStats = {};
    attempts.forEach(attempt => {
      const studentId = attempt.student_id?._id?.toString();
      if (!studentId) return;

      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          _id: studentId,
          name: attempt.student_id?.name || 'Unknown',
          class: attempt.student_id?.studentInfo?.class,
          scores: [],
          subjects: new Set()
        };
      }
      studentStats[studentId].scores.push(attempt.percentage);
      if (attempt.subject) {
        studentStats[studentId].subjects.add(attempt.subject);
      }
    });

    // Calculate averages
    const performanceData = Object.values(studentStats).map(student => ({
      _id: student._id,
      name: student.name,
      class: student.class,
      avgScore: student.scores.length > 0 
        ? student.scores.reduce((a, b) => a + b, 0) / student.scores.length 
        : 0,
      percentage: student.scores.length > 0 
        ? student.scores.reduce((a, b) => a + b, 0) / student.scores.length 
        : 0,
      quizCount: student.scores.length,
      subjects: Array.from(student.subjects)
    }));

    res.json(performanceData);
  } catch (error) {
    console.error('Class stats error:', error);
    res.status(500).json({ message: 'Error fetching class stats', error: error.message });
  }
};

module.exports = {
  getPerformance,
  submitQuiz,
  getPerformanceStats,
  aiQuery,
  getLeaderboard,
  getClassStats
};
