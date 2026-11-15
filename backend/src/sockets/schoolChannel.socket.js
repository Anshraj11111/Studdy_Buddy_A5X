import SchoolChannel from '../models/SchoolChannel.js';
import SchoolChannelMessage from '../models/SchoolChannelMessage.js';
import User from '../models/User.js';
import { checkContent } from '../utils/contentFilter.js';

export const setupSchoolChannelSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('🏫 User connected to school channel:', socket.id);

    // Join user's school channel
    socket.on('school-channel:join', async (data) => {
      try {
        const { userId } = data;
        const user = await User.findById(userId);
        
        if (!user || !user.schoolName || !user.city) {
          socket.emit('school-channel:error', { message: 'User has no school information' });
          return;
        }

        const channelId = SchoolChannel.generateChannelId(user.schoolName, user.city);
        socket.join(channelId);
        
        console.log(`✅ User ${user.name} joined channel: ${channelId}`);
        socket.emit('school-channel:joined', { channelId });
      } catch (error) {
        console.error('Error joining school channel:', error);
        socket.emit('school-channel:error', { message: 'Failed to join channel' });
      }
    });

    // Send message to school channel
    socket.on('school-channel:message', async (data) => {
      try {
        const { userId, channelId, content, messageType, attachments } = data;
        
        // Verify user is member of this channel
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('school-channel:error', { message: 'User not found' });
          return;
        }

        const channel = await SchoolChannel.findOne({ channelId });
        if (!channel) {
          socket.emit('school-channel:error', { message: 'Channel not found' });
          return;
        }

        if (!channel.members.some(m => m.toString() === userId)) {
          socket.emit('school-channel:error', { message: 'Not a member of this channel' });
          return;
        }

        // Only channel creator (admin) can post messages
        if (channel.createdBy.toString() !== userId) {
          socket.emit('school-channel:error', { message: 'Only the channel admin can post messages' });
          return;
        }

        // Content moderation - block abusive words
        if (content && typeof content === 'string') {
          const modResult = checkContent(content);
          if (modResult.blocked) {
            socket.emit('school-channel:error', { message: modResult.reason });
            return;
          }
        }

        // Create and save message
        const message = await SchoolChannelMessage.create({
          channelId,
          channel: channel._id,
          sender: userId,
          content,
          messageType: messageType || 'text',
          attachments: attachments || [],
        });

        // Update channel stats
        await SchoolChannel.findByIdAndUpdate(channel._id, {
          'stats.totalMessages': channel.stats.totalMessages + 1,
          'stats.lastActivityAt': new Date(),
        });

        // Populate sender info
        await message.populate('sender', 'name profileImage role');

        // Broadcast to all members in the channel
        io.to(channelId).emit('school-channel:new-message', message);
        
        console.log(`📨 Message sent to channel ${channelId} by ${user.name}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('school-channel:error', { message: 'Failed to send message' });
      }
    });

    // Delete message
    socket.on('school-channel:delete-message', async (data) => {
      try {
        const { userId, messageId, channelId } = data;
        
        const message = await SchoolChannelMessage.findById(messageId);
        if (!message) {
          socket.emit('school-channel:error', { message: 'Message not found' });
          return;
        }

        // Only sender can delete their own message
        if (message.sender.toString() !== userId) {
          socket.emit('school-channel:error', { message: 'Cannot delete others messages' });
          return;
        }

        message.isDeleted = true;
        await message.save();

        // Broadcast deletion
        io.to(channelId).emit('school-channel:message-deleted', { messageId });
        
        console.log(`🗑️ Message ${messageId} deleted from channel ${channelId}`);
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('school-channel:error', { message: 'Failed to delete message' });
      }
    });

    // Add reaction
    socket.on('school-channel:react', async (data) => {
      try {
        const { userId, messageId, channelId, emoji } = data;
        
        console.log(`\n🔔 Reaction received: User ${userId} → ${emoji} on message ${messageId}`);
        
        // Fetch current message
        let message = await SchoolChannelMessage.findById(messageId);
        if (!message) {
          console.log('❌ Message not found');
          socket.emit('school-channel:error', { message: 'Message not found' });
          return;
        }

        console.log(`📊 BEFORE: ${message.reactions.length} reactions total`);
        
        // Convert to plain object for easier manipulation
        const userIdStr = String(userId);
        let reactions = message.reactions.map(r => ({
          emoji: r.emoji,
          userId: String(r.userId)
        }));
        
        console.log('   Current reactions:', reactions.map(r => `${r.emoji} by ${r.userId.substring(0, 8)}...`));

        // Check if user already has this exact emoji
        const hasThisEmoji = reactions.some(
          r => r.userId === userIdStr && r.emoji === emoji
        );

        if (hasThisEmoji) {
          // Toggle OFF - remove this specific reaction
          reactions = reactions.filter(
            r => !(r.userId === userIdStr && r.emoji === emoji)
          );
          console.log(`❌ Toggled OFF: Removed ${emoji}`);
        } else {
          // Remove ALL existing reactions from this user
          const beforeCount = reactions.length;
          reactions = reactions.filter(r => r.userId !== userIdStr);
          console.log(`🗑️ Removed ${beforeCount - reactions.length} old reactions from this user`);
          
          // Add new reaction
          reactions.push({ emoji, userId: userIdStr });
          console.log(`✅ Added new: ${emoji}`);
        }

        console.log(`📊 AFTER: ${reactions.length} reactions total`);
        console.log('   New reactions:', reactions.map(r => `${r.emoji} by ${r.userId.substring(0, 8)}...`));

        // Direct MongoDB update - bypasses Mongoose middleware issues
        const updated = await SchoolChannelMessage.findByIdAndUpdate(
          messageId,
          { $set: { reactions: reactions } },
          { new: true }
        ).populate('sender', 'name profileImage role');

        if (!updated) {
          console.log('❌ Failed to update message');
          socket.emit('school-channel:error', { message: 'Failed to update' });
          return;
        }

        console.log(`✅ Database updated successfully`);
        console.log(`📊 VERIFIED: ${updated.reactions.length} reactions in DB\n`);

        // Broadcast reaction update
        io.to(channelId).emit('school-channel:reaction-updated', updated);
        
        console.log(`📡 Broadcast complete to channel ${channelId}\n`);
      } catch (error) {
        console.error('❌ Error adding reaction:', error);
        socket.emit('school-channel:error', { message: 'Failed to add reaction' });
      }
    });

    // Pin/Unpin message (admin only)
    socket.on('school-channel:pin-message', async (data) => {
      try {
        const { userId, messageId, channelId, pinned } = data;
        
        const user = await User.findById(userId);
        if (user.role !== 'mentor') {
          socket.emit('school-channel:error', { message: 'Only admins can pin messages' });
          return;
        }

        const message = await SchoolChannelMessage.findByIdAndUpdate(
          messageId,
          { isPinned: pinned },
          { new: true }
        ).populate('sender', 'name profileImage role');

        if (!message) {
          socket.emit('school-channel:error', { message: 'Message not found' });
          return;
        }

        // Broadcast pin status update
        io.to(channelId).emit('school-channel:message-pinned', message);
        
        console.log(`📌 Message ${messageId} pin status: ${pinned}`);
      } catch (error) {
        console.error('Error pinning message:', error);
        socket.emit('school-channel:error', { message: 'Failed to pin message' });
      }
    });

    // User is typing
    socket.on('school-channel:typing', (data) => {
      const { channelId, userName } = data;
      socket.to(channelId).emit('school-channel:user-typing', { userName });
    });

    // User stopped typing
    socket.on('school-channel:stop-typing', (data) => {
      const { channelId, userName } = data;
      socket.to(channelId).emit('school-channel:user-stop-typing', { userName });
    });

    // Leave channel
    socket.on('school-channel:leave', (data) => {
      const { channelId } = data;
      socket.leave(channelId);
      console.log(`👋 User left channel: ${channelId}`);
    });

    socket.on('disconnect', () => {
      console.log('🏫 User disconnected from school channel:', socket.id);
    });
  });
};
