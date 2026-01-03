const Resource = require('../models/Resource');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { generateJSON, generateContent } = require('../services/geminiService');

// @desc    Upload curriculum/resource
// @route   POST /api/resources/upload
// @access  Private (Teacher)
const uploadResource = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF file' });
    }

    const { subject, title, description, type, class_id } = req.body;

    // Extract text from PDF
    const pdfPath = req.file.path;
    let extractedText = '';
    
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError.message);
      // Continue without extracted text if PDF parsing fails
      extractedText = 'Unable to extract text from PDF';
    }

    // Build resource object matching the model schema
    const resourceData = {
      uploadedBy: req.user._id,
      title,
      description,
      type: type || 'curriculum',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype
      },
      extractedText: extractedText,
      isProcessed: true
    };

    // Handle subject - could be string name or ObjectId
    if (subject) {
      // If it's a valid ObjectId, use it directly
      if (/^[a-fA-F0-9]{24}$/.test(subject)) {
        resourceData.subject = subject;
      } else {
        // Store as topic if it's a string name
        resourceData.topics = [subject];
      }
    }

    // Handle class_id - could be ObjectId or class name string
    if (class_id) {
      if (/^[a-fA-F0-9]{24}$/.test(class_id)) {
        resourceData.applicableClasses = [class_id];
      } else {
        // Store class name string in chapter field for display
        resourceData.chapter = class_id;
      }
    }

    const resource = await Resource.create(resourceData);

    res.status(201).json(resource);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all resources
// @route   GET /api/resources
// @access  Private
const getResources = async (req, res) => {
  try {
    const { subject, type, class_id, teacher_id } = req.query;
    let query = { isActive: true };

    if (subject) query.subject = subject;
    if (type) query.type = type;
    if (class_id) query.applicableClasses = class_id;
    
    if (req.user.role === 'teacher') {
      query.uploadedBy = req.user._id;
    } else if (teacher_id) {
      query.uploadedBy = teacher_id;
    }

    const resources = await Resource.find(query)
      .populate('uploadedBy', 'name email')
      .populate('subject', 'name code')
      .populate('applicableClasses', 'name grade section')
      .sort({ createdAt: -1 });

    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single resource
// @route   GET /api/resources/:id
// @access  Private
const getResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('subject', 'name code')
      .populate('applicableClasses', 'name grade section');

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Generate quiz from curriculum using Gemini AI
// @route   POST /api/resources/:id/generate-quiz
// @access  Private (Teacher)
const generateQuiz = async (req, res) => {
  try {
    const { numQuestions = 5, difficulty = 'medium' } = req.body;
    
    const resource = await Resource.findById(req.params.id).select('+extractedText');
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (!resource.extractedText) {
      return res.status(400).json({ message: 'No text content available to generate quiz' });
    }

    const prompt = `Based on the following educational content, generate ${numQuestions} multiple choice questions with ${difficulty} difficulty level. 
    
Content:
${resource.extractedText.substring(0, 8000)}

Please generate a JSON response with the following structure:
{
  "quiz_title": "Quiz on [Topic]",
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "explanation": "Brief explanation"
    }
  ]
}`;

    const quizContent = await generateJSON(prompt, { temperature: 0.7 });

    // Get class info - could be in chapter (string) or applicableClasses (ObjectId)
    let classValue = resource.chapter || null;
    if (!classValue && resource.applicableClasses && resource.applicableClasses.length > 0) {
      const classId = resource.applicableClasses[0];
      if (typeof classId === 'object' && classId.name) {
        classValue = classId.name;
      } else {
        classValue = classId;
      }
    }

    // Return quiz for preview (not saved yet)
    res.json({
      resource_id: resource._id,
      resource_title: resource.title,
      subject: resource.topics?.[0] || resource.subject,
      class_id: classValue,
      status: 'preview',
      ...quizContent
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ message: 'Error generating quiz', error: error.message });
  }
};

// @desc    Publish quiz to students
// @route   POST /api/resources/:id/publish-quiz
// @access  Private (Teacher)
const publishQuiz = async (req, res) => {
  try {
    const { quiz_title, questions, class_id, duration = 30 } = req.body;
    
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Create quiz in database
    const Quiz = require('../models/Quiz');
    
    // Transform questions to match Quiz schema
    const formattedQuestions = questions.map((q, index) => ({
      questionText: q.question,
      questionType: 'mcq',
      options: q.options.map((opt, i) => ({
        text: opt.replace(/^[A-D]\)\s*/, ''), // Remove A), B), etc.
        isCorrect: q.correct_answer === String.fromCharCode(65 + i) // A=0, B=1, etc.
      })),
      explanation: q.explanation,
      marks: 1,
      difficulty: req.body.difficulty || 'medium',
      aiGenerated: true
    }));

    const quiz = await Quiz.create({
      title: quiz_title,
      description: `Quiz generated from: ${resource.title}`,
      subject: resource.subject || 'General',
      class: class_id || 'General',
      questions: formattedQuestions,
      settings: {
        duration: duration,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showCorrectAnswers: true
      },
      createdBy: req.user._id,
      sourceResource: resource._id,
      aiGeneration: {
        isAiGenerated: true,
        model: 'gemini-2.5-flash',
        generatedAt: new Date()
      },
      status: 'published',
      isActive: true
    });

    res.json({
      message: 'Quiz published successfully!',
      quiz_id: quiz._id,
      quiz_title: quiz.title,
      total_questions: quiz.questions.length
    });
  } catch (error) {
    console.error('Quiz publish error:', error);
    res.status(500).json({ message: 'Error publishing quiz', error: error.message });
  }
};

// @desc    Get all published quizzes (for students)
// @route   GET /api/resources/quizzes/available
// @access  Private
const getAvailableQuizzes = async (req, res) => {
  try {
    const Quiz = require('../models/Quiz');
    const User = require('../models/User');
    
    let query = { status: 'published', isActive: true };
    
    // If student, filter by class - only show quizzes for their class
    if (req.user.role === 'student') {
      // Get full user data to access studentInfo.class
      const student = await User.findById(req.user._id);
      const studentClass = student?.studentInfo?.class || student?.class_id || req.user.class;
      
      if (studentClass) {
        // Match quizzes where class equals student's class (case-insensitive string match)
        query.$or = [
          { class: studentClass },
          { class: new RegExp(`^${studentClass}$`, 'i') },
          { class: 'All' },
          { class: 'General' }
        ];
      }
    }

    const quizzes = await Quiz.find(query)
      .select('title description subject class settings.duration questions createdAt createdBy')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Add question count without exposing answers
    const quizzesWithCount = quizzes.map(q => ({
      _id: q._id,
      title: q.title,
      description: q.description,
      subject: q.subject,
      class: q.class,
      duration: q.settings?.duration || 30,
      questionCount: q.questions?.length || 0,
      createdAt: q.createdAt,
      createdBy: q.createdBy?.name || 'Teacher'
    }));

    res.json(quizzesWithCount);
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ message: 'Error fetching quizzes', error: error.message });
  }
};

