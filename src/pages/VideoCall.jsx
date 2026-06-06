import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { roomAPI } from '../services/api'
import { getSocket } from '../services/socket'
import { showCallNotification, playNotificationSound, requestNotificationPermission } from '../utils/notifications'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ArrowLeft, Monitor, MonitorOff, Maximize, Minimize } from 'lucide-react'
import CallEndFeedbackModal from '../components/CallEndFeedbackModal'

const DEFAULT_ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:80?transport=tcp',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: [
        'turn:global.turn.twilio.com:3478?transport=udp',
        'turn:global.turn.twilio.com:3478?transport=tcp',
        'turn:global.turn.twilio.com:443?transport=tcp',
      ],
      username: 'f4b4035eaa76f4a55de5f4351567129a4a2b6d3d790a7d1ef7994718bf9867d7',
      credential: 'w1uxM55V9yVoqyVFjt+mxDBV0F87W7NdwinR5Ke2eXg=',
    },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
}

export default function VideoCall() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const autoStart = searchParams.get('autoStart') === 'true'  // true = callee
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [otherUser, setOtherUser]           = useState(null)
  const [loading, setLoading]               = useState(true)
  const [callActive, setCallActive]         = useState(false)
  const [callStarted, setCallStarted]       = useState(false) // caller pressed Start Call
  const [answerSent, setAnswerSent]         = useState(false) // callee sent answer, waiting for remote video
  const [incomingCall, setIncomingCall]     = useState(false)
  const [micEnabled, setMicEnabled]         = useState(true)
  const [videoEnabled, setVideoEnabled]     = useState(true)
  const [screenSharing, setScreenSharing]   = useState(false)
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal]     = useState(false)
  const [isFullscreen, setIsFullscreen]     = useState(false)

  // ── Stable refs (never cause re-renders, safe to use in closures) ─────────
  const localVideoRef    = useRef(null)
  const remoteVideoRef   = useRef(null)
  const pcRef            = useRef(null)
  const localStreamRef   = useRef(null)
  const remoteStreamRef  = useRef(null)
  const originalStreamRef= useRef(null)
  const pendingCandidates= useRef([])
  const pendingOfferRef  = useRef(null)
  const hasInitRef       = useRef(false)
  const iceServersRef    = useRef(DEFAULT_ICE_SERVERS) // fetched from backend on mount

  // Refs that mirror the latest state values — lets socket callbacks always
  // read fresh data without ever being re-registered
  const roomIdRef   = useRef(roomId)
  const userRef     = useRef(user)
  const otherUserRef= useRef(null)
  const autoStartRef= useRef(autoStart)

  // ── Fetch ICE servers from backend on mount ───────────────────────────────
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
    fetch(`${SOCKET_URL}/api/ice-servers`)
      .then(r => r.json())
      .then(data => {
        if (data.iceServers?.length) {
          iceServersRef.current = {
            iceServers: data.iceServers,
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all',
          }
          console.log('✅ ICE servers loaded from backend:', data.iceServers.length, 'entries')
        }
      })
      .catch(() => console.log('⚠️ Using default ICE servers'))
  }, [])
  useEffect(() => { roomIdRef.current   = roomId   }, [roomId])
  useEffect(() => { userRef.current     = user     }, [user])
  useEffect(() => { otherUserRef.current= otherUser }, [otherUser])
  useEffect(() => { autoStartRef.current= autoStart }, [autoStart])

  // ── Apply remote stream to <video> ────────────────────────────────────────
  const applyRemoteStream = (stream) => {
    remoteStreamRef.current = stream
    // Set immediately if element exists
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream
      remoteVideoRef.current.play().catch(() => {})
    }
    setCallActive(true)
  }

  // Re-apply remote stream whenever callActive becomes true
  // (the video element may have been hidden/shown by a re-render)
  useEffect(() => {
    if (callActive && remoteStreamRef.current && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
      remoteVideoRef.current.play().catch(() => {})
    }
  }, [callActive])

  const remoteVideoCallbackRef = (node) => {
    remoteVideoRef.current = node
    if (node && remoteStreamRef.current) {
      node.srcObject = remoteStreamRef.current
      node.play().catch(() => {})
    }
  }

  // ── Build an RTCPeerConnection ────────────────────────────────────────────
  const buildPC = (socket, toUserId) => {
    const pc = new RTCPeerConnection(iceServersRef.current)

    pc.ontrack = (e) => {
      console.log('📹 ontrack:', e.track.kind)
      const stream = e.streams[0]
      if (stream) {
        applyRemoteStream(stream)
      } else {
        if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream()
        remoteStreamRef.current.addTrack(e.track)
        applyRemoteStream(remoteStreamRef.current)
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('iceCandidate', {
          roomId: roomIdRef.current,
          candidate: e.candidate,
          fromUserId: userRef.current._id,
          toUserId,
        })
      }
    }

    pc.onconnectionstatechange = () => console.log('🔌 PC:', pc.connectionState)
    pc.oniceconnectionstatechange = () => console.log('🧊 ICE:', pc.iceConnectionState)

    return pc
  }

  // ── Get/init local camera stream ──────────────────────────────────────────
  const getLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
  }

  // ── handleOffer ref — always points to latest version ─────────────────────
  const handleOfferRef = useRef(null)

  // ── Handle an incoming offer (callee) ────────────────────────────────────
  const handleOffer = async (data) => {
    const socket = getSocket()
    if (!socket) { console.error('❌ handleOffer: no socket'); return }
    if (pcRef.current) { console.log('⚠️ Duplicate offer ignored'); return }
    if (!userRef.current) { console.error('❌ handleOffer: user not loaded yet'); return }

    try {
      console.log('📨 handleOffer from:', data.fromUserId, '| my id:', userRef.current._id)
      const stream = await getLocalStream()
      const toUserId = data.fromUserId
      const pc = buildPC(socket, toUserId)
      pcRef.current = pc

      stream.getTracks().forEach(t => {
        pc.addTrack(t, stream)
        console.log('➕ added track:', t.kind)
      })

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
      console.log('✅ remoteDescription set')

      // flush queued ICE candidates
      for (const c of pendingCandidates.current)
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn)
      pendingCandidates.current = []

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('answer', {
        roomId: roomIdRef.current,
        answer,
        fromUserId: userRef.current._id,
        toUserId,
      })
      console.log('📤 Answer emitted to', toUserId)
      setIncomingCall(false)
      setAnswerSent(true)
    } catch (err) {
      console.error('❌ handleOffer error:', err.name, err.message, err)
    }
  }
  // Keep ref current on every render
  handleOfferRef.current = handleOffer

  // ── Register socket listeners — re-attach on every reconnect ────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onIncomingCall = (data) => {
      if (!pcRef.current) {
        setIncomingCall(true)
        showCallNotification(otherUserRef.current?.name || 'Someone')
        playNotificationSound()
      }
    }

    const onOffer = (data) => {
      console.log('📥 offer received')
      if (!otherUserRef.current) {
        console.log('📦 otherUser not ready, queuing offer')
        pendingOfferRef.current = data
        return
      }
      handleOfferRef.current(data)
    }

    const onAnswer = async (data) => {
      console.log('📥 answer received')
      if (!pcRef.current) return
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
        for (const c of pendingCandidates.current)
          await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
        pendingCandidates.current = []
      } catch (err) {
        console.error('❌ onAnswer error:', err)
      }
    }

    const onIceCandidate = async (data) => {
      if (!data.candidate) return
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error)
      } else {
        pendingCandidates.current.push(data.candidate)
      }
    }

    const onCallEnded       = () => cleanup()
    const onScreenShareOn   = () => setRemoteScreenSharing(true)
    const onScreenShareOff  = () => setRemoteScreenSharing(false)

    const detach = () => {
      socket.off('incomingCall',       onIncomingCall)
      socket.off('offer',              onOffer)
      socket.off('answer',             onAnswer)
      socket.off('iceCandidate',       onIceCandidate)
      socket.off('callEnded',          onCallEnded)
      socket.off('screenShareStarted', onScreenShareOn)
      socket.off('screenShareStopped', onScreenShareOff)
    }

    const attach = () => {
      detach() // always remove first to prevent duplicates
      socket.on('incomingCall',       onIncomingCall)
      socket.on('offer',              onOffer)
      socket.on('answer',             onAnswer)
      socket.on('iceCandidate',       onIceCandidate)
      socket.on('callEnded',          onCallEnded)
      socket.on('screenShareStarted', onScreenShareOn)
      socket.on('screenShareStopped', onScreenShareOff)
    }

    // Attach immediately + re-attach after every reconnect
    attach()
    socket.on('connect', attach)

    return () => {
      socket.off('connect', attach)
      detach()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch room + join socket room ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    getSocket()?.emit('joinRoom', { roomId, userId: user._id })

    const fetchRoom = async (retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          setLoading(true)
          const res = await roomAPI.getById(roomId)
          const roomData = res.data.data?.room
          const uid = user._id
          const s1  = roomData.student1?._id || roomData.student1
          const other = String(uid) === String(s1) ? roomData.student2 : roomData.student1
          setOtherUser(other)
          requestNotificationPermission()
          setLoading(false)
          return // success — exit loop
        } catch (err) {
          console.error(`Fetch room attempt ${attempt}/${retries} failed:`, err.message)
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1000 * attempt))
          } else {
            setLoading(false) // let the page render even if fetch fails
          }
        }
      }
    }
    fetchRoom()
  }, [roomId, user])

  // ── Once otherUser loads: flush pending offer / pre-warm camera ──────────
  useEffect(() => {
    if (!otherUser) return

    // Always pre-warm camera as soon as we know who we're calling
    // This ensures permission is granted before offer/startCall
    if (!hasInitRef.current) {
      hasInitRef.current = true
      getLocalStream().then(() => {
        // Tell the caller we're ready to receive the offer
        if (autoStartRef.current && userRef.current && otherUserRef.current) {
          getSocket()?.emit('calleeReady', {
            roomId: roomIdRef.current,
            fromUserId: userRef.current._id,
            toUserId: otherUserRef.current._id,
          })
          console.log('📞 calleeReady emitted')
        }
      }).catch(err => {
        console.warn('Camera pre-warm failed:', err.message)
      })
    }

    // Flush any offer that arrived before otherUser was ready
    if (pendingOfferRef.current && !pcRef.current) {
      const data = pendingOfferRef.current
      pendingOfferRef.current = null
      handleOfferRef.current(data)
    }
  }, [otherUser]) // eslint-disable-line

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = () => {
    originalStreamRef.current?.getTracks().forEach(t => t.stop())
    originalStreamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    remoteStreamRef.current = null
    pendingCandidates.current = []
    setCallActive(false)
    setCallStarted(false)
    setAnswerSent(false)
    setScreenSharing(false)
    setRemoteScreenSharing(false)
  }

  // ── Start call (CALLER) ───────────────────────────────────────────────────
  const startCall = async () => {
    if (pcRef.current) return
    const socket = getSocket()
    if (!socket || !otherUser) return
    try {
      console.log('🎥 Starting call...')
      setCallStarted(true) // show "Calling..." state immediately

      const stream = await getLocalStream()
      const pc = buildPC(socket, otherUser._id)
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socket.emit('initiateCall', { roomId, fromUserId: user._id, toUserId: otherUser._id })

      // Wait for callee to signal they're ready (up to 15 seconds)
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 15000) // fallback after 15s
        const onReady = () => {
          clearTimeout(timeout)
          socket.off('calleeReady', onReady)
          resolve()
        }
        socket.once('calleeReady', onReady)
      })

      socket.emit('offer', { roomId, offer, fromUserId: user._id, toUserId: otherUser._id })
      console.log('📤 Offer sent to', otherUser._id)
    } catch (err) {
      console.error('❌ startCall error:', err)
      setCallStarted(false)
      alert('Failed to access camera/microphone.')
    }
  }

  // ── Accept in-page incoming call (CALLEE) ─────────────────────────────────
  const acceptIncomingCall = async () => {
    setIncomingCall(false)
    try {
      await getLocalStream()
      // Tell the caller we're ready before processing any queued offer
      if (userRef.current && otherUserRef.current) {
        getSocket()?.emit('calleeReady', {
          roomId: roomIdRef.current,
          fromUserId: userRef.current._id,
          toUserId: otherUserRef.current._id,
        })
        console.log('📞 calleeReady emitted (acceptIncomingCall)')
      }
      if (pendingOfferRef.current && !pcRef.current) {
        const data = pendingOfferRef.current
        pendingOfferRef.current = null
        handleOfferRef.current(data)
      }
    } catch (err) {
      console.error('❌ acceptIncomingCall error:', err)
      alert('Failed to access camera/microphone.')
    }
  }

  const rejectIncomingCall = () => {
    setIncomingCall(false)
    getSocket()?.emit('callRejected', { roomId, fromUserId: user._id, toUserId: otherUser?._id })
  }

  const endCurrentCall = () => {
    getSocket()?.emit('callEnded', { roomId, fromUserId: user._id, toUserId: otherUser?._id })
    cleanup()
    setShowFeedbackModal(true)
  }

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setMicEnabled(p => !p)
  }

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setVideoEnabled(p => !p)
  }

  const startScreenShare = async () => {
    if (screenSharing) return
    try {
      const ok = window.confirm('Tip: Select a Window or Tab to avoid mirror effect.\n\nContinue?')
      if (!ok) return
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false })
      if (!originalStreamRef.current) originalStreamRef.current = localStreamRef.current
      const screenTrack = screenStream.getVideoTracks()[0]
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
      localStreamRef.current = screenStream
      setScreenSharing(true)
      screenTrack.onended = () => stopScreenShare()
      getSocket()?.emit('screenShareStarted', { roomId, fromUserId: user._id, toUserId: otherUser?._id })
    } catch (err) {
      if (err.name !== 'NotAllowedError') alert('Failed to start screen sharing.')
    }
  }

  const stopScreenShare = async () => {
    try {
      if (localVideoRef.current?.srcObject && screenSharing)
        localVideoRef.current.srcObject.getTracks().forEach(t => t.stop())
      if (originalStreamRef.current) {
        const videoTrack = originalStreamRef.current.getVideoTracks()[0]
        const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')
        if (sender && videoTrack) await sender.replaceTrack(videoTrack)
        if (localVideoRef.current) localVideoRef.current.srcObject = originalStreamRef.current
        localStreamRef.current = originalStreamRef.current
        originalStreamRef.current = null
      }
      setScreenSharing(false)
      getSocket()?.emit('screenShareStopped', { roomId, fromUserId: user._id, toUserId: otherUser?._id })
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

  // ── Decide what the bottom bar shows ──────────────────────────────────────
  const showInCallControls = callActive
  const showCallerDialing  = !callActive && callStarted && !autoStart
  // Callee: show full controls once they've sent answer (even before video arrives)
  const showCalleeWaiting  = !callActive && autoStart && !answerSent
  const showCalleeConnecting = !callActive && autoStart && answerSent
  const showStartCall      = !callActive && !callStarted && !autoStart

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: '#0a0a0f', overflow: 'hidden', position: 'relative' }}>

      <CallEndFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => { setShowFeedbackModal(false); navigate(`/chat/${roomId}`) }}
        roomId={roomId}
        otherUser={otherUser}
      />

      {/* ═══════════════════════════════════════════════════════════════
          REMOTE VIDEO — fills the entire screen (always in DOM)
      ═══════════════════════════════════════════════════════════════ */}
      <video
        ref={remoteVideoCallbackRef}
        autoPlay
        playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          background: '#0a0a0f',
          zIndex: 1,
          // Always rendered — stream attaches even before overlay disappears
        }}
      />

      {/* Pre-call / waiting overlay — shown when remote video isn't active */}
      {!callActive && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,10,20,0.92)', gap: 16, zIndex: 2,
        }}>
          <motion.div
            animate={(callStarted || autoStart) ? { scale: [1, 1.06, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid rgba(99,102,241,0.6)',
              boxShadow: '0 0 40px rgba(99,102,241,0.35)',
            }}>
            {otherUser?.profileImage
              ? <img src={otherUser.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700, fontSize: 40 }}>{otherUser?.name?.charAt(0).toUpperCase() || 'U'}</span>}
          </motion.div>
          <p style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: 0 }}>{otherUser?.name || 'Unknown'}</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
            {callStarted ? 'Ringing...' : answerSent ? 'Connecting...' : autoStart ? 'Waiting for caller...' : 'Ready to call'}
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          LOCAL VIDEO — top-left corner, always visible
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute',
        top: 70, left: 16,          // just below the header
        width: 140, height: 105,
        borderRadius: 12,
        overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.25)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        zIndex: 20,
        background: '#1a1a2e',
      }}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
        {/* Camera-off overlay */}
        {!videoEnabled && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#1a1a2e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <VideoOff size={26} color="rgba(255,255,255,0.4)" />
          </div>
        )}
        {/* "You" label */}
        <div style={{
          position: 'absolute', bottom: 4, left: 0, right: 0,
          textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.7)',
          fontWeight: 600, letterSpacing: 0.5,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
          paddingBottom: 2,
        }}>
          {screenSharing ? '📺 Sharing' : 'You'}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          HEADER — name + status + back + fullscreen
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)',
      }}>
        {/* Left: back button + other user info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate(`/chat/${roomId}`)}
            style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
            <ArrowLeft size={17} />
          </button>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, border: '2px solid rgba(255,255,255,0.25)',
          }}>
            {otherUser?.profileImage
              ? <img src={otherUser.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{otherUser?.name?.charAt(0).toUpperCase() || 'U'}</span>}
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>{otherUser?.name || 'Unknown'}</p>
            <p style={{ fontSize: 11, margin: 0, color: callActive ? '#34d399' : 'rgba(255,255,255,0.5)' }}>
              {callActive ? '● Connected' : callStarted ? '● Calling...' : answerSent ? '● Connecting...' : autoStart ? '● Waiting...' : '● Ready'}
            </p>
          </div>
        </div>

        {/* Right: fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
      </div>

      {/* Remote screen-share badge */}
      {remoteScreenSharing && callActive && (
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: '#3b82f6', color: 'white',
          padding: '5px 14px', borderRadius: 8,
          fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6, zIndex: 25,
        }}>
          <Monitor size={13} /> {otherUser?.name} is sharing screen
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          IN-PAGE INCOMING CALL OVERLAY
          (shown when someone calls while both are already on this page)
      ═══════════════════════════════════════════════════════════════ */}
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 60,
          }}>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                width: 88, height: 88, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px', fontSize: 36, color: 'white', fontWeight: 700,
                border: '3px solid rgba(99,102,241,0.5)',
              }}>
              {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
            </motion.div>
            <p style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{otherUser?.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 28, fontSize: 14 }}>Incoming video call...</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                onClick={acceptIncomingCall}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '13px 30px', background: '#22c55e',
                  border: 'none', borderRadius: 50,
                  color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
                }}>
                <Phone size={20} /> Accept
              </button>
              <button
                onClick={rejectIncomingCall}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '13px 30px', background: '#ef4444',
                  border: 'none', borderRadius: 50,
                  color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                }}>
                <PhoneOff size={20} /> Reject
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          BOTTOM CONTROLS
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
        padding: '20px 24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
      }}>

        {/* ── Caller: before call ── */}
        {showStartCall && (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={startCall}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '15px 36px',
              background: 'linear-gradient(135deg,#22c55e,#16a34a)',
              border: 'none', borderRadius: 50,
              color: 'white', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 24px rgba(34,197,94,0.45)',
            }}>
            <Phone size={22} /> Start Call
          </motion.button>
        )}

        {/* ── Caller: ringing ── */}
        {showCallerDialing && (
          <>
            <CtrlBtn onClick={toggleMic} active={micEnabled} danger={!micEnabled}>
              {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </CtrlBtn>
            <CtrlBtn onClick={toggleVideo} active={videoEnabled} danger={!videoEnabled}>
              {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </CtrlBtn>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={endCurrentCall}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 28px', height: 56, borderRadius: 50,
                border: 'none', cursor: 'pointer',
                background: '#ef4444', color: 'white',
                fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(239,68,68,0.45)',
              }}>
              <PhoneOff size={20} /> Cancel
            </motion.button>
          </>
        )}

        {/* ── Callee: waiting for offer ── */}
        {showCalleeWaiting && (
          <>
            <CtrlBtn onClick={toggleMic} active={micEnabled} danger={!micEnabled}>
              {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </CtrlBtn>
            <CtrlBtn onClick={toggleVideo} active={videoEnabled} danger={!videoEnabled}>
              {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </CtrlBtn>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { cleanup(); navigate(`/chat/${roomId}`) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 28px', height: 56, borderRadius: 50,
                border: 'none', cursor: 'pointer',
                background: '#ef4444', color: 'white',
                fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(239,68,68,0.45)',
              }}>
              <PhoneOff size={20} /> Leave
            </motion.button>
          </>
        )}

        {/* ── Callee: answer sent, waiting for remote video ── */}
        {showCalleeConnecting && (
          <>
            <CtrlBtn onClick={toggleMic} active={micEnabled} danger={!micEnabled} title={micEnabled ? 'Mute' : 'Unmute'}>
              {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </CtrlBtn>
            <CtrlBtn onClick={toggleVideo} active={videoEnabled} danger={!videoEnabled} title={videoEnabled ? 'Camera off' : 'Camera on'}>
              {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </CtrlBtn>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={endCurrentCall}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 28px', height: 56, borderRadius: 50,
                border: 'none', cursor: 'pointer',
                background: '#ef4444', color: 'white',
                fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(239,68,68,0.45)',
              }}>
              <PhoneOff size={20} /> End Call
            </motion.button>
          </>
        )}

        {/* ── In-call ── */}
        {showInCallControls && (
          <>
            <CtrlBtn onClick={toggleMic} active={micEnabled} danger={!micEnabled} title={micEnabled ? 'Mute' : 'Unmute'}>
              {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </CtrlBtn>
            <CtrlBtn onClick={toggleVideo} active={videoEnabled} danger={!videoEnabled} title={videoEnabled ? 'Camera off' : 'Camera on'}>
              {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </CtrlBtn>
            <CtrlBtn onClick={screenSharing ? stopScreenShare : startScreenShare} active={!screenSharing} accent={screenSharing} title={screenSharing ? 'Stop sharing' : 'Share screen'}>
              {screenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
            </CtrlBtn>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={endCurrentCall}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 28px', height: 56, borderRadius: 50,
                border: 'none', cursor: 'pointer',
                background: '#ef4444', color: 'white',
                fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(239,68,68,0.45)',
              }}>
              <PhoneOff size={20} /> End Call
            </motion.button>
          </>
        )}
      </div>
    </div>
  )
}

// Small reusable control button
function CtrlBtn({ children, onClick, active, danger, accent, title }) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      onClick={onClick}
      title={title}
      style={{
        width: 56, height: 56, borderRadius: '50%',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: danger ? '#ef4444' : accent ? '#3b82f6' : 'rgba(255,255,255,0.15)',
        color: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
      }}>
      {children}
    </motion.button>
  )
}
