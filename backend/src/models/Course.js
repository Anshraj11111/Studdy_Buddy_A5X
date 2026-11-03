import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
    default: '',
  },
  topic: {
    type: String,
    required: true,
    enum: ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Entrepreneurship'],
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner',
  },
  language: {
    type: String,
    enum: ['English', 'Hindi', 'Hinglish'],
    default: 'English',
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  enrolledCount: {
    type: Number,
    default: 0,
  },
  totalDuration: {
    type: String, // e.g., "12 hours"
    default: '0 hours',
  },
  totalVideos: {
    type: Number,
    default: 0,
  },
  tags: [{
    type: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  isBestseller: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  modules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
  }],
}, {
  timestamps: true,
});

// Virtual for checking if course is new (created in last 7 days)
courseSchema.virtual('isNew').get(function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.createdAt > sevenDaysAgo;
});

// Ensure virtuals are included in JSON
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

let Course;
try {
  const conn = getConnection('secondary');
  Course = conn.model('Course', courseSchema);
} catch (error) {
  Course = mongoose.model('Course', courseSchema);
}

export default Course;
