import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { roomAPI } from '../services/api'
import { getSocket } from '../services/socket'
import { showCallNotification, playNotificationSound, requestNotificationPermission, stopCallingTone, stopRingtone, startCallingTone } from '../utils/notifications'
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
  const [autoplayBlocked,    setAutoplayBlocked]   = useState(false)

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
  const isInitiating    = useRef(false) // NEW: Prevent concurrent startCall calls

  // ── Stable mirrors of state (safe to read inside socket closures) ─────────
  const roomIdRef    = useRef(roomId)
  const userRef      = useRef(user)
  const otherUserRef = useRef(null)
  const isCalleeRef  = useRef(isCallee)
  const isCallerRef  = useRef(isCaller)
  const iceConfigRef = useRef(FALLBACK_ICE)

  useEffect(() => { roomIdRef.current   = roomId  }, [roomId])
  useEffect(() => { userRef.current     = user    }, [user])
  useEffect(() => { otherUserRef.current = otherUser }, [otherUser])
  useEffect(() => { isCalleeRef.current = isCallee }, [isCallee])
  useEffect(() => { isCallerRef.current = isCaller }, [isCaller])

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

    if (audioOnly) {
      // Voice call
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      return stream
    }

    // Video call — try progressively simpler constraints until one works
    const attempts = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true },
      { video: { width: { ideal: 640 },  height: { ideal: 480 } }, audio: true },
      { video: true, audio: true },
      { video: true, audio: false },  // camera only, no mic — last resort
    ]

    let lastErr
    for (const constraints of attempts) {
      try {
        console.log('🎥 Trying constraints:', JSON.stringify(constraints))
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        console.log('✅ Got stream with constraints:', JSON.stringify(constraints))
        return stream
      } catch (err) {
        console.warn('⚠️ getUserMedia attempt failed:', err.name, err.message)
        lastErr = err
        // NotAllowedError = user denied permission, stop trying
        if (err.name === 'NotAllowedError') throw err
      }
    }
    throw lastErr
  }, [audioOnly])

  // ── Attach remote stream to <video>/<audio> element ─────────────────────
  const attachRemoteStream = useCallback((stream) => {
    if (!stream || !stream.getTracks().length) return
    const vid = remoteVideoRef.current
    if (!vid) return

    vid.srcObject = stream
    console.log('📺 Remote stream set, tracks:', stream.getTracks().map(t => t.kind + ':' + t.readyState))
    
    // Debug: Log audio track details
    const audioTracks = stream.getAudioTracks()
    console.log('🔊 Audio tracks:', audioTracks.length, audioTracks.map(t => ({
      id: t.id,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState
    })))

    // Set connected FIRST so video becomes visible (display:block), then play
    setStatus('connected')

    // Play after a tick so the DOM has updated (video becomes visible)
    setTimeout(() => {
      if (vid.srcObject) {
        vid.play().catch(err => {
          console.warn('Remote play failed:', err.message)
          setAutoplayBlocked(true)
        })
      }
    }, 100)
  }, [])

  // ── Play remote video/audio once connected ────────────────────────────────
  useEffect(() => {
    if (status !== 'connected') return
    const el = remoteVideoRef.current
    if (!el || !el.srcObject) return

    // Try playing — if blocked by autoplay policy, show a tap-to-unmute button
    el.play().then(() => {
      console.log('✅ Remote audio/video playing')
    }).catch(err => {
      console.warn('Autoplay blocked:', err.message)
      // Set a flag so UI can show "tap to hear" button
      setAutoplayBlocked(true)
    })
  }, [status])

  // ── Unlock audio on user tap (for autoplay-blocked browsers) ─────────────
  const unlockAudio = useCallback(() => {
    const el = remoteVideoRef.current
    if (!el) return
    el.play().catch(() => {})
    setAutoplayBlocked(false)
  }, [])

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
      console.log('🔌 PC connection state:', pc.connectionState)
      
      if (pc.connectionState === 'connected') {
        console.log('✅ PEER CONNECTION ESTABLISHED!')
        setStatus('connected')
      }
      
      if (pc.connectionState === 'failed') {
        console.log('❌ PC CONNECTION FAILED — restarting ICE')
        try { pc.restartIce() } catch (e) { console.warn('ICE restart failed:', e.message) }
      }
      
      if (pc.connectionState === 'disconnected') {
        console.log('⚠️ PC DISCONNECTED — giving 3s to recover')
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            console.log('🔄 Still disconnected — restarting ICE')
            try { pc.restartIce() } catch (e) { console.warn('ICE restart failed:', e.message) }
          }
        }, 3000)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', pc.iceConnectionState)
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('✅ ICE CONNECTED! Audio should work now.')
        setStatus('connected')
      }
      
      if (pc.iceConnectionState === 'failed') {
        console.log('🔄 ICE FAILED — restarting ICE immediately')
        try { 
          pc.restartIce()
          console.log('✅ ICE restart triggered')
        } catch (e) { 
          console.warn('❌ ICE restart failed:', e.message) 
        }
      }
      
      if (pc.iceConnectionState === 'disconnected') {
        console.log('⚠️ ICE DISCONNECTED — waiting 2s before restart')
        // Give it a short time to reconnect automatically
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            console.log('🔄 Still disconnected after 2s — restarting ICE')
            try { pc.restartIce() } catch (e) { console.warn('ICE restart failed:', e.message) }
          }
        }, 2000)
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

      // Get stream — if camera fails, still proceed (audio-only fallback)
      let stream = null
      try {
        stream = await getLocalStream()
      } catch (camErr) {
        console.warn('⚠️ handleOffer: camera failed, proceeding without local stream:', camErr.message)
      }

      const toUserId = data.fromUserId
      const pc       = buildPC(toUserId)
      pcRef.current  = pc

      // Add tracks only if we have a stream
      if (stream) {
        stream.getTracks().forEach(t => pc.addTrack(t, stream))
      }

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

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const doCleanup = useCallback(() => {
    console.log('🧹 Cleaning up call state...')
    
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
    isInitiating.current      = false // Reset initiating flag

    stopCallingTone()
    stopRingtone()

    setStatus('idle')
    setScreenSharing(false)
    setRemoteScreenShare(false)
    setIncomingCall(false)
    
    console.log('✅ Cleanup complete')
  }, [])

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

    const onCalleeReady = async (data) => {
      console.log('✅ calleeReady received from', data.fromUserId)
      
      // If we're the caller from Chat.jsx, NOW send the offer
      if (isCallerRef.current && !offerSent.current && !isInitiating.current) {
        console.log('📤 Caller received calleeReady — sending offer now')
        isInitiating.current = true
        
        try {
          const socket = getSocket()
          if (!socket || !userRef.current || !otherUserRef.current) {
            console.error('❌ Missing socket/user/otherUser')
            isInitiating.current = false
            return
          }
          
          // Build PC and send offer
          const stream = await getLocalStream()
          const pc = buildPC(otherUserRef.current._id || otherUserRef.current)
          pcRef.current = pc
          
          stream.getTracks().forEach(t => pc.addTrack(t, stream))
          
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          
          offerSent.current = true
          socket.emit('offer', { 
            roomId: roomIdRef.current, 
            offer, 
            fromUserId: userRef.current._id, 
            toUserId: otherUserRef.current._id || otherUserRef.current
          })
          
          console.log('📤 Offer sent to', otherUserRef.current._id || otherUserRef.current)
          stopCallingTone()
          setStatus('ringing')
          
        } catch (err) {
          console.error('❌ Error sending offer after calleeReady:', err)
          offerSent.current = false
          doCleanup()
          alert('Failed to start call: ' + err.message)
        } finally {
          isInitiating.current = false
        }
      }
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
      socket.off('calleeReady',        onCalleeReady)
      socket.off('offer',              onOffer)
      socket.off('answer',             onAnswer)
      socket.off('iceCandidate',       onIceCandidate)
      socket.off('callEnded',          onCallEnded)
      socket.off('screenShareStarted', onScreenShareOn)
      socket.off('screenShareStopped', onScreenShareOff)

      socket.on('incomingCall',        onIncomingCall)
      socket.on('calleeReady',         onCalleeReady)
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
      socket.off('calleeReady',        onCalleeReady)
      socket.off('offer',              onOffer)
      socket.off('answer',             onAnswer)
      socket.off('iceCandidate',       onIceCandidate)
      socket.off('callEnded',          onCallEnded)
      socket.off('screenShareStarted', onScreenShareOn)
      socket.off('screenShareStopped', onScreenShareOff)
    }
  }, [flushCandidates, buildPC, getLocalStream, doCleanup, isCaller]) // eslint-disable-line

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
        // 1. Get camera/mic — don't let failure block signaling
        try {
          await getLocalStream()
        } catch (camErr) {
          console.warn('⚠️ Camera/mic failed, continuing without it:', camErr.message)
          // Don't return — still proceed so calleeReady gets emitted
        }

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
          setStatus('calling')
          console.log('📞 Caller from Chat.jsx — waiting for calleeReady')
          startCallingTone()
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

  // ── CALLER: start call (BULLETPROOF VERSION v2.0) ────────────────────────
  const startCall = useCallback(async () => {
    // STRONGEST GUARD: Check if already initiating
    if (isInitiating.current) {
      console.log('⚠️ startCall BLOCKED: Already initiating')
      return
    }
    
    // Strong guard at the very start
    if (pcRef.current || offerSent.current) {
      console.log('⚠️ startCall BLOCKED: PC exists or offer sent')
      return
    }
    
    const socket = getSocket()
    if (!socket || !otherUser || !user) {
      console.log('⚠️ startCall BLOCKED: Missing socket/otherUser/user')
      return
    }

    // LOCK: Mark as initiating FIRST to prevent any concurrent calls
    isInitiating.current = true
    console.log('🔒 Call initiation LOCKED')

    try {
      setStatus('calling')
      console.log('📞 Starting call to', otherUser.name, otherUser._id)

      // 1. Wait for ICE servers (max 5s)
      if (!iceReadyRef.current) {
        console.log('⏳ Waiting for ICE servers...')
        await new Promise(resolve => {
          const check = setInterval(() => {
            if (iceReadyRef.current) { clearInterval(check); resolve() }
          }, 100)
          setTimeout(() => { clearInterval(check); resolve() }, 5000)
        })
      }
      console.log('✅ ICE ready:', iceConfigRef.current.iceServers.length, 'servers')

      // Check again - another process might have created PC
      if (pcRef.current) {
        console.log('⚠️ PC already exists after ICE wait, aborting')
        isInitiating.current = false
        return
      }

      // 2. Get local media stream
      console.log('🎤 Getting local stream...')
      const stream = await getLocalStream()
      console.log('✅ Got local stream:', stream.getTracks().map(t => t.kind))

      // 3. Build PeerConnection
      console.log('🔗 Building PeerConnection...')
      const pc = buildPC(otherUser._id)
      pcRef.current = pc
      
      // 4. Add tracks
      stream.getTracks().forEach(t => {
        console.log('➕ Adding track:', t.kind, t.enabled ? 'enabled' : 'disabled')
        pc.addTrack(t, stream)
      })

      // 5. Create offer
      console.log('📝 Creating offer...')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      console.log('✅ Local description set')

      // 6. Send initiateCall (only if NOT from Chat.jsx)
      if (!isCaller) {
        console.log('📞 Emitting initiateCall...')
        socket.emit('initiateCall', { 
          roomId, 
          fromUserId: user._id, 
          toUserId: otherUser._id,
          callType: audioOnly ? 'audio' : 'video'
        })
      } else {
        console.log('📞 Skipping initiateCall (already sent from Chat)')
      }

      // 7. Wait for calleeReady
      console.log('⏳ Waiting for calleeReady (30s timeout)...')
      const calleeReady = await new Promise(resolve => {
        const timer = setTimeout(() => {
          console.log('⏰ calleeReady TIMEOUT after 30s')
          resolve(false)
        }, 30000)
        socket.once('calleeReady', (data) => { 
          console.log('✅ calleeReady received from', data.fromUserId)
          clearTimeout(timer)
          resolve(true)
        })
      })

      if (!calleeReady) {
        console.log('❌ Callee did not respond, aborting')
        doCleanup()
        isInitiating.current = false
        alert('User did not respond to the call.')
        return
      }

      // 8. Send offer (FINAL GUARD)
      if (offerSent.current) {
        console.log('⚠️ Offer already sent, skipping')
        isInitiating.current = false
        return
      }

      offerSent.current = true
      socket.emit('offer', { roomId, offer, fromUserId: user._id, toUserId: otherUser._id })
      console.log('📤 Offer sent successfully to', otherUser._id)
      
      stopCallingTone()
      setStatus('ringing')
      
      // UNLOCK after successful offer send
      isInitiating.current = false
      console.log('🔓 Call initiation UNLOCKED')
      
    } catch (err) {
      console.error('❌ startCall ERROR:', err.name, err.message)
      isInitiating.current = false // UNLOCK on error
      offerSent.current = false // Reset so user can retry
      doCleanup()
      
      if (err.name === 'NotAllowedError') {
        alert('Camera/microphone permission denied. Please allow access and try again.')
      } else {
        alert('Failed to start call: ' + err.message)
      }
    }
  }, [otherUser, user, roomId, buildPC, getLocalStream, doCleanup, isCaller, audioOnly])

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
            visibility: isConnected ? 'visible' : 'hidden',
          }}
        />
      )}
      {/* Hidden audio element for voice call — plays remote audio */}
      {audioOnly && (
        <audio
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ display: 'none' }}
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

      {/* ── TAP TO HEAR — shown when autoplay blocked ──────────────────── */}
      {autoplayBlocked && isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
            zIndex: 40,
          }}
        >
          <button
            onClick={unlockAudio}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 50,
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              border: 'none', color: 'white', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(245,158,11,0.5)',
              animation: 'pulse 1.5s infinite',
            }}
          >
            🔊 Tap to hear audio
          </button>
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
