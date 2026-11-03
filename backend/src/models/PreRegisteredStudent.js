import mongoose from 'mongoose';

const preRegisteredStudentSchema = new mongoose.Schema(
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
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    schoolName: {
      type: String,
      default: '',
      trim: true,
    },
    schoolPassword: {
      type: String,
      required: [true, 'School password is required'],
      trim: true,
    },
    schoolPasswordPlain: {
      type: String,
      default: '',
      trim: true,
      select: true, // Include in queries by default for admin viewing
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
preRegisteredStudentSchema.index({ email: 1 });
preRegisteredStudentSchema.index({ isUsed: 1 });

const PreRegisteredStudent = mongoose.model('PreRegisteredStudent', preRegisteredStudentSchema);

export default PreRegisteredStudent;
