import { useEffect, useRef, useState } from 'react'
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
  const [callActive, setCallActive] = useState(false)
  const [incomingCall, setIncomingCall] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false)
  const hasAutoStarted = useRef(false)
  const originalStreamRef = useRef(null)
  const pendingCandidates = useRef([])
  const screenShareEventHandled = useRef(false)
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

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true)
        const res = await roomAPI.getById(roomId)
        const roomData = res.data.data?.room
        
        setRoom(roomData)
        
        // Determine the other user
        const userId = user._id
        const student1Id = roomData.student1?._id || roomData.student1
        
        if (String(userId) === String(student1Id)) {
          setOtherUser(roomData.student2)
        } else {
          setOtherUser(roomData.student1)
        }
        
        // Request notification permission
        requestNotificationPermission()
      } catch (error) {
        console.error('Failed to fetch room data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchRoomData()
    }
  }, [roomId, user])

  // Auto-start call if coming from accept
  useEffect(() => {
    if (autoStart && otherUser && !hasAutoStarted.current && !loading) {
      hasAutoStarted.current = true
      console.log('🎥 Auto-starting call...')
      setTimeout(() => {
        startCall()
      }, 500)
    }
  }, [autoStart, otherUser, loading])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !otherUser) return

    console.log('🔌 Setting up socket listeners for room:', roomId)

    // Join the room for socket communication
    joinRoom(roomId, user._id)

    const handleIncomingCall = (data) => {
      console.log('📞 Incoming call:', data)
      
      // Only show incoming call popup if we're not already in a call
      // This prevents User 1 from getting a popup when User 2 accepts
      if (!peerConnectionRef.current) {
        setIncomingCall(true)
        
        // Show notification
        showCallNotification(otherUser?.name || 'Someone')
        playNotificationSound()
      } else {
        console.log('📞 Already in call, ignoring incoming call event')
      }
    }

    const handleOffer = async (data) => {
      try {
        console.log('📨 Received offer from:', data.fromUserId)
        
        // Get user media first
        if (!localStreamRef.current) {
          console.log('🎥 Getting user media for answering...')
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })
          localStreamRef.current = stream
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream
          }
        }

        // Create peer connection
        const peerConnection = new RTCPeerConnection(ICE_SERVERS)
        peerConnectionRef.current = peerConnection

        // Add local tracks
        localStreamRef.current.getTracks().forEach((track) => {
          console.log('➕ Adding local track:', track.kind)
          peerConnection.addTrack(track, localStreamRef.current)
        })

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
          console.log('📹 Received remote track:', event.track.kind, event.streams.length)
          if (remoteVideoRef.current && event.streams[0]) {
            console.log('✅ Setting remote stream')
            remoteVideoRef.current.srcObject = event.streams[0]
          }
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('🧊 Sending ICE candidate')
            socket.emit('iceCandidate', {
              roomId,
              candidate: event.candidate,
              fromUserId: user._id,
              toUserId: otherUser._id
            })
          }
        }

        peerConnection.onconnectionstatechange = () => {
          console.log('🔌 Connection state:', peerConnection.connectionState)
          if (peerConnection.connectionState === 'connected') {
            console.log('✅ Peer connection established!')
          }
        }

        peerConnection.oniceconnectionstatechange = () => {
          console.log('🧊 ICE connection state:', peerConnection.iceConnectionState)
        }

        // Set remote description
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
        console.log('✅ Remote description set')

        // Process any pending ICE candidates
        if (pendingCandidates.current.length > 0) {
          console.log(`📦 Processing ${pendingCandidates.current.length} pending ICE candidates`)
          for (const candidate of pendingCandidates.current) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          }
          pendingCandidates.current = []
        }

        // Create and send answer
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        console.log('✅ Answer created')

        socket.emit('answer', {
          roomId,
          answer,
          fromUserId: user._id,
          toUserId: otherUser._id
        })
        console.log('📤 Answer sent')

        setCallActive(true)
        setIncomingCall(false)
      } catch (error) {
        console.error('❌ Error handling offer:', error)
      }
    }

    const handleAnswer = async (data) => {
      try {
        console.log('📨 Received answer from:', data.fromUserId)
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          )
          console.log('✅ Remote description set from answer')

          // Process any pending ICE candidates
          if (pendingCandidates.current.length > 0) {
            console.log(`📦 Processing ${pendingCandidates.current.length} pending ICE candidates`)
            for (const candidate of pendingCandidates.current) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
            }
            pendingCandidates.current = []
          }
        }
      } catch (error) {
        console.error('❌ Error handling answer:', error)
      }
    }

    const handleIceCandidate = async (data) => {
      try {
        console.log('🧊 Received ICE candidate from:', data.fromUserId)
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
          console.log('✅ ICE candidate added')
        } else {
          console.log('📦 Queuing ICE candidate (no remote description yet)')
          pendingCandidates.current.push(data.candidate)
        }
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error)
      }
    }

    const handleCallEnded = () => {
      console.log('📞 Call ended by remote user')
      cleanup()
    }

    const handleScreenShareStarted = (data) => {
      console.log('🖥️ Remote user started screen sharing:', data)
      
      // Prevent duplicate handling
      if (screenShareEventHandled.current) {
        console.log('⚠️ Screen share event already handled, ignoring duplicate')
        return
      }
      
      screenShareEventHandled.current = true
      setRemoteScreenSharing(true)
      
      // Reset flag after 2 seconds to allow future screen shares
      setTimeout(() => {
        screenShareEventHandled.current = false
      }, 2000)
    }

    const handleScreenShareStopped = (data) => {
      console.log('🖥️ Remote user stopped screen sharing:', data)
      screenShareEventHandled.current = false
      setRemoteScreenSharing(false)
    }

    socket.on('incomingCall', handleIncomingCall)
    socket.on('offer', handleOffer)
    socket.on('answer', handleAnswer)
    socket.on('iceCandidate', handleIceCandidate)
    socket.on('callEnded', handleCallEnded)
    socket.on('screenShareStarted', handleScreenShareStarted)
    socket.on('screenShareStopped', handleScreenShareStopped)

    return () => {
      console.log('🧹 Cleaning up socket listeners')
      socket.off('incomingCall', handleIncomingCall)
      socket.off('offer', handleOffer)
      socket.off('answer', handleAnswer)
      socket.off('iceCandidate', handleIceCandidate)
      socket.off('callEnded', handleCallEnded)
      socket.off('screenShareStarted', handleScreenShareStarted)
      socket.off('screenShareStopped', handleScreenShareStopped)
    }
  }, [roomId, user, otherUser])

  const cleanup = () => {
    console.log('🧹 Cleaning up media streams and peer connection...')
    
    // Reset screen share flags
    screenShareEventHandled.current = false
    
    // Stop screen sharing if active
    if (screenSharing && localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop())
    }
    
    // Stop original stream if exists
    if (originalStreamRef.current) {
      originalStreamRef.current.getTracks().forEach((track) => track.stop())
      originalStreamRef.current = null
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    
    setCallActive(false)
    setScreenSharing(false)
    setRemoteScreenSharing(false)
    pendingCandidates.current = []
  }

  const startCall = async () => {
    try {
      console.log('🎥 Starting call...')
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection(ICE_SERVERS)
      peerConnectionRef.current = peerConnection

      // Add local tracks
      stream.getTracks().forEach((track) => {
        console.log('➕ Adding local track:', track.kind)
        peerConnection.addTrack(track, stream)
      })

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        console.log('📹 Received remote track:', event.track.kind, event.streams.length)
        if (remoteVideoRef.current && event.streams[0]) {
          console.log('✅ Setting remote stream')
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate')
          const socket = getSocket()
          socket.emit('iceCandidate', {
            roomId,
            candidate: event.candidate,
            fromUserId: user._id,
            toUserId: otherUser._id
          })
        }
      }

      peerConnection.onconnectionstatechange = () => {
        console.log('🔌 Connection state:', peerConnection.connectionState)
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ Peer connection established!')
        }
      }

      peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', peerConnection.iceConnectionState)
      }

      // Create and send offer
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      console.log('✅ Offer created')
      
      const socket = getSocket()
      socket.emit('offer', {
        roomId,
        offer,
        fromUserId: user._id,
        toUserId: otherUser._id
      })
      console.log('📤 Offer sent')

      socket.emit('initiateCall', {
        roomId,
        fromUserId: user._id,
        toUserId: otherUser._id
      })

      setCallActive(true)
      setIncomingCall(false)
    } catch (error) {
      console.error('❌ Error starting call:', error)
      alert('Failed to access camera/microphone. Please check permissions.')
    }
  }

  const acceptIncomingCall = () => {
    // Just start the call - the offer will be handled by the socket listener
    startCall()
  }

  const rejectIncomingCall = () => {
    setIncomingCall(false)
    const socket = getSocket()
    socket.emit('callRejected', {
      roomId,
      fromUserId: user._id,
      toUserId: otherUser._id
    })
  }

  const endCurrentCall = () => {
    const socket = getSocket()
    socket.emit('callEnded', {
      roomId,
      fromUserId: user._id,
      toUserId: otherUser?._id
    })
    
    cleanup()
    
    // Show feedback modal instead of navigating immediately
    setShowFeedbackModal(true)
  }

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setMicEnabled(!micEnabled)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setVideoEnabled(!videoEnabled)
    }
  }

  const startScreenShare = async () => {
    try {
      // Prevent multiple simultaneous screen share attempts
      if (screenSharing) {
        console.log('⚠️ Already screen sharing, ignoring request')
        return
      }
      
      console.log('🖥️ Starting screen share...')
      
      // Show warning about screen sharing
      const userConfirmed = window.confirm(
        'Screen Sharing Tip:\n\n' +
        'If you select "Entire Screen", the video call window will appear in your shared screen, creating a mirror effect.\n\n' +
        'To avoid this:\n' +
        '• Select a specific "Window" or "Chrome Tab" instead\n' +
        '• Or minimize this video call window before sharing\n\n' +
        'Continue with screen sharing?'
      )
      
      if (!userConfirmed) {
        return
      }
      
      // Get screen stream with specific constraints to avoid issues
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor', // Prefer entire monitor
        },
        audio: false,
        preferCurrentTab: false, // Don't prefer current tab
      })

      // Save original stream
      if (!originalStreamRef.current) {
        originalStreamRef.current = localStreamRef.current
      }

      // Replace video track in peer connection
      const screenTrack = screenStream.getVideoTracks()[0]
      
      // Check if we already have a peer connection
      if (!peerConnectionRef.current) {
        console.log('⚠️ No peer connection available for screen sharing')
        screenTrack.stop()
        return
      }
      
      const sender = peerConnectionRef.current
        .getSenders()
        .find((s) => s.track?.kind === 'video')

      if (sender) {
        await sender.replaceTrack(screenTrack)
        console.log('✅ Screen track replaced in peer connection')
      }

      // Update local video to show screen
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream
      }

      // Update local stream ref
      localStreamRef.current = screenStream

      setScreenSharing(true)

      // Handle when user stops sharing via browser UI
      screenTrack.onended = () => {
        console.log('🖥️ Screen sharing stopped by user')
        stopScreenShare()
      }

      // Notify other user - only emit once
      const socket = getSocket()
      console.log('🖥️ Emitting screenShareStarted event')
      socket.emit('screenShareStarted', {
        roomId,
        fromUserId: user._id,
        toUserId: otherUser._id,
      })
      console.log('✅ screenShareStarted event emitted')
    } catch (error) {
      console.error('❌ Error starting screen share:', error)
      if (error.name === 'NotAllowedError') {
        console.log('Screen share cancelled by user')
      } else {
        alert('Failed to start screen sharing. Please try again.')
      }
    }
  }

  const stopScreenShare = async () => {
    try {
      console.log('🖥️ Stopping screen share...')

      // Stop screen stream
      if (localVideoRef.current?.srcObject && screenSharing) {
        localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      }

      // Restore original camera stream
      if (originalStreamRef.current) {
        const videoTrack = originalStreamRef.current.getVideoTracks()[0]
        const sender = peerConnectionRef.current
          ?.getSenders()
          .find((s) => s.track?.kind === 'video')

        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
          console.log('✅ Camera track restored in peer connection')
        }

        // Update local video to show camera
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = originalStreamRef.current
        }
        
        localStreamRef.current = originalStreamRef.current
        originalStreamRef.current = null
      }

      setScreenSharing(false)

      // Notify other user
      const socket = getSocket()
      socket.emit('screenShareStopped', {
        roomId,
        fromUserId: user._id,
        toUserId: otherUser._id,
      })
    } catch (error) {
      console.error('❌ Error stopping screen share:', error)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      // Exit fullscreen
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Call End Feedback Modal */}
      <CallEndFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false)
          navigate(`/chat/${roomId}`)
        }}
        roomId={roomId}
        otherUser={otherUser}
      />

      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/chat/${roomId}`)}
            className="p-2 hover:bg-gray-800 rounded-lg transition text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">{otherUser?.name || 'Unknown User'}</h2>
              <p className="text-sm text-gray-400">{room?.topic}</p>
            </div>
          </div>
        </div>
      </div>

      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
        >
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">{otherUser?.name || 'Unknown User'}</h2>
            <p className="text-gray-400 mb-6">Incoming video call...</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={acceptIncomingCall}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
              >
                <Phone size={20} />
                Accept
              </button>
              <button
                onClick={rejectIncomingCall}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
              >
                <PhoneOff size={20} />
                Reject
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex-1 relative">
        {/* Remote Video - Full Screen */}
        <div className="absolute inset-0 bg-gray-900">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!callActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
                  {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <p className="text-white text-xl">{otherUser?.name || 'Unknown User'}</p>
              </div>
            </div>
          )}
          {/* Screen Sharing Indicator for Remote User - Only show if remote is sharing */}
          {remoteScreenSharing && callActive && otherUser && (
            <div 
              key="remote-screen-indicator"
              className="absolute top-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-10"
            >
              <Monitor size={20} />
              <span className="font-medium">{otherUser.name} is sharing screen</span>
            </div>
          )}
        </div>

        {/* Local Video - Small Corner */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-700 z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Screen Sharing Indicator for Local User - Only show if you are sharing */}
          {screenSharing && (
            <div 
              key="local-screen-indicator"
              className="absolute bottom-2 left-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center justify-center gap-1"
            >
              <Monitor size={14} />
              <span>Sharing Screen</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="pb-8 flex justify-center gap-4">
        {!callActive && !autoStart ? (
          <button
            onClick={startCall}
            className="flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full transition shadow-lg text-lg font-medium"
          >
            <Phone size={24} />
            Start Call
          </button>
        ) : callActive ? (
          <>
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full transition shadow-lg ${
                micEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
              } text-white`}
              title={micEnabled ? 'Mute' : 'Unmute'}
            >
              {micEnabled ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition shadow-lg ${
                videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
              } text-white`}
              title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
            <button
              onClick={screenSharing ? stopScreenShare : startScreenShare}
              className={`p-4 rounded-full transition shadow-lg ${
                screenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
              title={screenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {screenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-4 rounded-full transition shadow-lg bg-gray-700 hover:bg-gray-600 text-white"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>
            <button
              onClick={endCurrentCall}
              className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition shadow-lg"
            >
              <PhoneOff size={24} />
              End Call
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
