import mongoose from 'mongoose';

const groupMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one record per user — only one general group
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const GroupMember = mongoose.model('GroupMember', groupMemberSchema);
export default GroupMember;
