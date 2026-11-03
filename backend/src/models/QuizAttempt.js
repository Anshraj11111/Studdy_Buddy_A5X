import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true,
  },
  // Attempt number (1st, 2nd, 3rd attempt)
  attemptNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  // Student's answers (array of option indexes)
  answers: [{
    type: Number, // Index of selected option
    required: true,
  }],
  // Results
  score: {
    correctCount: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    earnedMarks: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  // Pass/Fail status
  isPassed: {
    type: Boolean,
    default: false,
  },
  // Detailed results (question-wise breakdown)
  detailedResults: [{
    questionIndex: Number,
    studentAnswer: Number,
    correctAnswer: Number,
    isCorrect: Boolean,
    marks: Number,
    earnedMarks: Number,
  }],
  // Timing
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  timeTaken: {
    type: Number, // Time taken in seconds
  },
  // Status
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress',
  },
}, {
  timestamps: true,
});

// Compound indexes
quizAttemptSchema.index({ userId: 1, quizId: 1 });
quizAttemptSchema.index({ userId: 1, lectureId: 1 });
quizAttemptSchema.index({ userId: 1, courseId: 1 });
quizAttemptSchema.index({ userId: 1, isPassed: 1 });

// Static method to get attempt count for a user
quizAttemptSchema.statics.getAttemptCount = async function(userId, quizId) {
  return await this.countDocuments({ 
    userId, 
    quizId,
    status: 'completed' 
  });
};

// Static method to get best attempt
quizAttemptSchema.statics.getBestAttempt = async function(userId, quizId) {
  return await this.findOne({ 
    userId, 
    quizId,
    status: 'completed' 
  })
  .sort({ 'score.percentage': -1 })
  .limit(1);
};

// Method to complete attempt
quizAttemptSchema.methods.complete = function(scoreData) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.timeTaken = Math.floor((this.completedAt - this.startedAt) / 1000); // seconds
  
  this.score = {
    correctCount: scoreData.correctCount,
    totalQuestions: scoreData.totalQuestions,
    earnedMarks: scoreData.earnedMarks,
    totalMarks: scoreData.totalMarks,
    percentage: scoreData.percentage,
  };
  
  this.isPassed = scoreData.isPassed;
  this.detailedResults = scoreData.results;
  
  return this;
};

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

export default QuizAttempt;
