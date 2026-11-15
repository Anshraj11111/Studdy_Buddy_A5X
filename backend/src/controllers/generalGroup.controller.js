import GroupMessage from '../models/GroupMessage.js';
import GroupMember from '../models/GroupMember.js';
import User from '../models/User.js';

const GENERAL_GROUP_SOCKET_ROOM = 'general-group';

// ── Join the general group ────────────────────────────────────────────────────
export const joinGroup = async (req, res) => {
  try {
    const userId = req.user._id;

    // Upsert — idempotent join
    await GroupMember.findOneAndUpdate(
      { user: userId },
      { user: userId, joinedAt: new Date() },
      { upsert: true, new: true }
    );

    const totalMembers = await GroupMember.countDocuments();

    return res.status(200).json({
      success: true,
      message: 'Joined General Group successfully',
      totalMembers,
    });
  } catch (err) {
    console.error('joinGroup error:', err);
    return res.status(500).json({ success: false, message: 'Failed to join group' });
  }
};

// ── Leave the general group ───────────────────────────────────────────────────
export const leaveGroup = async (req, res) => {
  try {
    await GroupMember.deleteOne({ user: req.user._id });
    const totalMembers = await GroupMember.countDocuments();
    return res.status(200).json({ success: true, message: 'Left General Group', totalMembers });
  } catch (err) {
    console.error('leaveGroup error:', err);
    return res.status(500).json({ success: false, message: 'Failed to leave group' });
  }
};

// ── Check membership status ───────────────────────────────────────────────────
export const getStatus = async (req, res) => {
  try {
    const member = await GroupMember.findOne({ user: req.user._id });
    const totalMembers = await GroupMember.countDocuments();
    return res.status(200).json({
      success: true,
      isMember: !!member,
      totalMembers,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get status' });
  }
};

// ── Get messages (paginated, latest 60) ───────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    // Must be a member
    const member = await GroupMember.findOne({ user: req.user._id });
    if (!member) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 60;
    const skip  = (page - 1) * limit;

    const messages = await GroupMessage.find({ deleted: false })
      .populate('sender', 'name profileImage role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();   // plain JS — much faster than mongoose docs

    // Reverse so oldest first for the chat UI
    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      page,
    });
  } catch (err) {
    console.error('getMessages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

// ── Get members list (mentor / admin only) ────────────────────────────────────
export const getMembers = async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({ success: false, message: 'Only mentors can view members' });
    }

    const members = await GroupMember.find()
      .populate('user', 'name profileImage role email headline')
      .sort({ joinedAt: -1 });

    return res.status(200).json({
      success: true,
      members: members.map(m => ({
        ...m.user.toJSON ? m.user.toJSON() : m.user,
        joinedAt: m.joinedAt,
      })),
      total: members.length,
    });
  } catch (err) {
    console.error('getMembers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get members' });
  }
};

// ── Delete a message (mentor / admin or own message) ─────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const msg = await GroupMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    const isMentor = req.user.role === 'mentor';
    const isOwner  = String(msg.sender) === String(req.user._id) ||
                     (msg.sender?._id && String(msg.sender._id) === String(req.user._id));

    if (!isMentor && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    msg.deleted = true;
    await msg.save();

    return res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
};

export { GENERAL_GROUP_SOCKET_ROOM };
