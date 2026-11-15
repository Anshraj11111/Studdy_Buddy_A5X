export const setupVideoSocket = (io) => {
  io.on('connection', (socket) => {

    // ── Helper: route directly to the recipient's personal room ──────────────
    // user:{userId} rooms are joined synchronously at connect time, so they are
    // always available — no async DB call, no join-race condition.
    const toUser = (userId, event, payload) => {
      io.to(`user:${userId}`).emit(event, payload);
    };

    // ── initiateCall ─────────────────────────────────────────────────────────
    socket.on('initiateCall', async (data) => {
      try {
        const { roomId, fromUserId, toUserId, callType } = data;
        console.log('📞 Initiating call:', { roomId, fromUserId, toUserId, callType });

        const { default: User } = await import('../models/User.js');
        const caller = await User.findById(fromUserId).select('name email profileImage');

        toUser(toUserId, 'incomingCall', {
          roomId,
          fromUserId,
          toUserId,
          callType: callType || 'video',
          caller: {
            _id:          caller._id,
            name:         caller.name,
            email:        caller.email,
            profileImage: caller.profileImage,
          },
        });

        console.log(`📞 incomingCall emitted → user:${toUserId}`);
      } catch (err) {
        console.error('initiateCall error:', err);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    // ── offer ────────────────────────────────────────────────────────────────
    socket.on('offer', (data) => {
      try {
        const { offer, fromUserId, toUserId } = data;
        console.log(`📡 offer: ${fromUserId} → ${toUserId}`);
        toUser(toUserId, 'offer', { offer, fromUserId, toUserId });
      } catch (err) {
        console.error('offer error:', err);
        socket.emit('error', { message: 'Failed to relay offer' });
      }
    });

    // ── answer ───────────────────────────────────────────────────────────────
    socket.on('answer', (data) => {
      try {
        const { answer, fromUserId, toUserId } = data;
        console.log(`📡 answer: ${fromUserId} → ${toUserId}`);
        toUser(toUserId, 'answer', { answer, fromUserId, toUserId });
      } catch (err) {
        console.error('answer error:', err);
        socket.emit('error', { message: 'Failed to relay answer' });
      }
    });

    // ── iceCandidate ─────────────────────────────────────────────────────────
    socket.on('iceCandidate', (data) => {
      try {
        const { candidate, fromUserId, toUserId } = data;
        console.log(`🧊 ICE: ${fromUserId?.slice(-4)} → ${toUserId?.slice(-4)} | ${candidate?.candidate?.substring(0, 50) || 'null'}`);
        toUser(toUserId, 'iceCandidate', { candidate, fromUserId, toUserId });
      } catch (err) {
        console.error('iceCandidate error:', err);
        socket.emit('error', { message: 'Failed to relay ICE candidate' });
      }
    });

    // ── callRejected ─────────────────────────────────────────────────────────
    socket.on('callRejected', (data) => {
      try {
        const { fromUserId, toUserId } = data;
        toUser(toUserId, 'callRejected', { fromUserId, toUserId });
      } catch (err) {
        console.error('callRejected error:', err);
      }
    });

    // ── callAccepted ─────────────────────────────────────────────────────────
    socket.on('callAccepted', (data) => {
      try {
        const { fromUserId, toUserId } = data;
        toUser(toUserId, 'callAccepted', { fromUserId, toUserId });
      } catch (err) {
        console.error('callAccepted error:', err);
      }
    });

    // ── callEnded ────────────────────────────────────────────────────────────
    socket.on('callEnded', (data) => {
      try {
        const { fromUserId, toUserId } = data;
        if (toUserId) {
          toUser(toUserId, 'callEnded', { fromUserId, toUserId });
        }
      } catch (err) {
        console.error('callEnded error:', err);
      }
    });

    // ── screenShareStarted ───────────────────────────────────────────────────
    socket.on('screenShareStarted', (data) => {
      try {
        const { fromUserId, toUserId } = data;
        if (toUserId) toUser(toUserId, 'screenShareStarted', { fromUserId, toUserId });
      } catch (err) {
        console.error('screenShareStarted error:', err);
      }
    });

    // ── screenShareStopped ───────────────────────────────────────────────────
    socket.on('screenShareStopped', (data) => {
      try {
        const { fromUserId, toUserId } = data;
        if (toUserId) toUser(toUserId, 'screenShareStopped', { fromUserId, toUserId });
      } catch (err) {
        console.error('screenShareStopped error:', err);
      }
    });

    // ── calleeReady ──────────────────────────────────────────────────────────
    socket.on('calleeReady', (data) => {
      try {
        const { roomId, fromUserId, toUserId } = data;
        console.log(`📞 calleeReady: ${fromUserId} → ${toUserId}`);
        toUser(toUserId, 'calleeReady', { fromUserId, toUserId });
      } catch (err) {
        console.error('calleeReady error:', err);
      }
    });

  });
};

export default setupVideoSocket;
