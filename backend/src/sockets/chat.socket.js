import MessageService from '../services/message.service.js';
import RoomService from '../services/room.service.js';
import logger from '../utils/logger.js';
import { checkContent } from '../utils/contentFilter.js';
import { sendPushToUser } from '../services/webPush.service.js';

const MAX_MESSAGE_LENGTH = 5000;
const MESSAGE_QUEUE_SIZE = 1000;

export const setupChatSocket = (io) => {
  // Track active connections
  const activeConnections = new Map();
  // Track user sockets by userId — Set allows multiple tabs per user
  const userSockets = new Map(); // userId → Set<socketId>

  const addUserSocket = (userId, socketId) => {
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socketId);
  };

  const removeUserSocket = (userId, socketId) => {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) userSockets.delete(userId);
  };

  const isUserOnline = (userId) => {
    const sockets = userSockets.get(userId);
    return sockets && sockets.size > 0;
  };

  io.on('connection', (socket) => {
    logger.info('User connected', { socketId: socket.id });
    activeConnections.set(socket.id, { userId: null, roomId: null });

    // Store user socket mapping when they authenticate
    if (socket.handshake.auth && socket.handshake.auth.userId) {
      const userId = socket.handshake.auth.userId;
      socket.userId = userId;
      socket.userName = socket.handshake.auth.userName || '';
      socket.userImage = socket.handshake.auth.userImage || '';
      addUserSocket(userId, socket.id);
      // Join a personal room for this user
      socket.join(`user:${userId}`);
      console.log(`✅ User ${userId} joined personal room user:${userId} with socket ${socket.id}`);
      logger.info('User joined personal room', { userId, socketId: socket.id });

      // Broadcast online status to all connected clients
      io.emit('userOnline', { userId });
    } else {
      console.log(`⚠️ Socket ${socket.id} connected without userId in handshake.auth`);
    }

    // Send current online users to newly connected client
    if (socket.handshake.auth?.userId) {
      const onlineUserIds = Array.from(userSockets.keys());
      socket.emit('onlineUsers', { userIds: onlineUserIds });
    }

    // Handle request to get current online users (for late-mounting components)
    socket.on('getOnlineUsers', () => {
      const onlineUserIds = Array.from(userSockets.keys());
      socket.emit('onlineUsers', { userIds: onlineUserIds });
    });

    // Join room event
    socket.on('joinRoom', async (data) => {
      try {
        const { roomId, userId } = data;

        if (!roomId || !userId) {
          socket.emit('error', { message: 'Missing roomId or userId' });
          return;
        }

        // Store userId and join personal room if not already done
        if (!socket.userId) {
          socket.userId = userId;
          addUserSocket(userId, socket.id);
          socket.join(`user:${userId}`);
        }

        // Verify room exists
        const room = await RoomService.getRoomById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Join socket to room
        socket.join(roomId);
        socket.roomId = roomId;

        // Update active connections
        activeConnections.set(socket.id, { userId, roomId });

        // Get latest messages (limit to 50 for performance)
        const messages = await MessageService.getLatestMessages(roomId, 50);

        // Reset unread count for this user when they join the room
        try {
          const Room = (await import('../models/Room.js')).default;
          const room = await Room.findById(roomId);
          if (room && room.unreadCount) {
            room.unreadCount.set(String(userId), 0);
            await room.save();
            // Notify chats page to reset badge
            io.to(`user:${userId}`).emit('unreadUpdate', {
              roomId,
              unreadCount: 0,
            });
          }
        } catch (e) { /* ignore */ }

        // Emit join event to user
        socket.emit('roomJoined', {
          success: true,
          roomId,
          messages,
          participants: room.student1 && room.student2 ? 2 : 1,
        });

        // Notify others in room
        socket.to(roomId).emit('userJoined', {
          userId,
          message: 'A user joined the room',
        });

        logger.info('User joined room', { userId, roomId, socketId: socket.id });
      } catch (error) {
        logger.error('Error joining room', { error: error.message });
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Send message event
    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, userId, content } = data;

        if (!socket.roomId || socket.roomId !== roomId) {
          socket.emit('error', { message: 'Not in this room' });
          return;
        }

        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        if (content.length > MAX_MESSAGE_LENGTH) {
          socket.emit('error', { message: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` });
          return;
        }

        // ── Content moderation ────────────────────────────────────────────
        const modResult = checkContent(content);
        if (modResult.blocked) {
          socket.emit('messageBLocked', {
            reason: modResult.reason,
          });
          return;
        }

        // ── Optimistic broadcast — send immediately before DB write ──────────
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const now = new Date().toISOString();

        // Get sender info from userSockets context
        const optimisticMsg = {
          _id: tempId,
          senderId: userId,
          content: content.trim(),
          createdAt: now,
          senderName: socket.userName || '',
          senderImage: socket.userImage || '',
          temp: true,
        };

        // Broadcast optimistically to everyone in room
        io.to(roomId).emit('messageReceived', optimisticMsg);

        // ── Save to DB in background ──────────────────────────────────────────
        const message = await MessageService.saveMessage(userId, roomId, content);

        // Send confirmed message to replace the temp one
        io.to(roomId).emit('messageConfirmed', {
          tempId,
          _id: message._id,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.createdAt,
          senderName: message.senderId.name,
          senderImage: message.senderId.profileImage,
        });

        // ── Message notification to recipient ─────────────────────────────────
        try {
          // Find recipient (the other person in the room)
          const Room = await import('../models/Room.js').then(m => m.default);
          const room = await Room.findById(roomId).select('student1 student2 unreadCount');
          if (room) {
            const recipientId = String(room.student1) === String(userId)
              ? String(room.student2)
              : String(room.student1);

            // Update lastMessage and unreadCount on Room
            const currentUnread = room.unreadCount?.get(recipientId) || 0;
            room.lastMessage = {
              content: content.trim().substring(0, 100),
              senderId: userId,
              createdAt: new Date(),
            };
            room.unreadCount = room.unreadCount || new Map();
            room.unreadCount.set(recipientId, currentUnread + 1);
            await room.save();

            // Emit unread count update to recipient's chats page
            io.to(`user:${recipientId}`).emit('unreadUpdate', {
              roomId,
              unreadCount: currentUnread + 1,
              lastMessage: {
                content: content.trim().substring(0, 100),
                senderId: userId,
                createdAt: new Date(),
              },
            });

            // Save notification to DB
            const Notification = await import('../models/Notification.js').then(m => m.default);
            const notif = await Notification.create({
              recipient: recipientId,
              sender: userId,
              type: 'message',
              message: `sent you a message: "${content.trim().substring(0, 60)}${content.length > 60 ? '...' : ''}"`,
            });

            // Emit real-time notification to recipient's personal room
            const populatedNotif = await Notification.findById(notif._id).populate('sender', 'name profileImage');
            io.to(`user:${recipientId}`).emit('notification', {
              _id: populatedNotif._id,
              type: 'message',
              sender: populatedNotif.sender,
              message: populatedNotif.message,
              createdAt: populatedNotif.createdAt,
              read: false,
            });

            // Push to device even if app/browser is closed (WhatsApp-style)
            sendPushToUser(recipientId, {
              title: populatedNotif.sender?.name || 'New Message',
              body: content.trim().substring(0, 100),
              icon: populatedNotif.sender?.profileImage || '/icons/icon-192x192.png',
              url: `/chat/${roomId}`,
              type: 'message',
            });
          }
        } catch (notifErr) {
          // Notification failure should not affect message delivery
          logger.warn('Message notification failed', { error: notifErr.message });
        }

        logger.debug('Message sent', { userId, roomId, messageId: message._id });
      } catch (error) {
        logger.error('Error sending message', { error: error.message });
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    // Delete message event
    socket.on('deleteMessage', async (data) => {
      try {
        const { messageId, userId, roomId } = data;

        if (!messageId || !userId) {
          socket.emit('error', { message: 'Missing messageId or userId' });
          return;
        }

        // Delete message (service will verify ownership)
        const deletedMessage = await MessageService.deleteMessage(messageId);

        if (!deletedMessage) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Verify the user owns this message
        const senderId = String(deletedMessage.senderId?._id || deletedMessage.senderId);
        if (senderId !== String(userId)) {
          socket.emit('error', { message: 'You can only delete your own messages' });
          return;
        }

        // Broadcast deletion to everyone in the room
        io.to(roomId).emit('messageDeleted', { messageId });

        logger.debug('Message deleted', { userId, roomId, messageId });
      } catch (error) {
        logger.error('Error deleting message', { error: error.message });
        socket.emit('error', { message: error.message || 'Failed to delete message' });
      }
    });

    // Typing indicator event
    socket.on('typing', (data) => {
      const { roomId, userId, userName } = data;

      if (socket.roomId === roomId) {
        socket.to(roomId).emit('userTyping', {
          userId,
          userName,
        });
      }
    });

    // Stop typing event
    socket.on('stopTyping', (data) => {
      const { roomId, userId } = data;

      if (socket.roomId === roomId) {
        socket.to(roomId).emit('userStoppedTyping', {
          userId,
        });
      }
    });

    // Leave room event
    socket.on('leaveRoom', async (data) => {
      try {
        const { roomId } = data;

        socket.leave(roomId);
        socket.to(roomId).emit('userLeft', {
          message: 'A user left the room',
        });

        logger.info('User left room', { roomId, socketId: socket.id });
      } catch (error) {
        logger.error('Error leaving room', { error: error.message });
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      const connection = activeConnections.get(socket.id);
      if (connection && connection.roomId) {
        socket.to(connection.roomId).emit('userLeft', {
          message: 'A user disconnected',
        });
      }

      // Remove from user sockets map
      if (socket.userId) {
        removeUserSocket(socket.userId, socket.id);
        // Only broadcast offline if this user has no remaining sockets
        if (!isUserOnline(socket.userId)) {
          io.emit('userOffline', { userId: socket.userId });
        }
      }

      activeConnections.delete(socket.id);
      logger.info('User disconnected', { socketId: socket.id });
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('Socket error', { error: error.message, socketId: socket.id });
    });
  });

  // Make userSockets map available to other socket handlers
  io.userSockets = userSockets;
  io.isUserOnline = isUserOnline;

  // Periodic cleanup of stale connections
  setInterval(() => {
    const now = Date.now();
    activeConnections.forEach((connection, socketId) => {
      if (connection.lastActivity && now - connection.lastActivity > 30 * 60 * 1000) {
        // Remove connections inactive for 30 minutes
        activeConnections.delete(socketId);
      }
    });
  }, 5 * 60 * 1000); // Check every 5 minutes
};

export default setupChatSocket;
