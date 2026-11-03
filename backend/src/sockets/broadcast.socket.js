import BroadcastMessage from '../models/BroadcastMessage.js';
import BroadcastEnrollment from '../models/BroadcastEnrollment.js';
import { checkContent } from '../utils/contentFilter.js';
import logger from '../utils/logger.js';

export const setupBroadcastSocket = (io) => {
  io.on('connection', (socket) => {

    // ── Join channel socket room ──────────────────────────────────────────────
    socket.on('joinBroadcastChannel', async ({ channel }) => {
      try {
        const userId = socket.userId;
        if (!userId || !channel) return;

        const enrollment = await BroadcastEnrollment.findOne({ user: userId });
        if (!enrollment || enrollment.channel !== channel) {
          socket.emit('broadcastError', { message: 'Not enrolled in this channel' });
          return;
        }
        socket.join(`broadcast:${channel}`);
        logger.info('User joined broadcast channel', { userId, channel });
      } catch (err) {
        logger.error('joinBroadcastChannel error', { error: err.message });
      }
    });

    socket.on('leaveBroadcastChannel', ({ channel }) => {
      socket.leave(`broadcast:${channel}`);
    });

    // ── Send message (mentor only) ────────────────────────────────────────────
    socket.on('sendBroadcastMessage', async ({ channel, content }) => {
      try {
        const userId = socket.userId;
        if (!userId || !channel || !content?.trim()) return;

        const role = socket.handshake.auth?.userRole;
        if (role !== 'mentor') {
          socket.emit('broadcastError', { message: 'Only mentors can send messages' });
          return;
        }

        const mod = checkContent(content);
        if (mod.blocked) {
          socket.emit('broadcastError', { message: mod.reason });
          return;
        }

        const enrollment = await BroadcastEnrollment.findOne({ user: userId, channel });
        if (!enrollment) {
          socket.emit('broadcastError', { message: 'Not enrolled in this channel' });
          return;
        }

        // Optimistic broadcast
        const tempId  = `temp_${Date.now()}_${Math.random()}`;
        const optimistic = {
          _id: tempId, content: content.trim(),
          createdAt: new Date().toISOString(), temp: true,
          sender: { _id: userId, name: socket.userName || '', profileImage: socket.userImage || '', role },
        };
        io.to(`broadcast:${channel}`).emit('broadcastMessage', optimistic);

        // Save + confirm
        try {
          const msg = await BroadcastMessage.create({ channel, sender: userId, content: content.trim() });
          const populated = await BroadcastMessage.findById(msg._id)
            .populate('sender', 'name profileImage role').lean();
          io.to(`broadcast:${channel}`).emit('broadcastMessageConfirmed', {
            tempId, _id: populated._id, content: populated.content,
            createdAt: populated.createdAt, sender: populated.sender,
          });
        } catch (dbErr) {
          logger.error('BroadcastMessage DB save failed', { error: dbErr.message });
          io.to(`broadcast:${channel}`).emit('broadcastMessageFailed', { tempId });
        }
      } catch (err) {
        logger.error('sendBroadcastMessage error', { error: err.message });
        socket.emit('broadcastError', { message: 'Failed to send message' });
      }
    });

    // ── Typing ────────────────────────────────────────────────────────────────
    socket.on('broadcastTyping', ({ channel }) => {
      socket.to(`broadcast:${channel}`).emit('broadcastUserTyping', { userId: socket.userId, userName: socket.userName });
    });
    socket.on('broadcastStopTyping', ({ channel }) => {
      socket.to(`broadcast:${channel}`).emit('broadcastUserStoppedTyping', { userId: socket.userId });
    });
  });
};

export default setupBroadcastSocket;
