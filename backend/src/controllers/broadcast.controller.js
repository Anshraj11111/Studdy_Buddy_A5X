import BroadcastEnrollment from '../models/BroadcastEnrollment.js';
import BroadcastJoinRequest from '../models/BroadcastJoinRequest.js';
import BroadcastMessage from '../models/BroadcastMessage.js';
import BroadcastCode from '../models/BroadcastCode.js';

const VALID_CHANNELS = ['robotics', 'aiml', 'electronics', 'renewable_energy'];

// ── Leave current channel ─────────────────────────────────────────────────────
export const leaveChannel = async (req, res) => {
  try {
    const userId = req.user._id;
    const { channel } = req.body; // Optional - leave specific channel
    
    console.log('User', userId, 'attempting to leave channel:', channel || 'any');

    let query = { user: userId };
    if (channel) {
      // Leave specific channel
      query.channel = channel;
    }

    // Find and remove enrollment(s)
    const deletedEnrollments = await BroadcastEnrollment.deleteMany(query);
    
    if (deletedEnrollments.deletedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: channel ? `Not enrolled in ${channel} channel` : 'Not enrolled in any channel' 
      });
    }

    // Also cancel any pending requests for this user (if leaving specific channel)
    if (channel) {
      await BroadcastJoinRequest.updateMany(
        { user: userId, requestedChannel: channel, status: 'pending' },
        { status: 'cancelled' }
      );
    } else {
      // Cancel all pending requests if leaving all channels
      await BroadcastJoinRequest.updateMany(
        { user: userId, status: 'pending' },
        { status: 'cancelled' }
      );
    }

    console.log('User', userId, 'left', deletedEnrollments.deletedCount, 'channel(s)');

    return res.json({ 
      success: true, 
      message: channel 
        ? `Successfully left ${channel} channel`
        : `Successfully left ${deletedEnrollments.deletedCount} channel(s)`,
      deletedCount: deletedEnrollments.deletedCount
    });
  } catch (err) {
    console.error('Leave channel error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get my enrollment status ──────────────────────────────────────────────────
export const getMyStatus = async (req, res) => {
  try {
    const userId = req.user._id
    
    // Get ALL enrollments for this user (allow multiple channels)
    const enrollments = await BroadcastEnrollment.find({ user: userId });
    const pendingReq = await BroadcastJoinRequest.findOne({ user: userId, status: 'pending' });

    const responseData = {
      success: true,
      userId: userId, // Include user ID for frontend validation
      enrollments: enrollments.map(enrollment => ({
        channel: enrollment.channel, 
        school: enrollment.school, 
        class: enrollment.class, 
        joinedAt: enrollment.joinedAt,
        userId: enrollment.user // Include for verification
      })),
      // Keep backward compatibility
      enrollment: enrollments.length > 0 ? {
        channel: enrollments[0].channel, 
        school: enrollments[0].school, 
        class: enrollments[0].class, 
        joinedAt: enrollments[0].joinedAt,
        userId: enrollments[0].user
      } : null,
      pendingRequest: pendingReq
        ? { 
            channel: pendingReq.requestedChannel, 
            status: pendingReq.status,
            userId: pendingReq.user // Include for verification
          }
        : null,
    };
    
    return res.json(responseData);
  } catch (err) {
    console.error('getMyStatus error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Join a channel (first time — no existing enrollment) ──────────────────────
export const joinChannel = async (req, res) => {
  try {
    const { channel, school, class: cls, code } = req.body;
    
    if (!VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    }
    
    if (!school || !cls || !code) {
      return res.status(400).json({ success: false, message: 'School, class and code are required' });
    }

    // Verify code
    const validCode = await BroadcastCode.findOne({ channel, code: code.trim(), active: true });
    
    if (!validCode) {
      return res.status(400).json({ success: false, message: 'Invalid access code for this channel' });
    }

    // Check if already enrolled in THIS specific channel
    const existingInThisChannel = await BroadcastEnrollment.findOne({ 
      user: req.user._id, 
      channel: channel 
    });
    
    if (existingInThisChannel) {
      return res.status(400).json({ 
        success: false, 
        message: `Already enrolled in ${channel}`, 
        channel: channel 
      });
    }

    const enrollment = await BroadcastEnrollment.create({
      user: req.user._id, 
      channel: channel, // Use exact channel value
      school: school.trim(), 
      class: cls.trim(), 
      code: code.trim(),
    });

    // Verify the created enrollment has the correct channel
    if (enrollment.channel !== channel) {
      console.error('CRITICAL ERROR: Created enrollment has wrong channel! Requested:', channel, 'Created:', enrollment.channel);
      return res.status(500).json({ success: false, message: 'Database inconsistency detected' });
    }

    const responseEnrollment = {
      channel: enrollment.channel,
      school: enrollment.school,
      class: enrollment.class,
      joinedAt: enrollment.joinedAt,
      userId: enrollment.user
    };

    return res.json({ 
      success: true, 
      enrollment: responseEnrollment
    });
  } catch (err) {
    console.error('joinChannel error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Request to join an additional channel ─────────────────────────────────────
export const requestJoin = async (req, res) => {
  try {
    const { channel } = req.body; // Only need channel, other details from existing enrollment
    console.log('Request join attempt:', { userId: req.user._id, channel });
    
    if (!VALID_CHANNELS.includes(channel))
      return res.status(400).json({ success: false, message: 'Invalid channel' });

    // Check if already enrolled in this specific channel
    const alreadyInThisChannel = await BroadcastEnrollment.findOne({ 
      user: req.user._id, 
      channel: channel 
    });
    if (alreadyInThisChannel)
      return res.status(400).json({ success: false, message: 'Already enrolled in this channel' });

    // Get any existing enrollment to use its data
    const existingEnrollment = await BroadcastEnrollment.findOne({ user: req.user._id });
    if (!existingEnrollment)
      return res.status(400).json({ success: false, message: 'No existing enrollment found. Please join a channel first.' });

    // Check for existing pending request for this channel
    const existingPendingForChannel = await BroadcastJoinRequest.findOne({ 
      user: req.user._id, 
      requestedChannel: channel,
      status: 'pending' 
    });
    if (existingPendingForChannel)
      return res.status(400).json({ success: false, message: `Already have pending request for ${channel} channel` });

    // Cancel any other pending requests for this user (only allow one pending at a time)
    await BroadcastJoinRequest.updateMany(
      { user: req.user._id, status: 'pending' },
      { status: 'cancelled' }
    );

    // Use existing enrollment details for the request
    const request = await BroadcastJoinRequest.create({
      user: req.user._id,
      currentChannel: existingEnrollment.channel,
      requestedChannel: channel,
      school: existingEnrollment.school,        // Use existing school
      class: existingEnrollment.class,          // Use existing class  
      code: existingEnrollment.code,            // Use existing code
    });

    console.log('Join request created:', request._id);

    // Notify admin via socket
    try {
      const io = req.app.get('io');
      if (io) io.emit('broadcastJoinRequest', { requestId: request._id, userId: req.user._id, requestedChannel: channel });
    } catch (_) {}

    return res.json({ success: true, request });
  } catch (err) {
    console.error('Request join error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get messages for enrolled channel ─────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const enrollment = await BroadcastEnrollment.findOne({ user: req.user._id });
    if (!enrollment)
      return res.status(403).json({ success: false, message: 'Not enrolled in any channel' });

    const messages = await BroadcastMessage.find({ channel: enrollment.channel, deleted: false })
      .populate('sender', 'name profileImage role')
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    return res.json({ success: true, messages: messages.reverse(), channel: enrollment.channel });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete a message (mentor/admin) ───────────────────────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const msg = await BroadcastMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Not found' });
    const isOwner = String(msg.sender) === String(req.user._id) ||
                    (msg.sender?._id && String(msg.sender._id) === String(req.user._id));
    if (req.user.role !== 'mentor' && !isOwner)
      return res.status(403).json({ success: false, message: 'Not allowed' });
    msg.deleted = true;
    await msg.save();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════ ADMIN ENDPOINTS ══════════════════════════════════════════

// ── Add / manage access codes ──────────────────────────────────────────────────
export const addCode = async (req, res) => {
  try {
    const { channel, code } = req.body;
    if (!VALID_CHANNELS.includes(channel))
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    if (!code?.trim())
      return res.status(400).json({ success: false, message: 'Code is required' });
    const doc = await BroadcastCode.findOneAndUpdate(
      { channel, code: code.trim() },
      { channel, code: code.trim(), active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getCodes = async (req, res) => {
  try {
    const codes = await BroadcastCode.find().sort({ channel: 1, createdAt: -1 });
    return res.json({ success: true, codes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCode = async (req, res) => {
  try {
    const { channel, code } = req.body;
    if (!VALID_CHANNELS.includes(channel))
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    if (!code?.trim())
      return res.status(400).json({ success: false, message: 'Code is required' });

    // Update or create code for this channel (only one code per channel)
    const doc = await BroadcastCode.findOneAndUpdate(
      { channel },
      { channel, code: code.trim(), active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    return res.json({ success: true, doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCode = async (req, res) => {
  try {
    await BroadcastCode.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get pending join requests ──────────────────────────────────────────────────
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await BroadcastJoinRequest.find({ status: 'pending' })
      .populate('user', 'name email profileImage')
      .sort({ createdAt: -1 });
    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Accept join request ────────────────────────────────────────────────────────
export const acceptRequest = async (req, res) => {
  try {
    const request = await BroadcastJoinRequest.findById(req.params.id).populate('user', 'name _id');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Request already resolved' });

    // Check if user is already enrolled in the requested channel
    const existingInChannel = await BroadcastEnrollment.findOne({
      user: request.user._id,
      channel: request.requestedChannel
    });

    if (existingInChannel) {
      console.log('User already enrolled in channel:', request.requestedChannel);
      // Just mark request as accepted since user is already enrolled
      request.status = 'accepted';
      await request.save();
      return res.json({ 
        success: true, 
        message: 'User already enrolled in this channel',
        enrollment: existingInChannel 
      });
    }

    // Create NEW enrollment (don't replace existing ones)
    let newEnrollment;
    try {
      newEnrollment = await BroadcastEnrollment.create({
        user: request.user._id,
        channel: request.requestedChannel,
        school: request.school,
        class: request.class,
        code: request.code,
        joinedAt: new Date(),
      });
      
      console.log('New enrollment created:', newEnrollment._id, 'for channel:', request.requestedChannel);
    } catch (enrollmentError) {
      // Handle duplicate key error specifically
      if (enrollmentError.code === 11000) {
        console.log('Duplicate enrollment detected, checking existing...');
        
        // Find the existing enrollment
        const existingEnrollment = await BroadcastEnrollment.findOne({
          user: request.user._id,
          channel: request.requestedChannel
        });
        
        if (existingEnrollment) {
          console.log('Using existing enrollment:', existingEnrollment._id);
          newEnrollment = existingEnrollment;
        } else {
          throw new Error('Duplicate key error but no existing enrollment found');
        }
      } else {
        throw enrollmentError; // Re-throw if it's not a duplicate key error
      }
    }

    request.status = 'accepted';
    await request.save();

    // Send comprehensive notification to student
    try {
      console.log('📢 [Broadcast] Sending approval notification to student:', request.user._id);
      
      const Notification = (await import('../models/Notification.js')).default;
      const { sendPushToUser } = await import('../services/webPush.service.js');
      const io = req.app.get('io');

      // Get channel display name
      const channelNames = {
        robotics: 'Robotics',
        aiml: 'AI/ML',
        electronics: 'Electronics',
        renewable_energy: 'Renewable Energy'
      };
      const channelDisplayName = channelNames[request.requestedChannel] || request.requestedChannel;

      // Create in-app notification
      const notification = await Notification.create({
        recipient: request.user._id,
        sender: null, // System notification
        type: 'broadcast_approved',
        message: `Your request to join ${channelDisplayName} channel has been approved! 🎉`,
        metadata: {
          channel: request.requestedChannel,
          school: request.school,
          class: request.class,
        },
        read: false,
      });
      console.log(`📢 [Broadcast] ✅ Created in-app notification`);

      // Emit Socket.IO notification (real-time)
      if (io) {
        io.to(`user:${request.user._id}`).emit('notification', {
          type: 'broadcast_approved',
          message: `Your request to join ${channelDisplayName} channel has been approved!`,
          metadata: {
            channel: request.requestedChannel,
          },
        });
        
        // Also emit the old event for backward compatibility
        io.to(`user:${request.user._id}`).emit('broadcastRequestResolved', {
          status: 'accepted', 
          channel: request.requestedChannel,
          enrollment: {
            channel: newEnrollment.channel,
            school: newEnrollment.school,
            class: newEnrollment.class,
            joinedAt: newEnrollment.joinedAt
          }
        });
      }
      console.log(`📢 [Broadcast] ✅ Emitted socket notification`);

      // Send Web Push notification
      await sendPushToUser(request.user._id.toString(), {
        title: '🎉 Channel Request Approved',
        body: `You can now access ${channelDisplayName} channel!`,
        icon: '/icons/icon-192x192.png',
        url: '/broadcast',
        type: 'broadcast_approved',
      });
      console.log(`📢 [Broadcast] ✅ Web push sent`);

      console.log(`✅ Sent broadcast approval notification to student ${request.user.name}`);
    } catch (notifError) {
      console.error('❌ [Broadcast] Notification error:', notifError);
      // Don't fail the approval if notification fails
    }

    return res.json({ success: true, enrollment: newEnrollment });
  } catch (err) {
    console.error('Accept request error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Reject join request ────────────────────────────────────────────────────────
export const rejectRequest = async (req, res) => {
  try {
    const request = await BroadcastJoinRequest.findById(req.params.id).populate('user', '_id');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = 'rejected';
    await request.save();

    // Send comprehensive notification to student
    try {
      console.log('📢 [Broadcast] Sending rejection notification to student:', request.user._id);
      
      const Notification = (await import('../models/Notification.js')).default;
      const { sendPushToUser } = await import('../services/webPush.service.js');
      const io = req.app.get('io');

      // Get channel display name
      const channelNames = {
        robotics: 'Robotics',
        aiml: 'AI/ML',
        electronics: 'Electronics',
        renewable_energy: 'Renewable Energy'
      };
      const channelDisplayName = channelNames[request.requestedChannel] || request.requestedChannel;

      // Create in-app notification
      const notification = await Notification.create({
        recipient: request.user._id,
        sender: null, // System notification
        type: 'broadcast_rejected',
        message: `Your request to join ${channelDisplayName} channel was not approved`,
        metadata: {
          channel: request.requestedChannel,
        },
        read: false,
      });
      console.log(`📢 [Broadcast] ✅ Created in-app notification`);

      // Emit Socket.IO notification (real-time)
      if (io) {
        io.to(`user:${request.user._id}`).emit('notification', {
          type: 'broadcast_rejected',
          message: `Your request to join ${channelDisplayName} channel was not approved`,
          metadata: {
            channel: request.requestedChannel,
          },
        });
        
        // Also emit the old event for backward compatibility
        io.to(`user:${request.user._id}`).emit('broadcastRequestResolved', {
          status: 'rejected', 
          channel: request.requestedChannel,
        });
      }
      console.log(`📢 [Broadcast] ✅ Emitted socket notification`);

      // Send Web Push notification
      await sendPushToUser(request.user._id.toString(), {
        title: 'Channel Request Update',
        body: `Your request for ${channelDisplayName} channel was not approved`,
        icon: '/icons/icon-192x192.png',
        url: '/broadcast',
        type: 'broadcast_rejected',
      });
      console.log(`📢 [Broadcast] ✅ Web push sent`);

      console.log(`✅ Sent broadcast rejection notification to student`);
    } catch (notifError) {
      console.error('❌ [Broadcast] Notification error:', notifError);
      // Don't fail the rejection if notification fails
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get enrolled members per channel (mentor view) ────────────────────────────
export const getChannelMembers = async (req, res) => {
  try {
    const { channel } = req.params;
    if (!VALID_CHANNELS.includes(channel))
      return res.status(400).json({ success: false, message: 'Invalid channel' });
    const members = await BroadcastEnrollment.find({ channel })
      .populate('user', 'name email profileImage role')
      .sort({ joinedAt: -1 });
    return res.json({ success: true, members });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get all enrollments (admin view) ──────────────────────────────────────────
export const getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await BroadcastEnrollment.find()
      .populate('user', 'name email profileImage')
      .sort({ createdAt: -1 });

    // Group by channel
    const channelStats = {};
    VALID_CHANNELS.forEach(channel => {
      channelStats[channel] = {
        count: 0,
        members: []
      };
    });

    enrollments.forEach(enrollment => {
      if (channelStats[enrollment.channel]) {
        channelStats[enrollment.channel].count++;
        channelStats[enrollment.channel].members.push({
          id: enrollment._id,
          user: enrollment.user,
          school: enrollment.school,
          class: enrollment.class,
          joinedAt: enrollment.joinedAt
        });
      }
    });

    return res.json({ 
      success: true, 
      channelStats,
      totalEnrollments: enrollments.length
    });
  } catch (err) {
    console.error('getAllEnrollments error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// YouTube Live Stream Management (for 10K+ viewers)
// ══════════════════════════════════════════════════════════════════════════════

import BroadcastStream from '../models/BroadcastStream.js';

/**
 * Get current stream status for a channel
 * GET /api/broadcast/stream/:channel
 */
export const getStreamStatus = async (req, res) => {
  try {
    const { channel } = req.params;

    let stream = await BroadcastStream.findOne({ channel });

    // Create default if doesn't exist
    if (!stream) {
      stream = await BroadcastStream.create({ channel });
    }

    res.json({
      success: true,
      data: {
        channel: stream.channel,
        youtubeVideoId: stream.youtubeVideoId,
        streamTitle: stream.streamTitle,
        isLive: stream.isLive,
        viewerCount: stream.viewerCount,
        startedAt: stream.startedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get stream status' },
    });
  }
};

/**
 * Update YouTube video ID for a channel (Admin only)
 * PUT /api/broadcast/admin/stream/:channel
 * Body: { youtubeVideoId, streamTitle }
 */
export const updateStreamUrl = async (req, res) => {
  try {
    const { channel } = req.params;
    const { youtubeVideoId, streamTitle } = req.body;

    if (!youtubeVideoId) {
      return res.status(400).json({
        success: false,
        error: { message: 'YouTube video ID is required' },
      });
    }

    let stream = await BroadcastStream.findOne({ channel });

    if (!stream) {
      stream = await BroadcastStream.create({
        channel,
        youtubeVideoId,
        streamTitle: streamTitle || '',
      });
    } else {
      stream.youtubeVideoId = youtubeVideoId;
      stream.streamTitle = streamTitle || stream.streamTitle;
      await stream.save();
    }

    res.json({
      success: true,
      data: {
        channel: stream.channel,
        youtubeVideoId: stream.youtubeVideoId,
        streamTitle: stream.streamTitle,
        message: 'Stream URL updated successfully',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update stream URL' },
    });
  }
};

/**
 * Start stream (mark as live)
 * POST /api/broadcast/admin/stream/:channel/start
 */
export const startStream = async (req, res) => {
  try {
    const { channel } = req.params;

    let stream = await BroadcastStream.findOne({ channel });

    if (!stream) {
      return res.status(404).json({
        success: false,
        error: { message: 'Stream not configured. Please add YouTube video ID first.' },
      });
    }

    if (!stream.youtubeVideoId) {
      return res.status(400).json({
        success: false,
        error: { message: 'No YouTube video ID set for this channel' },
      });
    }

    stream.isLive = true;
    stream.startedAt = new Date();
    stream.endedAt = null;
    stream.viewerCount = 0;
    await stream.save();

    // CRITICAL: Notify ALL channel members that stream started
    try {
      console.log('📢 [Stream] 🔴 LIVE STREAM STARTED - Notifying all members of', channel);
      
      const Notification = (await import('../models/Notification.js')).default;
      const { sendPushToUser } = await import('../services/webPush.service.js');
      const BroadcastEnrollment = (await import('../models/BroadcastEnrollment.js')).default;
      const io = req.app.get('io');

      // Get channel display name
      const channelNames = {
        robotics: 'Robotics',
        aiml: 'AI/ML',
        electronics: 'Electronics',
        renewable_energy: 'Renewable Energy'
      };
      const channelDisplayName = channelNames[channel] || channel;

      // Find all enrolled members in this channel
      const enrollments = await BroadcastEnrollment.find({ channel }).select('user').lean();
      const memberIds = enrollments.map(e => e.user.toString());
      
      console.log(`📢 [Stream] Found ${memberIds.length} enrolled members in ${channel}`);

      if (memberIds.length > 0) {
        // Create notifications for all members
        const notifications = memberIds.map(memberId => ({
          recipient: memberId,
          sender: null, // System notification
          type: 'stream_started',
          message: `🔴 LIVE: ${channelDisplayName} class is streaming now!`,
          metadata: {
            channel: channel,
            streamTitle: stream.streamTitle || `${channelDisplayName} Live Class`,
            youtubeVideoId: stream.youtubeVideoId,
          },
          read: false,
        }));

        const savedNotifs = await Notification.insertMany(notifications);
        console.log(`📢 [Stream] ✅ Created ${savedNotifs.length} in-app notifications`);

        // Emit Socket.IO to all members (real-time)
        if (io) {
          memberIds.forEach(memberId => {
            io.to(`user:${memberId}`).emit('notification', {
              type: 'stream_started',
              message: `🔴 LIVE: ${channelDisplayName} class is streaming now!`,
              metadata: {
                channel: channel,
                youtubeVideoId: stream.youtubeVideoId,
              },
            });
          });
          console.log(`📢 [Stream] ✅ Emitted ${memberIds.length} socket notifications`);
        }

        // Send Web Push to all members (phone notifications!)
        console.log(`📢 [Stream] Sending web push to ${memberIds.length} members...`);
        const pushPromises = memberIds.map(memberId =>
          sendPushToUser(memberId, {
            title: `🔴 ${channelDisplayName} is LIVE!`,
            body: stream.streamTitle || `Join the ${channelDisplayName} live class now!`,
            icon: '/icons/icon-192x192.png',
            url: `/broadcast?channel=${channel}`,
            type: 'stream_started',
          })
        );
        const pushResults = await Promise.allSettled(pushPromises);
        const pushSuccess = pushResults.filter(r => r.status === 'fulfilled').length;
        console.log(`📢 [Stream] ✅ Web push: ${pushSuccess} success, ${pushResults.length - pushSuccess} failed`);

        console.log(`✅ Sent live stream notifications to ${memberIds.length} members of ${channel} channel`);
      } else {
        console.log('📢 [Stream] ⚠️ No members enrolled in this channel');
      }
    } catch (notifError) {
      console.error('❌ [Stream] Notification error:', notifError);
      console.error('📢 [Stream] Stack:', notifError.stack);
      // Don't fail stream start if notification fails
    }

    res.json({
      success: true,
      data: {
        channel: stream.channel,
        isLive: true,
        startedAt: stream.startedAt,
        message: 'Stream started successfully',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to start stream' },
    });
  }
};

/**
 * Stop stream (mark as ended)
 * POST /api/broadcast/admin/stream/:channel/stop
 */
export const stopStream = async (req, res) => {
  try {
    const { channel } = req.params;

    let stream = await BroadcastStream.findOne({ channel });

    if (!stream) {
      return res.status(404).json({
        success: false,
        error: { message: 'Stream not found' },
      });
    }

    stream.isLive = false;
    stream.endedAt = new Date();
    if (stream.viewerCount > stream.peakViewers) {
      stream.peakViewers = stream.viewerCount;
    }
    await stream.save();

    res.json({
      success: true,
      data: {
        channel: stream.channel,
        isLive: false,
        endedAt: stream.endedAt,
        peakViewers: stream.peakViewers,
        message: 'Stream stopped successfully',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to stop stream' },
    });
  }
};
