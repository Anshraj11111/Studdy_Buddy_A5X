import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['student', 'mentor'],
      default: 'student',
    },
    mentorCode: {
      type: String,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: '',
      maxlength: [300, 'Bio cannot exceed 300 characters'],
    },
    address: {
      type: String,
      default: '',
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    xp: {
      type: Number,
      default: 0,
      min: [0, 'XP cannot be negative'],
    },
    tokens: {
      type: Number,
      default: 0,
      min: [0, 'Tokens cannot be negative'],
    },
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastActivityDate: { type: Date, default: null },
    },
    xpHistory: [
      {
        action:    { type: String },   // e.g. 'post', 'like_received', 'comment', 'doubt', 'streak_bonus'
        amount:    { type: Number },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    dailyPostCount: {
      type: Number,
      default: 0,
      min: [0, 'Daily post count cannot be negative'],
    },
    lastPostDate: {
      type: Date,
      default: null,
    },
    profileImage: {
      type: String,
      default: '',
    },
    bannerImage: {
      type: String,
      default: '',
    },
    headline: {
      type: String,
      default: '',
      maxlength: [120, 'Headline cannot exceed 120 characters'],
    },
    socialLinks: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      instagram: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    // Private fields — only visible to the owner, never exposed in public profile APIs
    phone: {
      type: String,
      default: '',
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    privateAddress: {
      type: String,
      default: '',
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    // Student: school / college info
    education: {
      institution: { type: String, default: '' },
      degree: { type: String, default: '' },
      field: { type: String, default: '' },
      startYear: { type: String, default: '' },
      endYear: { type: String, default: '' },
      description: { type: String, default: '', maxlength: [500, 'Description too long'] },
    },
    // School-specific fields (optional - for free access)
    schoolName: {
      type: String,
      default: '',
      trim: true,
    },
    schoolPassword: {
      type: String,
      default: '',
      trim: true,
    },
    schoolPasswordPlain: {
      type: String,
      default: '',
      trim: true,
      select: false, // Hide by default for security
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    // Payment fields for freemium model
    isPremium: {
      type: Boolean,
      default: false,
    },
    paidCourses: [
      {
        courseId: { type: String },
        amount: { type: Number },
        transactionId: { type: String },
        paidAt: { type: Date, default: Date.now },
      }
    ],
    totalPaid: {
      type: Number,
      default: 0,
    },
    // Mentor: professional experience
    experience: {
      company: { type: String, default: '' },
      role: { type: String, default: '' },
      startYear: { type: String, default: '' },
      endYear: { type: String, default: '' },
      description: { type: String, default: '', maxlength: [500, 'Description too long'] },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Referral system
    referralCode: {
      type: String,
      unique: true,
      sparse: true,   // allows null without unique conflict
      default: null,
    },
    referralsMade: {
      type: Number,
      default: 0,     // count of successful referrals (paid + approved)
    },

    // Password reset fields
    passwordResetCode: {
      type: String,
      default: null,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
    },
    passwordResetAttempts: {
      type: Number,
      default: 0,
    },
    passwordResetLastAttempt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to exclude password and private fields from JSON responses
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  // Add hasFreeAccess flag: 
  // - Mentors always have free access
  // - Students have free access if they have school credentials OR isPremium
  user.hasFreeAccess = this.role === 'mentor' || !!(this.schoolName && this.schoolPassword) || this.isPremium;
  delete user.schoolPassword;
  delete user.phone;
  delete user.privateAddress;
  // referralCode is always returned (needed for sharing)
  return user;
};

// Method to get full profile including private fields (for owner only)
userSchema.methods.toOwnerJSON = function () {
  const user = this.toObject();
  delete user.password;
  // Add hasFreeAccess flag:
  // - Mentors always have free access
  // - Students have free access if they have school credentials OR isPremium
  user.hasFreeAccess = this.role === 'mentor' || !!(this.schoolName && this.schoolPassword) || this.isPremium;
  delete user.schoolPassword;
  // referralCode is always returned for owner
  return user;
};

// ── Performance Indexes for 10K+ users ──────────────────────────────────────────
userSchema.index({ email: 1 });                    // Login queries (unique already)
userSchema.index({ role: 1 });                     // Filter by role
userSchema.index({ role: 1, xp: -1 });             // Leaderboard queries
userSchema.index({ 'skills': 1 });                 // Search by skills
userSchema.index({ createdAt: -1 });               // Recent users
userSchema.index({ isActive: 1, role: 1 });        // Active users by role
userSchema.index({ mentorCode: 1 }, { sparse: true }); // Mentor lookup
userSchema.index({ referralCode: 1 }, { sparse: true }); // Referral lookup
userSchema.index({ schoolName: 1, city: 1 });      // School-based filtering

// Lazy model creation - wait for connection to be ready
let User;

const getUserModel = () => {
  if (User) return User;
  
  try {
    const conn = getConnection('primary');
    if (conn && conn.readyState === 1) {
      User = conn.model('User', userSchema);
    } else {
      // Fallback to default if connection not ready
      User = mongoose.model('User', userSchema);
    }
  } catch (error) {
    // Fallback to default mongoose connection
    User = mongoose.model('User', userSchema);
  }
  
  return User;
};

// Export the model getter
export default getUserModel();
