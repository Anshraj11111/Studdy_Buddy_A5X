import mongoose from 'mongoose';

const lectureProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource', // Changed from 'Lecture' to 'Resource'
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
  // Watch progress tracking
  watchedDuration: {
    type: Number,
    default: 0, // seconds watched
  },
  totalDuration: {
    type: Number,
    default: 0, // total video duration in seconds
  },
  watchedPercentage: {
    type: Number,
    default: 0, // 0-100
    min: 0,
    max: 100,
  },
  // Completion status
  isCompleted: {
    type: Boolean,
    default: false, // true when watchedPercentage >= 100
  },
  completedAt: {
    type: Date,
  },
  // Last activity
  lastWatchedAt: {
    type: Date,
    default: Date.now,
  },
  // Track multiple watch sessions
  watchSessions: [{
    startedAt: Date,
    endedAt: Date,
    duration: Number, // seconds
  }],
}, {
  timestamps: true,
});

// Compound index for efficient queries
lectureProgressSchema.index({ userId: 1, lectureId: 1 }, { unique: true });
lectureProgressSchema.index({ userId: 1, courseId: 1 });
lectureProgressSchema.index({ userId: 1, isCompleted: 1 });

// Method to update progress
lectureProgressSchema.methods.updateProgress = function(watchedDuration, totalDuration) {
  this.watchedDuration = Math.max(this.watchedDuration, watchedDuration);
  this.totalDuration = totalDuration;
  this.watchedPercentage = totalDuration > 0 
    ? Math.min(100, Math.round((this.watchedDuration / totalDuration) * 100))
    : 0;
  
  // Mark as completed if watched >= 95% (to account for slight timing differences)
  if (this.watchedPercentage >= 95 && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }
  
  this.lastWatchedAt = new Date();
  return this;
};

const LectureProgress = mongoose.model('LectureProgress', lectureProgressSchema);

export default LectureProgress;
