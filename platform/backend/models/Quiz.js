const mongoose = require('mongoose');

// Individual question schema
const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['mcq', 'true-false', 'short-answer', 'long-answer', 'fill-blank'],
    default: 'mcq'
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: String, // For non-MCQ questions
  explanation: String,
  marks: { type: Number, default: 1 },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  topic: String,
  // For AI-generated questions
  aiGenerated: { type: Boolean, default: false }
});

// Student attempt schema
const attemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [{
    questionIndex: Number,
    selectedOption: Number, // For MCQ
    textAnswer: String, // For text answers
    isCorrect: Boolean,
    marksObtained: Number
  }],
  startedAt: { type: Date, default: Date.now },
  submittedAt: Date,
  totalMarks: Number,
  obtainedMarks: Number,
  percentage: Number,
  timeTaken: Number, // in seconds
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'evaluated', 'expired'],
    default: 'in-progress'
  }
});

const quizSchema = new mongoose.Schema({
  // Basic info
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true
  },
  description: String,
  instructions: String,
  
  // Subject and class
  subject: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String
    required: true
  },
  class: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String
    required: true
  },
  
  // Topics covered
  topics: [String],
  chapter: String,
  
  // Questions
  questions: [questionSchema],
  
  // Quiz settings
  settings: {
    duration: { type: Number, default: 30 }, // in minutes
    totalMarks: Number,
    passingMarks: Number,
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    showCorrectAnswers: { type: Boolean, default: false },
    allowRetake: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 1 }
  },
  
  // Scheduling
  schedule: {
    startDate: Date,
    endDate: Date,
    isScheduled: { type: Boolean, default: false }
  },
  
  // Created by teacher
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Source resource (if generated from PDF)
  sourceResource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  },
  
  // AI generation info
  aiGeneration: {
    isAiGenerated: { type: Boolean, default: false },
    prompt: String,
    model: String,
    generatedAt: Date
  },
  
  // Student attempts
  attempts: [attemptSchema],
  
  // Stats
  stats: {
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    lowestScore: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 }
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'archived'],
    default: 'draft'
  },
  
  isActive: { type: Boolean, default: true }

}, {
  timestamps: true
});

// Indexes
quizSchema.index({ createdBy: 1, status: 1 });
quizSchema.index({ class: 1, subject: 1 });
quizSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
quizSchema.index({ 'attempts.student': 1 });

// Calculate total marks before saving
quizSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.settings.totalMarks = this.questions.reduce((sum, q) => sum + q.marks, 0);
    if (!this.settings.passingMarks) {
      this.settings.passingMarks = Math.ceil(this.settings.totalMarks * 0.4); // 40% passing
    }
  }
  next();
});

// Method to get student's attempt
quizSchema.methods.getStudentAttempt = function(studentId) {
  return this.attempts.find(a => a.student.toString() === studentId.toString());
};

// Method to calculate and update stats
quizSchema.methods.updateStats = function() {
  const completedAttempts = this.attempts.filter(a => a.status === 'evaluated' || a.status === 'submitted');
  
  if (completedAttempts.length === 0) {
    return;
  }
  
  const scores = completedAttempts.map(a => a.obtainedMarks);
  const passedCount = completedAttempts.filter(a => a.obtainedMarks >= this.settings.passingMarks).length;
  
  this.stats = {
    totalAttempts: completedAttempts.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    passRate: Math.round((passedCount / completedAttempts.length) * 100)
  };
};

// Static method to get quizzes for a student
quizSchema.statics.getAvailableForStudent = async function(studentId, classId) {
  const now = new Date();
  return await this.find({
    class: classId,
    status: 'published',
    isActive: true,
    $or: [
      { 'schedule.isScheduled': false },
      {
        'schedule.isScheduled': true,
        'schedule.startDate': { $lte: now },
        'schedule.endDate': { $gte: now }
      }
    ]
  })
  .select('-questions.options.isCorrect -questions.correctAnswer -questions.explanation')
  .populate('subject', 'name')
  .populate('createdBy', 'name');
};

module.exports = mongoose.model('Quiz', quizSchema);
