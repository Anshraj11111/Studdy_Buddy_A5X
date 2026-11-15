import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  options: [{
    type: String,
    required: true,
  }],
  correctAnswer: {
    type: Number, // Index of correct option (0, 1, 2, 3)
    required: true,
    min: 0,
  },
  explanation: {
    type: String, // Optional explanation shown after submission
    trim: true,
  },
  marks: {
    type: Number,
    default: 1,
  },
});

const quizSchema = new mongoose.Schema({
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource', // Changed from 'Lecture' to 'Resource'
    required: true,
    unique: true, // One quiz per lecture
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
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  questions: [questionSchema],
  // Quiz settings
  passingScore: {
    type: Number,
    default: 60, // Percentage required to pass
    min: 0,
    max: 100,
  },
  duration: {
    type: Number, // Time limit in minutes (0 = no limit)
    default: 0,
  },
  maxAttempts: {
    type: Number, // Maximum attempts allowed (0 = unlimited)
    default: 3,
  },
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  // Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
quizSchema.index({ lectureId: 1 });
quizSchema.index({ courseId: 1 });
quizSchema.index({ isActive: 1 });

// Virtual for total marks
quizSchema.virtual('totalMarks').get(function() {
  return this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
});

// Method to calculate score
quizSchema.methods.calculateScore = function(answers) {
  let correctCount = 0;
  let totalMarks = 0;
  let earnedMarks = 0;
  
  const results = this.questions.map((question, index) => {
    const studentAnswer = answers[index];
    const isCorrect = studentAnswer === question.correctAnswer;
    
    totalMarks += question.marks || 1;
    if (isCorrect) {
      correctCount++;
      earnedMarks += question.marks || 1;
    }
    
    return {
      questionIndex: index,
      studentAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      marks: question.marks || 1,
      earnedMarks: isCorrect ? (question.marks || 1) : 0,
    };
  });
  
  const percentage = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;
  const isPassed = percentage >= this.passingScore;
  
  return {
    correctCount,
    totalQuestions: this.questions.length,
    earnedMarks,
    totalMarks,
    percentage,
    isPassed,
    results,
  };
};

// Don't send correct answers to frontend (security)
quizSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  obj.questions = obj.questions.map(q => ({
    question: q.question,
    options: q.options,
    marks: q.marks,
    _id: q._id,
  }));
  return obj;
};

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
