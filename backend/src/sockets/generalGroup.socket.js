import GroupMessage from '../models/GroupMessage.js';
import GroupMember from '../models/GroupMember.js';
import { checkContent } from '../utils/contentFilter.js';
import logger from '../utils/logger.js';

const ROOM = 'general-group';
const MAX_LEN = 2000;

export const setupGeneralGroupSocket = (io) => {
  io.on('connection', (socket) => {
    // ── Join general group socket room ────────────────────────────────────────
    socket.on('joinGeneralGroup', async () => {
      try {
        const userId = socket.userId;
        if (!userId) return;

        // Verify user is actually a member in DB
        const member = await GroupMember.findOne({ user: userId });
        if (!member) {
          socket.emit('generalGroupError', { message: 'Join the group first' });
          return;
        }

        socket.join(ROOM);
        const count = await GroupMember.countDocuments();
        // Notify group about new online member
        io.to(ROOM).emit('groupMemberCount', { count });
        logger.info('User joined general group socket room', { userId });
      } catch (err) {
        logger.error('joinGeneralGroup error', { error: err.message });
      }
    });

    // ── Leave general group socket room ──────────────────────────────────────
    socket.on('leaveGeneralGroup', () => {
      socket.leave(ROOM);
    });

    // ── Send message to general group ─────────────────────────────────────────
    socket.on('sendGroupMessage', async (data) => {
      try {
        const userId = socket.userId;
        if (!userId) return;

        // Only mentors can send messages
        const role = socket.handshake.auth?.userRole;
        if (role !== 'mentor') {
          socket.emit('generalGroupError', { message: 'Only mentors can send messages' });
          return;
        }

        const { content } = data;
        if (!content || !content.trim()) return;
        if (content.length > MAX_LEN) {
          socket.emit('generalGroupError', { message: `Message too long (max ${MAX_LEN} chars)` });
          return;
        }

        // Content filter
        const mod = checkContent(content);
        if (mod.blocked) {
          socket.emit('generalGroupError', { message: mod.reason });
          return;
        }

        // Verify membership
        const member = await GroupMember.findOne({ user: userId });
        if (!member) {
          socket.emit('generalGroupError', { message: 'Not a member' });
          return;
        }

        // ── Optimistic broadcast FIRST — instant for everyone ────────────────
        const tempId  = `temp_${Date.now()}_${Math.random()}`;
        const now     = new Date().toISOString();
        const optimistic = {
          _id:       tempId,
          content:   content.trim(),
          createdAt: now,
          temp:      true,
          sender: {
            _id:          userId,
            name:         socket.userName  || '',
            profileImage: socket.userImage || '',
            role:         role,
          },
        };
        io.to(ROOM).emit('groupMessage', optimistic);

        // ── Save to DB in background ─────────────────────────────────────────
        try {
          const msg = await GroupMessage.create({ sender: userId, content: content.trim() });
          const populated = await GroupMessage.findById(msg._id)
            .populate('sender', 'name profileImage role')
            .lean();

          // Send confirmed message to replace temp
          io.to(ROOM).emit('groupMessageConfirmed', {
            tempId,
            _id:       populated._id,
            content:   populated.content,
            createdAt: populated.createdAt,
            sender:    populated.sender,
          });
        } catch (dbErr) {
          logger.error('GroupMessage DB save failed', { error: dbErr.message });
          // Tell room to remove the temp message
          io.to(ROOM).emit('groupMessageFailed', { tempId });
        }

        logger.debug('Group message sent', { userId });
      } catch (err) {
        logger.error('sendGroupMessage error', { error: err.message });
        socket.emit('generalGroupError', { message: 'Failed to send message' });
      }
    });

    // ── Typing in group ───────────────────────────────────────────────────────
    socket.on('groupTyping', () => {
      socket.to(ROOM).emit('groupUserTyping', {
        userId:   socket.userId,
        userName: socket.userName,
      });
    });

    socket.on('groupStopTyping', () => {
      socket.to(ROOM).emit('groupUserStoppedTyping', { userId: socket.userId });
    });
  });
};

export default setupGeneralGroupSocket;