// @desc    Get single quiz for attempting (students)
// @route   GET /api/resources/quizzes/:quizId
// @access  Private
const getQuizForAttempt = async (req, res) => {
  try {
    const Quiz = require('../models/Quiz');
    
    const quiz = await Quiz.findById(req.params.quizId)
      .select('-questions.options.isCorrect -questions.correctAnswer -questions.explanation');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.status !== 'published' || !quiz.isActive) {
      return res.status(400).json({ message: 'Quiz is not available' });
    }

    // Format for student attempt (hide correct answers)
    const quizData = {
      _id: quiz._id,
      quiz_title: quiz.title,
      description: quiz.description,
      subject: quiz.subject,
      duration: quiz.settings?.duration || 30,
      questions: quiz.questions.map((q, index) => ({
        id: index + 1,
        question: q.questionText,
        options: q.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt.text}`)
      }))
    };

    res.json(quizData);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Error fetching quiz', error: error.message });
  }
};

// @desc    Generate lesson plan from curriculum using Gemini AI
// @route   POST /api/resources/:id/generate-lesson-plan
// @access  Private (Teacher)
const generateLessonPlan = async (req, res) => {
  try {
    const { duration = '45 minutes', grade_level = '10th' } = req.body;
    
    const resource = await Resource.findById(req.params.id).select('+extractedText');
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (!resource.extractedText) {
      return res.status(400).json({ message: 'No text content available' });
    }

    const prompt = `Based on the following curriculum content, create a detailed lesson plan for ${grade_level} grade students with a duration of ${duration}.

Content:
${resource.extractedText.substring(0, 8000)}

Please create a comprehensive lesson plan in JSON format with:
{
  "title": "Lesson title",
  "subject": "${resource.subject}",
  "grade_level": "${grade_level}",
  "duration": "${duration}",
  "learning_objectives": ["objective 1", "objective 2"],
  "materials_needed": ["material 1", "material 2"],
  "lesson_outline": [
    {
      "phase": "Introduction",
      "duration": "5 minutes",
      "activities": ["Activity description"],
      "teacher_notes": "Notes for teacher"
    }
  ],
  "assessment_methods": ["method 1", "method 2"],
  "homework": "Homework assignment description"
}`;

    const lessonPlan = await generateJSON(prompt, { temperature: 0.7 });

    // Save as a new resource of type lesson_plan
    const savedPlan = await Resource.create({
      uploadedBy: req.user._id,
      subject: resource.subject,
      title: `Lesson Plan: ${lessonPlan.title}`,
      type: 'lesson-plan',
      applicableClasses: resource.applicableClasses,
      aiGeneratedContent: {
        summary: JSON.stringify(lessonPlan),
        lessonPlansGenerated: 1,
        lastProcessed: new Date()
      }
    });

    res.json({
      resource_id: savedPlan._id,
      ...lessonPlan
    });
  } catch (error) {
    console.error('Lesson plan generation error:', error);
    res.status(500).json({ message: 'Error generating lesson plan', error: error.message });
  }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private (Teacher)
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Check ownership
    if (resource.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'management') {
      return res.status(403).json({ message: 'Not authorized to delete this resource' });
    }

    // Delete file if exists
    if (resource.file_path && fs.existsSync(resource.file_path)) {
      fs.unlinkSync(resource.file_path);
    }

    await resource.deleteOne();
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get teacher's published quizzes with attempt statistics
// @route   GET /api/resources/quizzes/teacher-history
// @access  Private (Teacher)
const getTeacherQuizHistory = async (req, res) => {
  try {
    const Quiz = require('../models/Quiz');
    const QuizAttempt = require('../models/QuizAttempt');

    // Get all quizzes created by this teacher
    const quizzes = await Quiz.find({ createdBy: req.user._id })
      .select('title description subject class settings questions status createdAt attempts')
      .sort({ createdAt: -1 });

    // Get performance records for each quiz
    const quizzesWithStats = await Promise.all(quizzes.map(async (quiz) => {
      // Get all attempts from QuizAttempt collection
      const attempts = await QuizAttempt.find({ quiz_id: quiz._id })
        .populate('student_id', 'name email studentInfo.rollNumber')
        .sort({ date: -1 });

      const completedAttempts = attempts.length;
      const avgScore = completedAttempts > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedAttempts)
        : 0;
      const highestScore = completedAttempts > 0 
        ? Math.max(...attempts.map(a => a.percentage || 0))
        : 0;

      return {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        subject: quiz.subject,
        class: quiz.class,
        duration: quiz.settings?.duration || 30,
        questionCount: quiz.questions?.length || 0,
        status: quiz.status,
        createdAt: quiz.createdAt,
        stats: {
          totalAttempts: completedAttempts,
          avgScore,
          highestScore
        },
        recentAttempts: attempts.slice(0, 5).map(a => ({
          _id: a._id,
          student: a.student_id,
          score: a.score,
          totalMarks: a.total_marks,
          percentage: a.percentage,
          date: a.date
        }))
      };
    }));

    res.json(quizzesWithStats);
  } catch (error) {
    console.error('Get teacher quiz history error:', error);
    res.status(500).json({ message: 'Error fetching quiz history', error: error.message });
  }
};

// @desc    Get detailed quiz attempts for a specific quiz
// @route   GET /api/resources/quizzes/:quizId/attempts
// @access  Private (Teacher)
const getQuizAttempts = async (req, res) => {
  try {
    const Quiz = require('../models/Quiz');
    const QuizAttempt = require('../models/QuizAttempt');

    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Verify ownership
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'management') {
      return res.status(403).json({ message: 'Not authorized to view these attempts' });
    }

    const attempts = await QuizAttempt.find({ quiz_id: req.params.quizId })
      .populate('student_id', 'name email studentInfo.rollNumber studentInfo.class')
      .sort({ date: -1 });

    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        subject: quiz.subject,
        totalQuestions: quiz.questions?.length || 0,
        totalMarks: quiz.questions?.length || 0
      },
      attempts: attempts.map(a => ({
        _id: a._id,
        student: a.student_id,
        score: a.score,
        totalMarks: a.total_marks,
        percentage: a.percentage,
        date: a.date,
        answers: a.answers,
        ai_feedback: a.ai_feedback
      }))
    });
  } catch (error) {
    console.error('Get quiz attempts error:', error);
    res.status(500).json({ message: 'Error fetching attempts', error: error.message });
  }
};

// @desc    Get student's quiz history
// @route   GET /api/resources/quizzes/student-history
// @access  Private (Student)
const getStudentQuizHistory = async (req, res) => {
  try {
    const QuizAttempt = require('../models/QuizAttempt');
    const Quiz = require('../models/Quiz');

    const attempts = await QuizAttempt.find({ student_id: req.user._id })
      .sort({ date: -1 });

    // Enrich with quiz details
    const historyWithDetails = await Promise.all(attempts.map(async (attempt) => {
      let quizDetails = null;
      if (attempt.quiz_id) {
        quizDetails = await Quiz.findById(attempt.quiz_id)
          .select('title subject class createdBy')
          .populate('createdBy', 'name');
      }

      return {
        _id: attempt._id,
        quiz_id: attempt.quiz_id,
        quiz_topic: quizDetails?.title || attempt.quiz_topic || 'Unknown Quiz',
        subject: quizDetails?.subject || attempt.subject,
        teacher: quizDetails?.createdBy?.name || 'Teacher',
        score: attempt.score,
        total_marks: attempt.total_marks,
        percentage: attempt.percentage,
        date: attempt.date,
        time_taken: attempt.time_taken,
        ai_feedback: attempt.ai_feedback,
        answers: attempt.answers
      };
    }));

    res.json(historyWithDetails);
  } catch (error) {
    console.error('Get student quiz history error:', error);
    res.status(500).json({ message: 'Error fetching quiz history', error: error.message });
  }
};

module.exports = {
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
};
