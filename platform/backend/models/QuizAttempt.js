const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: String,
  student_answer: String,
  correct_answer: String,
  is_correct: Boolean
});

const quizAttemptSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  },
  quiz_topic: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: 'General'
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  total_marks: {
    type: Number,
    required: true,
    min: 1
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  answers: [answerSchema],
  ai_feedback: {
    type: String
  },
  time_taken: {
    type: Number, // in seconds
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
quizAttemptSchema.index({ student_id: 1, date: -1 });
quizAttemptSchema.index({ quiz_id: 1, date: -1 });
quizAttemptSchema.index({ student_id: 1, quiz_id: 1 });

// Pre-save middleware to calculate percentage
quizAttemptSchema.pre('save', function(next) {
  if (this.score !== undefined && this.total_marks) {
    this.percentage = Math.round((this.score / this.total_marks) * 100);
  }
  next();
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
