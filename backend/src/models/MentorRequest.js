import mongoose from 'mongoose';

const mentorRequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed'],
      default: 'pending',
      index: true,
    },
    message: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
mentorRequestSchema.index({ status: 1, studentId: 1 });
mentorRequestSchema.index({ mentorId: 1, status: 1 });
mentorRequestSchema.index({ roomId: 1 });

export default mongoose.model('MentorRequest', mentorRequestSchema);
