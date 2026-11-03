import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: false, // Optional field
      default: '',
      maxlength: 2000,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    notesUrl: {
      type: String,
      required: false,
      default: '',
    },
    fileType: {
      type: String,
      enum: ['pdf', 'doc', 'image', 'video', 'link', 'other'],
      default: 'other',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    downloads: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    // NEW FIELDS FOR COURSE STRUCTURE
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null, // null for standalone resources
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      default: null,
    },
    order: {
      type: Number,
      default: 0, // Order within module
    },
    duration: {
      type: String, // e.g., "58m", "1h 04m"
      default: '',
    },
    lectureDate: {
      type: Date,
      default: null,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
resourceSchema.index({ topic: 1, createdAt: -1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ tags: 1 });
resourceSchema.index({ courseId: 1, moduleId: 1, order: 1 }); // NEW: For course structure

let Resource;
try {
  const conn = getConnection('secondary');
  Resource = conn.model('Resource', resourceSchema);
} catch (error) {
  Resource = mongoose.model('Resource', resourceSchema);
}

export default Resource;
