import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { roomAPI } from '../services/api'
import { getSocket, joinRoom } from '../services/socket'
import { showCallNotification, playNotificationSound, requestNotificationPermission } from '../utils/notifications'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ArrowLeft, Monitor, MonitorOff, Maximize, Minimize } from 'lucide-react'
import CallEndFeedbackModal from '../components/CallEndFeedbackModal'

export default function VideoCall() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const autoStart = searchParams.get('autoStart') === 'true'
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [room, setRoom] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)   // keep remote stream in ref too
  const [callActive, setCallActive] = useState(false)
  const [incomingCall, setIncomingCall] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false)
  const hasAutoStarted = useRef(false)
  const originalStreamRef = useRef(null)
  const pendingCandidates = useRef([])
  const pendingOffer = useRef(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  }

  // ── Reliable remote video setter ────────────────────────────────────────────
  const setRemoteStream = useCallback((stream) => {
    remoteStreamRef.current = stream
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream
      remoteVideoRef.current.play().catch(() => {})
    }
    setCallActive(true)
  }, [])

  // Attach stream if ref gets assigned after stream already exists (React timing)
  const remoteVideoCallbackRef = useCallback((node) => {
    remoteVideoRef.current = node
    if (node && remoteStreamRef.current) {
      node.srcObject = remoteStreamRef.current
      node.play().catch(() => {})
    }
  }, [])

  // ── Create peer connection helper ────────────────────────────────────────────
  const createPeerConnection = useCallback((socket, toUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)

    pc.ontrack = (event) => {
      console.log('📹 ontrack fired:', event.track.kind, 'streams:', event.streams.length)
      const stream = event.streams[0]
      if (stream) {
        console.log('✅ Setting remote stream')
        setRemoteStream(stream)
      } else {
        // No stream in event — build one manually
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream()
        }
        remoteStreamRef.current.addTrack(event.track)
        setRemoteStream(remoteStreamRef.current)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', {
          roomId,
          candidate: event.candidate,
          fromUserId: user._id,
          toUserId,
        })
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state:', pc.connectionState)
    }

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', pc.iceConnectionState)
    }

    return pc
  }, [roomId, user, setRemoteStream])

  // ── Fetch room data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true)
        const res = await roomAPI.getById(roomId)
        const roomData = res.data.data?.room
        setRoom(roomData)
        const uid = user._id
        const s1 = roomData.student1?._id || roomData.student1
        setOtherUser(String(uid) === String(s1) ? roomData.student2 : roomData.student1)
        requestNotificationPermission()
      } catch (error) {
        console.error('Failed to fetch room data:', error)
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchRoomData()
  }, [roomId, user])

  // ── Auto-start if coming from accept ────────────────────────────────────────
  useEffect(() => {
    if (autoStart && otherUser && !hasAutoStarted.current && !loading) {
      hasAutoStarted.current = true
      setTimeout(() => startCall(), 500)
    }
  }, [autoStart, otherUser, loading])

  // ── Early offer capture ──────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const captureOffer = (data) => {
      if (!otherUser) {
        console.log('📦 Storing early offer')
        pendingOffer.current = data
      }
    }
    socket.on('offer', captureOffer)
    return () => socket.off('offer', captureOffer)
  }, [])

  // ── Process pending offer once otherUser loads ───────────────────────────────
  useEffect(() => {
    if (otherUser && pendingOffer.current && !peerConnectionRef.current) {
      const data = pendingOffer.current
      pendingOffer.current = null
      handleOffer(data)
    }
  }, [otherUser])

  // ── Core offer handler (used by both socket event and pending offer) ─────────
  const handleOffer = useCallback(async (data) => {
    const socket = getSocket()
    if (!socket) return
    if (peerConnectionRef.current) {
      console.log('📨 Peer connection already exists, skipping duplicate offer')
      return
    }
    try {
      console.log('📨 Handling offer from:', data.fromUserId)

      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
      }

      const toUserId = data.fromUserId
      const pc = createPeerConnection(socket, toUserId)
      peerConnectionRef.current = pc

      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current)
      })

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer))

      // Flush pending ICE candidates
      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      }
      pendingCandidates.current = []

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socket.emit('answer', {
        roomId,
        answer,
        fromUserId: user._id,
        toUserId,
      })
      console.log('📤 Answer sent')
      setIncomingCall(false)
    } catch (err) {
      console.error('❌ Error handling offer:', err)
    }
  }, [roomId, user, createPeerConnection])

  // ── Socket event listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    joinRoom(roomId, user._id)

    const onIncomingCall = (data) => {
      if (!peerConnectionRef.current) {
        setIncomingCall(true)
        showCallNotification(otherUser?.name || 'Someone')
        playNotificationSound()
      }
    }

    const onOffer = (data) => handleOffer(data)

    const onAnswer = async (data) => {
      try {
        console.log('📨 Received answer')
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
          for (const c of pendingCandidates.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
          }
          pendingCandidates.current = []
        }
      } catch (err) {
        console.error('❌ Error handling answer:', err)
      }
    }

    const onIceCandidate = async (data) => {
      try {
        if (peerConnectionRef.current?.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
        } else {
          pendingCandidates.current.push(data.candidate)
        }
      } catch (err) {
        console.error('❌ ICE error:', err)
      }
    }

    const onCallEnded = () => cleanup()

    const onScreenShareStarted = () => setRemoteScreenSharing(true)
    const onScreenShareStopped = () => setRemoteScreenSharing(false)

    socket.on('incomingCall', onIncomingCall)
    socket.on('offer', onOffer)
    socket.on('answer', onAnswer)
    socket.on('iceCandidate', onIceCandidate)
    socket.on('callEnded', onCallEnded)
    socket.on('screenShareStarted', onScreenShareStarted)
    socket.on('screenShareStopped', onScreenShareStopped)

    return () => {
      socket.off('incomingCall', onIncomingCall)
      socket.off('offer', onOffer)
      socket.off('answer', onAnswer)
      socket.off('iceCandidate', onIceCandidate)
      socket.off('callEnded', onCallEnded)
      socket.off('screenShareStarted', onScreenShareStarted)
      socket.off('screenShareStopped', onScreenShareStopped)
    }
  }, [roomId, user, otherUser, handleOffer])

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  const cleanup = () => {
    if (originalStreamRef.current) {
      originalStreamRef.current.getTracks().forEach(t => t.stop())
      originalStreamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    remoteStreamRef.current = null
    setCallActive(false)
    setScreenSharing(false)
    setRemoteScreenSharing(false)
    pendingCandidates.current = []
  }

  // ── Start call (caller side) ─────────────────────────────────────────────────
  const startCall = async () => {
    try {
      console.log('🎥 Starting call...')
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const socket = getSocket()
      const pc = createPeerConnection(socket, otherUser._id)
      peerConnectionRef.current = pc

      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send incomingCall notification FIRST, then wait, then send offer
      socket.emit('initiateCall', { roomId, fromUserId: user._id, toUserId: otherUser._id })
      await new Promise(r => setTimeout(r, 1200))
      socket.emit('offer', { roomId, offer, fromUserId: user._id, toUserId: otherUser._id })
      console.log('📤 Offer sent')
    } catch (err) {
      console.error('❌ Error starting call:', err)
      alert('Failed to access camera/microphone. Please check permissions.')
    }
  }

  const acceptIncomingCall = () => startCall()

  const rejectIncomingCall = () => {
    setIncomingCall(false)
    const socket = getSocket()
    socket?.emit('callRejected', { roomId, fromUserId: user._id, toUserId: otherUser?._id })
  }

  const endCurrentCall = () => {
    const socket = getSocket()
    socket?.emit('callEnded', { roomId, fromUserId: user._id, toUserId: otherUser?._id })
    cleanup()
    setShowFeedbackModal(true)
  }

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
      setMicEnabled(p => !p)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
      setVideoEnabled(p => !p)
    }
  }

  const startScreenShare = async () => {
    if (screenSharing) return
    try {
      const confirmed = window.confirm(
        'Tip: Select a Window or Chrome Tab to avoid mirror effect.\n\nContinue?'
      )
      if (!confirmed) return

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false })
      if (!originalStreamRef.current) originalStreamRef.current = localStreamRef.current

      const screenTrack = screenStream.getVideoTracks()[0]
      const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)

      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
      localStreamRef.current = screenStream
      setScreenSharing(true)

      screenTrack.onended = () => stopScreenShare()

      const socket = getSocket()
      socket?.emit('screenShareStarted', { roomId, fromUserId: user._id, toUserId: otherUser?._id })
    } catch (err) {
      if (err.name !== 'NotAllowedError') alert('Failed to start screen sharing.')
    }
  }

  const stopScreenShare = async () => {
    try {
      if (localVideoRef.current?.srcObject && screenSharing) {
        localVideoRef.current.srcObject.getTracks().forEach(t => t.stop())
      }
      if (originalStreamRef.current) {
        const videoTrack = originalStreamRef.current.getVideoTracks()[0]
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video')
        if (sender && videoTrack) await sender.replaceTrack(videoTrack)
        if (localVideoRef.current) localVideoRef.current.srcObject = originalStreamRef.current
        localStreamRef.current = originalStreamRef.current
        originalStreamRef.current = null
      }
      setScreenSharing(false)
      const socket = getSocket()
      socket?.emit('screenShareStopped', { roomId, fromUserId: user._id, toUserId: otherUser?._id })
    } catch (err) {
      console.error('❌ stopScreenShare error:', err)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* Feedback Modal */}
      <CallEndFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => { setShowFeedbackModal(false); navigate(`/chat/${roomId}`) }}
        roomId={roomId}
        otherUser={otherUser}
      />

      {/* ── Top header ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(`/chat/${roomId}`)}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* otherUser avatar */}
            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
              {otherUser?.profileImage
                ? <img src={otherUser.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{otherUser?.name?.charAt(0).toUpperCase() || 'U'}</span>}
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>{otherUser?.name || 'Unknown'}</p>
              <p style={{ color: callActive ? '#34d399' : 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>
                {callActive ? '● Connected' : '● Waiting...'}
              </p>
            </div>
          </div>
        </div>
        {/* Fullscreen button */}
        <button onClick={toggleFullscreen}
          style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>

      {/* ── Main video area ── */}
      <div style={{ flex: 1, position: 'relative', background: '#111' }}>

        {/* Remote video — full area */}
        <video
          ref={remoteVideoCallbackRef}
          autoPlay
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Placeholder when remote not connected */}
        {!callActive && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,20,0.95)', gap: 16 }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(99,102,241,0.5)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
              {otherUser?.profileImage
                ? <img src={otherUser.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 700, fontSize: 36 }}>{otherUser?.name?.charAt(0).toUpperCase() || 'U'}</span>}
            </div>
            <p style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 0 }}>{otherUser?.name || 'Unknown'}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
              {autoStart ? 'Connecting...' : 'Press Start Call'}
            </p>
          </div>
        )}

        {/* Screen share indicator */}
        {remoteScreenSharing && callActive && (
          <div style={{ position: 'absolute', top: 64, left: 16, background: '#3b82f6', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, zIndex: 10 }}>
            <Monitor size={14} />
            {otherUser?.name} is sharing screen
          </div>
        )}

        {/* ── Local video — bottom right corner ── */}
        <div style={{ position: 'absolute', bottom: 100, right: 16, width: 160, height: 120, borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 20, background: '#222' }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          {!videoEnabled && (
            <div style={{ position: 'absolute', inset: 0, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VideoOff size={28} color="rgba(255,255,255,0.4)" />
            </div>
          )}
          {screenSharing && (
            <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, background: '#3b82f6', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: 'white', textAlign: 'center' }}>
              Sharing Screen
            </div>
          )}
        </div>

        {/* Incoming call overlay */}
        {incomingCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32, color: 'white', fontWeight: 700 }}>
                {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <p style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{otherUser?.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>Incoming call...</p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button onClick={acceptIncomingCall}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: '#22c55e', border: 'none', borderRadius: 50, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                  <Phone size={20} /> Accept
                </button>
                <button onClick={rejectIncomingCall}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: '#ef4444', border: 'none', borderRadius: 50, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                  <PhoneOff size={20} /> Reject
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, padding: '16px 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>

        {!callActive && !autoStart ? (
          /* Start Call button */
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={startCall}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 50, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
            <Phone size={22} />
            Start Call
          </motion.button>
        ) : (
          /* In-call controls */
          <>
            {/* Mic */}
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={toggleMic}
              title={micEnabled ? 'Mute' : 'Unmute'}
              style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: micEnabled ? 'rgba(255,255,255,0.15)' : '#ef4444', color: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </motion.button>

            {/* Camera */}
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={toggleVideo}
              title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: videoEnabled ? 'rgba(255,255,255,0.15)' : '#ef4444', color: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </motion.button>

            {/* Screen share */}
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={screenSharing ? stopScreenShare : startScreenShare}
              title={screenSharing ? 'Stop sharing' : 'Share screen'}
              style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: screenSharing ? '#3b82f6' : 'rgba(255,255,255,0.15)', color: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              {screenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
            </motion.button>

            {/* End Call */}
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={endCurrentCall}
              title="End Call"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 28px', height: 56, borderRadius: 50, border: 'none', cursor: 'pointer', background: '#ef4444', color: 'white', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 16px rgba(239,68,68,0.45)' }}>
              <PhoneOff size={20} />
              End Call
            </motion.button>
          </>
        )}
      </div>
    </div>
  )
}
