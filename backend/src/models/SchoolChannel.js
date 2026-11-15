import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const schoolChannelSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: [true, 'School name is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    // Unique identifier for the school channel (schoolName-city)
    channelId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Admin who created this channel
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Array of member user IDs
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Channel settings
    settings: {
      // Whether students can post messages or only admins
      studentsCanPost: {
        type: Boolean,
        default: true,
      },
      // Whether to show member list
      showMemberList: {
        type: Boolean,
        default: true,
      },
    },
    // Channel statistics
    stats: {
      totalMembers: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      lastActivityAt: { type: Date, default: Date.now },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound unique index on schoolName and city
schoolChannelSchema.index({ schoolName: 1, city: 1 }, { unique: true });
schoolChannelSchema.index({ channelId: 1 });
schoolChannelSchema.index({ isActive: 1 });
schoolChannelSchema.index({ createdAt: -1 });

// Static method to generate channelId from school name and city
schoolChannelSchema.statics.generateChannelId = function(schoolName, city) {
  // Normalize: trim, lowercase, replace multiple spaces/dashes with single dash
  const normalizeString = (str) => str.trim().toLowerCase()
    .replace(/\s+/g, '-')  // Replace spaces with dash
    .replace(/-+/g, '-')   // Replace multiple dashes with single dash
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  
  return `${normalizeString(schoolName)}-${normalizeString(city)}`;
};

// Method to check if a user can join this channel
schoolChannelSchema.methods.canUserJoin = function(user) {
  // User must have matching school name and city (case-insensitive comparison)
  const userSchool = (user.schoolName || '').trim().toLowerCase();
  const channelSchool = (this.schoolName || '').trim().toLowerCase();
  const userCity = (user.city || '').trim().toLowerCase();
  const channelCity = (this.city || '').trim().toLowerCase();
  
  return userSchool === channelSchool && userCity === channelCity;
};

// Get the appropriate database connection (secondary for SchoolChannel)
let SchoolChannel;
try {
  const conn = getConnection('secondary');
  SchoolChannel = conn.model('SchoolChannel', schoolChannelSchema);
} catch (error) {
  // Fallback to default mongoose connection
  SchoolChannel = mongoose.model('SchoolChannel', schoolChannelSchema);
}

export default SchoolChannel;
