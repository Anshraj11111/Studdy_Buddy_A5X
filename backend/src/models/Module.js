import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const moduleSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  order: {
    type: Number,
    required: true,
    default: 1,
  },
  isFree: {
    type: Boolean,
    default: false,
  },
  duration: {
    type: String, // e.g., "2.5 hours"
    default: '0 hours',
  },
  videoCount: {
    type: Number,
    default: 0,
  },
  resources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for fast queries
moduleSchema.index({ courseId: 1, order: 1 });

let Module;
try {
  const conn = getConnection('secondary');
  Module = conn.model('Module', moduleSchema);
} catch (error) {
  Module = mongoose.model('Module', moduleSchema);
}

export default Module;
