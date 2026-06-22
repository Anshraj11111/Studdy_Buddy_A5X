import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { roomAPI } from '../services/api'
import { getSocket } from '../services/socket'
import { showCallNotification, playNotificationSound, requestNotificationPermission, stopCallingTone, stopRingtone } from '../utils/notifications'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ArrowLeft, Monitor, MonitorOff, Maximize, Minimize } from 'lucide-react'
import CallEndFeedbackModal from '../components/CallEndFeedbackModal'

// ─── ICE config — loaded from backend on mount, this is the fallback ────────
const FALLBACK_ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:in.relay.metered.ca:80',
        'turn:in.relay.metered.ca:80?transport=tcp',
        'turn:in.relay.metered.ca:443',
        'turns:in.relay.metered.ca:443?transport=tcp',
      ],
      username: 'dd9dff66bc88d50dc88d1cc3',
      credential: '3a7ymuMhHgFio/OH',
    },
  ],
  iceCandidatePoolSize: 0,
  iceTransportPolicy: 'all',  // allow all — relay + direct — works on same machine
}

export default function VideoCall() {
  const { roomId }      = useParams()
  const [searchParams]  = useSearchParams()
  const isCallee        = searchParams.get('autoStart') === 'true'
  const audioOnly       = searchParams.get('audioOnly') === 'true'  // voice call mode
  const isCaller        = searchParams.get('caller') === 'true'     // caller navigated here
  const navigate        = useNavigate()
  const { user }        = useAuthStore()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [otherUser,          setOtherUser]         = useState(null)
  const [loading,            setLoading]           = useState(true)
  const [status,             setStatus]            = useState('idle') // idle | warming | calling | ringing | connecting | connected
  const [micEnabled,         setMicEnabled]        = useState(true)
  const [videoEnabled,       setVideoEnabled]      = useState(true)
  const [screenSharing,      setScreenSharing]     = useState(false)
  const [remoteScreenShare,  setRemoteScreenShare] = useState(false)
  const [incomingCall,       setIncomingCall]      = useState(false)
  const [showFeedback,       setShowFeedback]      = useState(false)
  const [isFullscreen,       setIsFullscreen]      = useState(false)

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const localVideoRef  = useRef(null)
  const remoteVideoRef = useRef(null)

  // ── WebRTC refs ───────────────────────────────────────────────────────────
  const pcRef              = useRef(null)
  const localStreamRef     = useRef(null)
  const origStreamRef      = useRef(null)   // before screen share
  const pendingCandidates  = useRef([])
  const pendingOffer       = useRef(null)   // offer that arrived before otherUser loaded

  // ── One-shot guards ───────────────────────────────────────────────────────
  const calleeReadySent = useRef(false)
  const offerSent       = useRef(false)
  const callEndedSent   = useRef(false)
  const startCallRef    = useRef(null) // ref to startCall for use in init effect

  // ── Stable mirrors of state (safe to read inside socket closures) ─────────
  const roomIdRef    = useRef(roomId)
  const userRef      = useRef(user)
  const otherUserRef = useRef(null)
  const isCalleeRef  = useRef(isCallee)
  const iceConfigRef = useRef(FALLBACK_ICE)

  useEffect(() => { roomIdRef.current   = roomId  }, [roomId])
  useEffect(() => { userRef.current     = user    }, [user])
  useEffect(() => { otherUserRef.current = otherUser }, [otherUser])
  useEffect(() => { isCalleeRef.current = isCallee }, [isCallee])

  // ── Fetch fresh ICE servers from backend — wait up to 3s ────────────────
  const iceReadyRef = useRef(false)
  useEffect(() => {
    const base = import.meta.env.VITE_SOCKET_URL || 'https://studdy-buddy-backend-a5x.onrender.com'
    fetch(`${base}/api/ice-servers`)
      .then(r => r.json())
      .then(d => {
        if (d.iceServers?.length) {
          iceConfigRef.current = {
            iceServers: d.iceServers,
            iceCandidatePoolSize: 0,
            iceTransportPolicy: 'all',  // allow direct + relay
          }
          console.log('✅ ICE servers from backend:', d.iceServers.length, 'servers')
        }
      })
      .catch(() => console.log('⚠️ Using fallback ICE servers'))
      .finally(() => { iceReadyRef.current = true })
  }, [])

  // ── Get local camera / mic ────────────────────────────────────────────────
  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current
    // audioOnly = voice call, no camera
    const constraints = audioOnly
      ? { video: false, audio: true }
      : { video: true, audio: true }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
  }, [audioOnly])

  // ── Attach remote stream to <video> element ───────────────────────────────
  const attachRemoteStream = useCallback((stream) => {
    if (!stream || !stream.getTracks().length) return
    const vid = remoteVideoRef.current
    if (!vid) return

    vid.srcObject = stream
    console.log('📺 Remote stream set, tracks:', stream.getTracks().map(t => t.kind + ':' + t.readyState))

    // Play immediately — don't wait for status update
    // This ensures audio plays even in audioOnly mode where video is hidden
    vid.play().catch(() => {
      console.warn('Immediate play failed — will retry on status change')
    })

    setStatus('connected')
  }, [])

  // ── Play remote video/audio once connected ────────────────────────────────
  useEffect(() => {
    if (status !== 'connected') return
    const vid = remoteVideoRef.current
    if (!vid || !vid.srcObject) return
    vid.play().catch(() => {
      vid.muted = false
      vid.play().catch(err => console.warn('Remote play failed:', err.message))
    })
  }, [status])

  // ── Build RTCPeerConnection ───────────────────────────────────────────────
  const buildPC = useCallback((toUserId) => {
    const pc = new RTCPeerConnection(iceConfigRef.current)

    pc.ontrack = (e) => {
      console.log('📹 ontrack:', e.track.kind, 'streams:', e.streams.length)
      const stream = e.streams[0] || new MediaStream([e.track])
      attachRemoteStream(stream)
    }

    pc.onicecandidate = (e) => {
      if (!e.candidate) return
      const sock = getSocket()
      if (!sock) return
      sock.emit('iceCandidate', {
        roomId:     roomIdRef.current,
        candidate:  e.candidate,
        fromUserId: userRef.current?._id,
        toUserId,
      })
    }

    pc.onconnectionstatechange = () => {
      console.log('🔌 PC state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        // Always set connected — both video and audio calls
        setStatus('connected')
      }
      if (pc.connectionState === 'failed') {
        console.log('🔄 PC failed — attempting ICE restart')
        try { pc.restartIce() } catch (e) { console.warn('restartIce failed:', e.message) }
      }
      if (pc.connectionState === 'disconnected') {
        // Give it 3 seconds to recover before restarting
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            console.log('🔄 PC still disconnected — restarting ICE')
            try { pc.restartIce() } catch (e) { console.warn('restartIce failed:', e.message) }
          }
        }, 3000)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', pc.iceConnectionState)
      if (pc.iceConnectionState === 'failed') {
        console.log('🔄 ICE failed — restarting')
        try { pc.restartIce() } catch (e) { console.warn('restartIce failed:', e.message) }
      }
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('✅ ICE connected!')
        setStatus('connecting') // will become 'connected' when ontrack fires
      }
    }

    return pc
  }, [attachRemoteStream])

  // ── Flush queued ICE candidates after remoteDescription is set ────────────
  const flushCandidates = useCallback(async (pc) => {
    for (const c of pendingCandidates.current) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn('ICE flush warn:', e.message))
    }
    pendingCandidates.current = []
  }, [])

  // ── CALLEE: handle incoming offer ─────────────────────────────────────────
  const handleOffer = useCallback(async (data) => {
    if (pcRef.current) { console.warn('⚠️ Duplicate offer — skipping'); return }
    const socket = getSocket()
    if (!socket || !userRef.current) { console.error('❌ handleOffer: no socket or user'); return }

    try {
      console.log('📨 handleOffer from:', data.fromUserId)

      // Wait for ICE servers to be fetched (max 3s) before building PC
      if (!iceReadyRef.current) {
        await new Promise(resolve => {
          const check = setInterval(() => {
            if (iceReadyRef.current) { clearInterval(check); resolve() }
          }, 100)
          setTimeout(() => { clearInterval(check); resolve() }, 3000)
        })
      }

      const stream   = await getLocalStream()
      const toUserId = data.fromUserId
      const pc       = buildPC(toUserId)
      pcRef.current  = pc

      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
      await flushCandidates(pc)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socket.emit('answer', {
        roomId:     roomIdRef.current,
        answer,
        fromUserId: userRef.current._id,
        toUserId,
      })
      console.log('📤 Answer sent to', toUserId)
      setStatus('connecting')
    } catch (err) {
      console.error('❌ handleOffer error:', err.name, err.message)
    }
  }, [buildPC, flushCandidates, getLocalStream])

  // Keep a ref so socket listeners always call the latest version
  const handleOfferRef = useRef(handleOffer)
  useEffect(() => { handleOfferRef.current = handleOffer }, [handleOffer])

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onIncomingCall = () => {
      if (pcRef.current) return  // already in a call
      setIncomingCall(true)
      showCallNotification(otherUserRef.current?.name || 'Someone')
      playNotificationSound()
    }

    const onOffer = (data) => {
      console.log('📥 offer received, otherUser ready:', !!otherUserRef.current)
      if (!otherUserRef.current) {
        pendingOffer.current = data
        return
      }
      handleOfferRef.current(data)
    }

    const onAnswer = async (data) => {
      console.log('📥 answer received')
      const pc = pcRef.current
      if (!pc) return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        await flushCandidates(pc)
        setStatus('connecting')
      } catch (err) {
        console.error('❌ onAnswer error:', err)
      }
    }

    const onIceCandidate = async (data) => {
      if (!data.candidate) return
      const pc = pcRef.current
      if (!pc) return
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.warn('ICE add warn:', e.message))
      } else {
        pendingCandidates.current.push(data.candidate)
      }
    }

    const onCallEnded       = () => doCleanup()
    const onScreenShareOn   = () => setRemoteScreenShare(true)
    const onScreenShareOff  = () => setRemoteScreenShare(false)

    const attach = () => {
      socket.off('incomingCall',       onIncomingCall)
      socket.off('offer',              onOffer)
      socket.off('answer',             onAnswer)
      socket.off('iceCandidate',       onIceCandidate)
      socket.off('callEnded',          onCallEnded)
      socket.off('screenShareStarted', onScreenShareOn)
      socket.off('screenShareStopped', onScreenShareOff)

      socket.on('incomingCall',        onIncomingCall)
      socket.on('offer',               onOffer)
      socket.on('answer',              onAnswer)
      socket.on('iceCandidate',        onIceCandidate)
      socket.on('callEnded',           onCallEnded)
      socket.on('screenShareStarted',  onScreenShareOn)
      socket.on('screenShareStopped',  onScreenShareOff)
    }

    attach()
    socket.on('connect', attach)

    return () => {
      socket.off('connect', attach)
      socket.off('incomingCall',       onIncomingCall)
      socket.off('offer',              onOffer)
      socket.off('answer',             onAnswer)
      socket.off('iceCandidate',       onIceCandidate)
      socket.off('callEnded',          onCallEnded)
      socket.off('screenShareStarted', onScreenShareOn)
      socket.off('screenShareStopped', onScreenShareOff)
    }
  }, [flushCandidates]) // eslint-disable-line

  // ── Join room socket ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    if (!socket) return
    socket.emit('joinRoom', { roomId, userId: user._id })
    const onReconnect = () => socket.emit('joinRoom', { roomId, userId: user._id })
    socket.on('connect', onReconnect)
    return () => socket.off('connect', onReconnect)
  }, [roomId, user])

  // ── Fetch room data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    ;(async () => {
      for (let i = 1; i <= 3; i++) {
        try {
          const res  = await roomAPI.getById(roomId)
          const room = res.data.data?.room
          const uid  = user._id
          const s1   = room.student1?._id || room.student1
          const other = String(uid) === String(s1) ? room.student2 : room.student1
          setOtherUser(other)
          requestNotificationPermission()
          setLoading(false)
          return
        } catch (err) {
          console.error(`Fetch room attempt ${i}/3:`, err.message)
          if (i < 3) await new Promise(r => setTimeout(r, 1000 * i))
          else setLoading(false)
        }
      }
    })()
  }, [roomId, user])

  // ── Once otherUser loads: pre-warm camera + flush pending offer ───────────
  useEffect(() => {
    if (!otherUser) return

    setStatus('warming')

    // Helper: wait for ICE servers to be ready (max 5s)
    const waitForIce = () => new Promise(resolve => {
      if (iceReadyRef.current) return resolve()
      const check = setInterval(() => {
        if (iceReadyRef.current) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(check); resolve() }, 5000)
    })

    const init = async () => {
      try {
        // 1. Get camera/mic first
        await getLocalStream()

        // 2. Wait for ICE servers
        await waitForIce()
        console.log('✅ ICE ready, config:', iceConfigRef.current.iceTransportPolicy, iceConfigRef.current.iceServers.length, 'servers')

        // 3. Callee: signal readiness (only once, after ICE is ready)
        if (isCalleeRef.current && !calleeReadySent.current) {
          calleeReadySent.current = true
          const socket = getSocket()
          if (socket && userRef.current && otherUserRef.current) {
            socket.emit('calleeReady', {
              roomId:     roomIdRef.current,
              fromUserId: userRef.current._id,
              toUserId:   otherUserRef.current._id,
            })
            console.log('📞 calleeReady emitted (ICE ready)')
            setStatus('ringing')
          }
        } else if (isCaller && !isCalleeRef.current) {
          // Caller navigated here from Chat — auto start call immediately
          setStatus('idle')
          // Small delay to ensure socket is ready
          setTimeout(() => startCallRef.current?.(), 300)
        } else if (!isCalleeRef.current) {
          setStatus('idle')
        }

        // 4. Flush any offer that arrived before otherUser + ICE were ready
        if (pendingOffer.current && !pcRef.current) {
          const data = pendingOffer.current
          pendingOffer.current = null
          handleOfferRef.current(data)
        }
      } catch (err) {
        console.warn('Init failed:', err.message)
        setLoading(false)
      }
    }

    init()
  }, [otherUser, getLocalStream, isCaller])

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const doCleanup = useCallback(() => {
    origStreamRef.current?.getTracks().forEach(t => t.stop())
    origStreamRef.current = null

    if (pcRef.current) { pcRef.current.close(); pcRef.current = null }

    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null

    if (localVideoRef.current)  localVideoRef.current.srcObject  = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null

    pendingCandidates.current = []
    calleeReadySent.current   = false
    offerSent.current         = false
    callEndedSent.current     = false

    stopCallingTone()
    stopRingtone()

    setStatus('idle')
    setScreenSharing(false)
    setRemoteScreenShare(false)
    setIncomingCall(false)
  }, [])

  // ── CALLER: start call ────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (pcRef.current || offerSent.current) return
    const socket = getSocket()
    if (!socket || !otherUser || !user) return

    try {
      setStatus('calling')

      // 1. Wait for ICE servers (max 5s)
      if (!iceReadyRef.current) {
        await new Promise(resolve => {
          const check = setInterval(() => {
            if (iceReadyRef.current) { clearInterval(check); resolve() }
          }, 100)
          setTimeout(() => { clearInterval(check); resolve() }, 5000)
        })
      }
      console.log('✅ Caller ICE ready:', iceConfigRef.current.iceTransportPolicy, iceConfigRef.current.iceServers.length, 'servers')

      const stream = await getLocalStream()
      const pc     = buildPC(otherUser._id)
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // 2. Tell callee there's a call coming (only if NOT already sent from Chat.jsx)
      // isCaller=true means Chat.jsx already sent initiateCall, don't duplicate
      if (!isCaller) {
        socket.emit('initiateCall', { roomId, fromUserId: user._id, toUserId: otherUser._id })
      }

      // 3. Wait for calleeReady (up to 30s) — callee must signal ICE is ready
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 30000)
        socket.once('calleeReady', () => { clearTimeout(timer); resolve() })
      })

      if (offerSent.current) return
      offerSent.current = true
      socket.emit('offer', { roomId, offer, fromUserId: user._id, toUserId: otherUser._id })
      console.log('📤 Offer sent to', otherUser._id)
      stopCallingTone()
      setStatus('ringing')
    } catch (err) {
      console.error('❌ startCall error:', err)
      doCleanup()
      alert('Failed to access camera/microphone.')
    }
  }, [otherUser, user, roomId, buildPC, getLocalStream, doCleanup, isCaller])

  // Keep startCallRef updated so init effect can call it
  useEffect(() => { startCallRef.current = startCall }, [startCall])

  // ── CALLEE: accept in-page call ───────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    setIncomingCall(false)
    try {
      await getLocalStream()
      if (!calleeReadySent.current) {
        calleeReadySent.current = true
        const socket = getSocket()
        if (socket && userRef.current && otherUserRef.current) {
          socket.emit('calleeReady', {
            roomId:     roomIdRef.current,
            fromUserId: userRef.current._id,
            toUserId:   otherUserRef.current._id,
          })
        }
      }
      if (pendingOffer.current && !pcRef.current) {
        const data = pendingOffer.current
        pendingOffer.current = null
        handleOfferRef.current(data)
      }
    } catch (err) {
      console.error('❌ acceptCall error:', err)
      alert('Failed to access camera/microphone.')
    }
  }, [getLocalStream])

  const rejectCall = useCallback(() => {
    setIncomingCall(false)
    getSocket()?.emit('callRejected', { roomId, fromUserId: user?._id, toUserId: otherUser?._id })
  }, [roomId, user, otherUser])

  const endCall = useCallback(() => {
    if (!callEndedSent.current) {
      callEndedSent.current = true
      getSocket()?.emit('callEnded', { roomId, fromUserId: user?._id, toUserId: otherUser?._id })
    }
    doCleanup()
    setShowFeedback(true)
  }, [roomId, user, otherUser, doCleanup])

  // ── Mic / Video toggles ───────────────────────────────────────────────────
  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setMicEnabled(p => !p)
  }
  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setVideoEnabled(p => !p)
  }

  // ── Screen share ──────────────────────────────────────────────────────────
  const startScreenShare = async () => {
    if (screenSharing) return
    try {
      const ok = window.confirm('Select a Window or Tab to share.\n\nContinue?')
      if (!ok) return
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false })
      if (!origStreamRef.current) origStreamRef.current = localStreamRef.current
      const screenTrack = screenStream.getVideoTracks()[0]
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
      localStreamRef.current = screenStream
      setScreenSharing(true)
      screenTrack.onended = stopScreenShare
      getSocket()?.emit('screenShareStarted', { roomId, fromUserId: user?._id, toUserId: otherUser?._id })
    } catch (err) {
      if (err.name !== 'NotAllowedError') alert('Screen share failed.')
    }
  }

  const stopScreenShare = async () => {
    try {
      localVideoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
      if (origStreamRef.current) {
        const videoTrack = origStreamRef.current.getVideoTracks()[0]
        const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')
        if (sender && videoTrack) await sender.replaceTrack(videoTrack)
        if (localVideoRef.current) localVideoRef.current.srcObject = origStreamRef.current
        localStreamRef.current = origStreamRef.current
        origStreamRef.current  = null
      }
      setScreenSharing(false)
      getSocket()?.emit('screenShareStopped', { roomId, fromUserId: user?._id, toUserId: otherUser?._id })
    } catch (err) {
      console.error('stopScreenShare error:', err)
    }
  }

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ── Derived display flags ─────────────────────────────────────────────────
  const isConnected   = status === 'connected'
  const showStartBtn  = !isConnected && !isCallee && status === 'idle'
  const showEndBtn    = isConnected || ['calling','ringing','connecting'].includes(status)
  const statusLabel   = {
    idle:       'Ready to call',
    warming:    audioOnly ? 'Starting mic...' : 'Starting camera...',
    calling:    'Calling...',
    ringing:    isCallee ? 'Connecting...' : 'Ringing...',
    connecting: 'Connected',
    connected:  '● Connected',
  }[status] ?? ''

  // ── Loading screen ────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#0a0a0f', overflow: 'hidden', position: 'relative' }}>

      <CallEndFeedbackModal
        isOpen={showFeedback}
        onClose={() => { setShowFeedback(false); navigate(`/chat/${roomId}`) }}
        roomId={roomId}
        otherUser={otherUser}
      />

      {/* ── REMOTE VIDEO — full screen (video call only) ───────────────── */}
      {!audioOnly && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            background: '#0a0a0f',
            zIndex: 1,
            display: isConnected ? 'block' : 'none',
          }}
        />
      )}
      {/* Hidden audio element for voice call — plays remote audio */}
      {audioOnly && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* ── VOICE CALL CONNECTED UI ─────────────────────────────────────── */}
      {audioOnly && isConnected && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(160deg,#0f0c24 0%,#1a1535 100%)',
          gap: 20,
        }}>
          {/* Pulsing audio rings */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {[1,2,3].map(i => (
              <motion.div key={i}
                style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.4)' }}
                animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
              />
            ))}
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: '3px solid rgba(99,102,241,0.5)',
              boxShadow: '0 0 40px rgba(99,102,241,0.4)',
            }}>
              {otherUser?.profileImage
                ? <img src={otherUser.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 700, fontSize: 40 }}>{otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}</span>}
            </div>
          </div>
          <p style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: 0 }}>{otherUser?.name}</p>
          <p style={{ color: '#34d399', fontSize: 14, margin: 0, fontFamily: 'monospace' }}>● Voice call connected</p>
        </div>
      )}

      {/* ── PRE-CALL OVERLAY (both voice and video) ──────────────────────── */}
      {!isConnected && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,10,20,0.95)', gap: 16,
        }}>
          <motion.div
            animate={['calling','ringing','connecting'].includes(status) ? { scale: [1, 1.06, 1] } : {}}
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
              : <span style={{ color: 'white', fontWeight: 700, fontSize: 40 }}>{otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}</span>}
          </motion.div>
          <p style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: 0 }}>{otherUser?.name || 'Unknown'}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>{statusLabel}</p>
        </div>
      )}

      {/* ── LOCAL VIDEO — top-left (video call only) ─────────────────────── */}
      {!audioOnly && (
      <div style={{
        position: 'absolute', top: 70, left: 16,
        width: 140, height: 105,
        borderRadius: 12, overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.25)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        zIndex: 20, background: '#1a1a2e',
      }}>
        <video
          ref={localVideoRef}
          autoPlay playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
        {!videoEnabled && (
          <div style={{ position: 'absolute', inset: 0, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VideoOff size={26} color="rgba(255,255,255,0.4)" />
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 4, left: 0, right: 0,
          textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.7)',
          fontWeight: 600, background: 'linear-gradient(transparent,rgba(0,0,0,0.5))', paddingBottom: 2,
        }}>
          {screenSharing ? '📺 Sharing' : 'You'}
        </div>
      </div>
      )}
      {/* Hidden video el for audioOnly — still needed for srcObject but not shown */}
      {audioOnly && <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />}

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom,rgba(0,0,0,0.75),transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(`/chat/${roomId}`)} style={btnStyle}>
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
              : <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}</span>}
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>{otherUser?.name || 'Unknown'}</p>
            <p style={{ fontSize: 11, margin: 0, color: isConnected ? '#34d399' : 'rgba(255,255,255,0.5)' }}>{statusLabel}</p>
          </div>
        </div>
        <button onClick={toggleFullscreen} style={btnStyle}>
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
      </div>

      {/* ── REMOTE SCREEN SHARE BADGE ────────────────────────────────────── */}
      {remoteScreenShare && isConnected && (
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: '#3b82f6', color: 'white', padding: '5px 14px', borderRadius: 8,
          fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, zIndex: 25,
        }}>
          <Monitor size={13} /> {otherUser?.name} is sharing screen
        </div>
      )}

      {/* ── INCOMING CALL OVERLAY (in-page) ──────────────────────────────── */}
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            position: 'absolute', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                width: 88, height: 88, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px', fontSize: 36, color: 'white', fontWeight: 700,
              }}>
              {otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
            </motion.div>
            <p style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{otherUser?.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 28, fontSize: 14 }}>Incoming video call...</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button onClick={acceptCall} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 30px', background: '#22c55e', border: 'none', borderRadius: 50, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                <Phone size={20} /> Accept
              </button>
              <button onClick={rejectCall} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 30px', background: '#ef4444', border: 'none', borderRadius: 50, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                <PhoneOff size={20} /> Reject
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── BOTTOM CONTROLS ───────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
        padding: '20px 24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
        background: 'linear-gradient(to top,rgba(0,0,0,0.85),transparent)',
      }}>
        {/* Mic + Video controls */}
        {(isConnected || ['calling','ringing','connecting'].includes(status)) && (
          <>
            <CtrlBtn onClick={toggleMic} danger={!micEnabled}>
              {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </CtrlBtn>
            {/* Video toggle — only show for video calls */}
            {!audioOnly && (
              <CtrlBtn onClick={toggleVideo} danger={!videoEnabled}>
                {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
              </CtrlBtn>
            )}
            {/* Upgrade to video call button — voice call only */}
            {audioOnly && isConnected && (
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/video-call/${roomId}?caller=true`)}
                title="Switch to video call"
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'rgba(99,102,241,0.2)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  color: '#a5b4fc', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Video size={22} />
              </motion.button>
            )}
            {/* Screen share — only for video calls */}
            {!audioOnly && isConnected && (
              <CtrlBtn onClick={screenSharing ? stopScreenShare : startScreenShare} accent={screenSharing}>
                {screenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
              </CtrlBtn>
            )}
          </>
        )}

        {/* Start Call — caller only, when idle */}
        {showStartBtn && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startCall}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 36px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 50, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 24px rgba(34,197,94,0.45)' }}>
            <Phone size={22} /> Start Call
          </motion.button>
        )}

        {/* End / Leave button */}
        {(showEndBtn || isCallee) && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={endCall}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 28px', height: 56, borderRadius: 50, border: 'none', cursor: 'pointer', background: '#ef4444', color: 'white', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 16px rgba(239,68,68,0.45)' }}>
            <PhoneOff size={20} /> {isConnected ? 'End Call' : 'Leave'}
          </motion.button>
        )}
      </div>
    </div>
  )
}

// ── Reusable control button ───────────────────────────────────────────────────
function CtrlBtn({ children, onClick, danger, accent }) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      onClick={onClick}
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

// ── Small icon button (header) ────────────────────────────────────────────────
const btnStyle = {
  width: 34, height: 34, borderRadius: 9,
  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
}
