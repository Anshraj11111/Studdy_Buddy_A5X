# Video Call & Voice Call — Complete Technical Documentation

**Project:** Studdy Buddy A5x  
**Stack:** React (frontend) + Node.js/Express (backend) + Socket.IO (signaling) + WebRTC (peer-to-peer media)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technologies Used](#2-technologies-used)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Files Involved](#4-files-involved)
5. [How a Call Starts — Step by Step](#5-how-a-call-starts--step-by-step)
6. [ICE / STUN / TURN Servers](#6-ice--stun--turn-servers)
7. [WebRTC Peer Connection Setup](#7-webrtc-peer-connection-setup)
8. [Socket.IO Events Reference](#8-socketio-events-reference)
9. [Voice Call vs Video Call — Differences](#9-voice-call-vs-video-call--differences)
10. [Screen Sharing](#10-screen-sharing)
11. [Incoming Call Flow (Callee Side)](#11-incoming-call-flow-callee-side)
12. [Call Cleanup & Error Handling](#12-call-cleanup--error-handling)
13. [Notifications & Ringtones](#13-notifications--ringtones)
14. [State Machine — Call Status](#14-state-machine--call-status)
15. [URL Parameters](#15-url-parameters)
16. [Known Issues & Safeguards](#16-known-issues--safeguards)

---

## 1. Overview

Studdy Buddy uses **WebRTC** for peer-to-peer audio/video communication between students. A **Node.js + Socket.IO backend** acts as the **signaling server** — it never touches the media stream, it only relays the connection negotiation messages (offer, answer, ICE candidates) between the two browsers. Once the connection is established, audio/video flows **directly browser-to-browser**.

Two call types are supported:
- **Video Call** — camera + microphone, displayed as full-screen video
- **Voice Call (Audio Only)** — microphone only, displayed as a calling screen with avatar

---

## 2. Technologies Used

| Technology | Purpose |
|---|---|
| **WebRTC** (`RTCPeerConnection`) | Peer-to-peer audio/video streaming |
| **Socket.IO** | Signaling — relays offer/answer/ICE between peers |
| **getUserMedia** | Captures local camera and microphone |
| **STUN servers** (Google) | Helps discover public IP when behind a NAT |
| **TURN servers** (Metered.ca / Cloudflare) | Relay fallback when direct P2P is blocked |
| **Web Audio API** | Ringtone and calling tone generation (no external files) |
| **Browser Notification API** | Shows incoming call notification |
| **React + Framer Motion** | UI rendering and animations |

---

## 3. Architecture Diagram

```
USER A (Caller)                    SIGNALING SERVER              USER B (Callee)
                                   (Socket.IO backend)
     Chat page
     Click "Call" button
          |
          | socket.emit('initiateCall')  ──────────────────>  IncomingCallModal
          |                                                    shows on B's screen
          |                                                    B clicks "Accept"
          |                                                         |
          | <─────────────────  socket.emit('calleeReady')  ──────|
          |
     Navigate to /video-call/:roomId?caller=true
          |
     getLocalStream() — opens camera/mic
          |
     buildPC() — creates RTCPeerConnection
          |
     createOffer()
          |
          | socket.emit('offer')  ──────────────────────────>  B navigates to
          |                                                     /video-call/:roomId?autoStart=true
          |                                                          |
          |                                                     getLocalStream()
          |                                                     buildPC()
          |                                                     setRemoteDescription(offer)
          |                                                     createAnswer()
          |
          | <───────────────────  socket.emit('answer')  ────────|
          |
     setRemoteDescription(answer)
          |
          | socket.emit('iceCandidate')  <──────────────────>  socket.emit('iceCandidate')
          | (exchanged both ways)
          |
     ICE connection established
     P2P media stream flows directly
     (no server involved after this point)
```

---

## 4. Files Involved

### Frontend

| File | Role |
|---|---|
| `src/pages/Chat.jsx` | Initiates call — "Call" and "Video" buttons |
| `src/pages/VideoCall.jsx` | Main call page — WebRTC logic, UI, screen share |
| `src/components/IncomingCallModal.jsx` | Global overlay — shows for all incoming calls |
| `src/components/CallEndFeedbackModal.jsx` | Post-call feedback popup |
| `src/services/socket.js` | Socket.IO client setup and helper functions |
| `src/utils/notifications.js` | Ringtone, calling tone, browser notifications |

### Backend

| File | Role |
|---|---|
| `src/app.js` | Registers `/api/ice-servers` endpoint |
| `src/sockets/chat.socket.js` | Handles all Socket.IO signaling events |

---

## 5. How a Call Starts — Step by Step

### Phase 1 — Caller initiates (Chat.jsx)

1. User is on the Chat page (`/chat/:roomId`)
2. They click **"Call"** (audio) or **"Video"** button
3. `initiateCall(callType)` is called:
   - Emits `initiateCall` via socket to the other user
   - Plays an outgoing **calling tone** (Web Audio API)
   - Navigates to `/video-call/:roomId?caller=true&audioOnly=true` (voice) or `?caller=true` (video)

```js
// Chat.jsx — initiateCall()
socket.emit('initiateCall', {
  roomId,
  fromUserId: user._id,
  toUserId: otherUser._id,
  callType,   // 'audio' or 'video'
})
navigate(`/video-call/${roomId}?caller=true${audioParam}`)
```

### Phase 2 — Callee receives (IncomingCallModal.jsx)

1. `IncomingCallModal` is mounted globally in `App.jsx` — always listening
2. It receives the `incomingCall` socket event
3. Shows a full-screen modal with Accept / Decline buttons
4. Starts a **ringtone** loop (Web Audio API)
5. Auto-rejects after **30 seconds** if unanswered
6. On Accept → navigates to `/video-call/:roomId?autoStart=true&audioOnly=true`

### Phase 3 — VideoCall page loads (both users)

Both users now land on `/video-call/:roomId` with different URL params:
- **Caller**: `?caller=true` 
- **Callee**: `?autoStart=true`

The page:
1. Fetches room data (who is the other user)
2. Calls `getLocalStream()` — requests camera/mic permission
3. Fetches fresh ICE servers from backend (`/api/ice-servers`)
4. Based on role:
   - **Callee** emits `calleeReady` to signal it's ready
   - **Caller** waits for `calleeReady`, then sends the WebRTC offer

### Phase 4 — WebRTC Handshake

```
Caller                              Callee
  |                                    |
  |  <─── socket: calleeReady ────────|
  |                                    |
buildPC()                           buildPC()
createOffer()                       [waiting]
setLocalDescription(offer)
  |                                    |
  |  ──── socket: offer ──────────────>|
  |                                    |
  |                              setRemoteDescription(offer)
  |                              createAnswer()
  |                              setLocalDescription(answer)
  |                                    |
  |  <──── socket: answer ────────────|
  |                                    |
setRemoteDescription(answer)      [done]
  |                                    |
  | <── socket: iceCandidate ─────────>| (exchanged both ways)
  |                                    |
  P2P CONNECTED — media flows directly
```

---

## 6. ICE / STUN / TURN Servers

ICE (Interactive Connectivity Establishment) is how WebRTC finds a network path between two peers.

### How it works

1. On component mount, VideoCall.jsx fetches **fresh ICE server credentials** from backend:
   ```
   GET /api/ice-servers
   ```
2. The backend tries in priority order:
   - **Metered.ca TURN** — fetches fresh credentials via API key
   - **Cloudflare TURN** — generates credentials via HMAC-SHA256
   - **Static fallback** — hardcoded Metered.ca credentials

3. A fallback ICE config is used if the fetch fails (defined in `FALLBACK_ICE`)

### STUN vs TURN

| Type | Purpose | When used |
|---|---|---|
| **STUN** | Discover public IP/port | Most cases (home networks, WiFi) |
| **TURN** | Relay traffic through server | When direct connection blocked (corporate firewalls, symmetric NAT) |

### ICE Config Example

```js
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:in.relay.metered.ca:80',
        'turn:in.relay.metered.ca:443',
        'turns:in.relay.metered.ca:443?transport=tcp',
      ],
      username: '<dynamic>',
      credential: '<dynamic>',
    }
  ],
  iceCandidatePoolSize: 10,  // pre-gather 10 candidates for faster connect
  iceTransportPolicy: 'all',
}
```

---

## 7. WebRTC Peer Connection Setup

### `buildPC(toUserId)` — creates RTCPeerConnection

```js
const pc = new RTCPeerConnection(iceConfigRef.current)
```

Three event handlers are set up:

**`pc.ontrack`** — fires when remote media arrives
```js
pc.ontrack = (e) => {
  const stream = e.streams[0]
  attachRemoteStream(stream)  // assigns to <video> or <audio> element
}
```

**`pc.onicecandidate`** — fires when local ICE candidates are ready
```js
pc.onicecandidate = (e) => {
  if (!e.candidate) return
  socket.emit('iceCandidate', {
    roomId, candidate: e.candidate, fromUserId, toUserId
  })
}
```

**`pc.onconnectionstatechange`** — monitors connection health
- `connected` → update UI to "Connected"
- `failed` → call `pc.restartIce()` immediately
- `disconnected` → wait 3s then restart ICE

**`pc.oniceconnectionstatechange`** — additional ICE monitoring
- `failed` → restart ICE immediately
- `disconnected` → wait 2s then restart ICE

### ICE Restart (Auto-Recovery)

If the connection drops, the code automatically calls `pc.restartIce()` which triggers a new ICE negotiation without ending the call. This handles network changes (WiFi → mobile, etc.).

---

## 8. Socket.IO Events Reference

### Events emitted by client

| Event | When emitted | Payload |
|---|---|---|
| `initiateCall` | Caller clicks Call/Video button | `{roomId, fromUserId, toUserId, callType}` |
| `calleeReady` | Callee loaded VideoCall page | `{roomId, fromUserId, toUserId}` |
| `offer` | Caller sends WebRTC offer | `{roomId, offer, fromUserId, toUserId}` |
| `answer` | Callee sends WebRTC answer | `{roomId, answer, fromUserId, toUserId}` |
| `iceCandidate` | Both sides during ICE gathering | `{roomId, candidate, fromUserId, toUserId}` |
| `callRejected` | User declines/rejects call | `{roomId, fromUserId, toUserId}` |
| `callAccepted` | Call answered | `{roomId}` |
| `callEnded` | User clicks "End Call" | `{roomId, fromUserId, toUserId}` |
| `screenShareStarted` | User starts screen share | `{roomId, fromUserId, toUserId}` |
| `screenShareStopped` | User stops screen share | `{roomId, fromUserId, toUserId}` |

### Events received by client

| Event | Who receives | What it triggers |
|---|---|---|
| `incomingCall` | Callee | Shows `IncomingCallModal` |
| `calleeReady` | Caller | Sends WebRTC offer |
| `offer` | Callee | Processes offer, creates answer |
| `answer` | Caller | Sets remote description |
| `iceCandidate` | Both | Adds ICE candidate to PC |
| `callRejected` | Caller | Shows "rejected" status, cleanup |
| `callAccepted` | Caller | Stops calling tone |
| `callEnded` | Both | Calls `doCleanup()` |
| `screenShareStarted` | Other user | Shows "sharing screen" badge |
| `screenShareStopped` | Other user | Removes badge |

---

## 9. Voice Call vs Video Call — Differences

### Video Call (`?audioOnly=false`)

- `getUserMedia({ video: true, audio: true })`
- Tries 4 progressive constraints (1280px → 640px → basic → camera only)
- Remote stream → `<video>` element (full screen)
- Local stream → `<video>` element (picture-in-picture, top-left, 140×105px, mirrored)
- Shows: mic toggle, camera toggle, screen share button, fullscreen

### Voice Call (`?audioOnly=true`)

- `getUserMedia({ video: false, audio: { echoCancellation, noiseSuppression, autoGainControl } })`
- Remote stream → hidden `<audio>` element (same ref as video)
- Local stream → invisible `<video>` (1×1px, hidden)
- Shows: animated avatar with pulsing rings, "Voice call connected" status
- Shows: mic toggle, optional "Switch to video" button
- Does NOT show: camera, screen share

---

## 10. Screen Sharing

Only available in video calls. Uses `getDisplayMedia`.

```js
const startScreenShare = async () => {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always' }, audio: false
  })
  // Save original camera stream
  origStreamRef.current = localStreamRef.current
  // Replace video track in peer connection
  const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
  await sender.replaceTrack(screenStream.getVideoTracks()[0])
  // Update local preview to show screen
  localVideoRef.current.srcObject = screenStream
  // Notify other user
  socket.emit('screenShareStarted', { roomId, fromUserId, toUserId })
}
```

When screen share ends (user clicks stop or browser stop button):
- Restores original camera track via `replaceTrack()`
- Emits `screenShareStopped`

---

## 11. Incoming Call Flow (Callee Side)

```
IncomingCallModal (global, always mounted)
         |
    socket: 'incomingCall' received
         |
    setIncomingCall({ roomId, caller, callType })
    startRingtone()
    showCallNotification()
    setTimeout(autoReject, 30000)
         |
    User clicks ACCEPT
         |
    stopRingtone()
    navigate('/video-call/:roomId?autoStart=true[&audioOnly=true]')
         |
    VideoCall.jsx loads
         |
    isCallee = searchParams.get('autoStart') === 'true'  → true
         |
    getLocalStream()
    waitForIce()
         |
    socket.emit('calleeReady', { roomId, fromUserId, toUserId })
         |
    [waits for 'offer' event from caller]
         |
    socket: 'offer' received
         |
    handleOffer(data)
      → buildPC()
      → setRemoteDescription(offer)
      → createAnswer()
      → socket.emit('answer', ...)
         |
    ICE candidates exchanged
         |
    CONNECTED
```

---

## 12. Call Cleanup & Error Handling

### `doCleanup()` — called when call ends for any reason

```js
const doCleanup = () => {
  origStreamRef.current?.getTracks().forEach(t => t.stop())
  pcRef.current?.close()
  localStreamRef.current?.getTracks().forEach(t => t.stop())
  // Clear all video/audio elements
  localVideoRef.current.srcObject = null
  remoteVideoRef.current.srcObject = null
  // Reset all refs and state
  pendingCandidates.current = []
  calleeReadySent.current = false
  offerSent.current = false
  stopCallingTone()
  stopRingtone()
  setStatus('idle')
}
```

### Race Condition Guards

Multiple guards prevent duplicate calls or concurrent initiation:

```js
const isInitiating    = useRef(false)  // prevents concurrent startCall()
const offerSent       = useRef(false)  // prevents sending offer twice
const calleeReadySent = useRef(false)  // prevents emitting calleeReady twice
const callEndedSent   = useRef(false)  // prevents emitting callEnded twice
```

### Error Scenarios

| Error | Handling |
|---|---|
| Camera/mic denied | `NotAllowedError` → alert message, cleanup |
| Camera unavailable | Falls back through 4 constraint sets; proceeds without video if all fail |
| Callee doesn't answer in 30s | Auto-reject, alert "User did not respond" |
| ICE fails | `pc.restartIce()` automatically triggered |
| Connection drops | Automatic ICE restart after 2-3s |
| Offer sent before callee ready | Stored in `pendingOffer.current`, flushed when ready |
| ICE candidates arrive before remote description | Queued in `pendingCandidates.current`, flushed after `setRemoteDescription` |

---

## 13. Notifications & Ringtones

All sounds use the **Web Audio API** — no external files needed.

### Ringtone (incoming call)

```js
startRingtone()  // starts looping beep pattern: beep-beep ... pause ... repeat
stopRingtone()   // stops the audio context
```

Pattern: two quick beeps (880Hz → 660Hz), 2.5s cycle, loops indefinitely.

### Calling Tone (outgoing call)

```js
startCallingTone()  // low hum at 440Hz, repeats every 2s
stopCallingTone()   // stops when call is answered or rejected
```

### Browser Notifications

Uses the **Notification API**:
```js
showCallNotification(callerName)
// → Notification: "Incoming call from [name]"
// → requireInteraction: true (won't auto-dismiss)
```

Permission is requested when the user first opens any chat page.

---

## 14. State Machine — Call Status

The `status` state in VideoCall.jsx tracks the call lifecycle:

```
idle
  │
  └─ warming (camera/mic initializing)
       │
       ├─ calling (caller: waiting for callee to pick up)
       │    │
       │    └─ ringing (offer sent, waiting for answer)
       │         │
       │         └─ connecting (answer received, ICE in progress)
       │              │
       │              └─ connected ✅ (call active)
       │
       └─ ringing (callee: calleeReady sent, offer processing)
            │
            └─ connecting → connected ✅
```

| Status | Label shown | Who |
|---|---|---|
| `idle` | "Ready to call" | Anyone |
| `warming` | "Starting camera..." | Both |
| `calling` | "Calling..." | Caller |
| `ringing` | "Ringing..." (caller) / "Connecting..." (callee) | Both |
| `connecting` | "Connected" | Both |
| `connected` | "● Connected" | Both |

---

## 15. URL Parameters

The `/video-call/:roomId` page reads these query params:

| Parameter | Value | Meaning |
|---|---|---|
| `caller` | `true` | This user initiated the call from Chat.jsx |
| `autoStart` | `true` | This user is the callee, accepted via IncomingCallModal |
| `audioOnly` | `true` | Voice call only (no video) |

Examples:
```
/video-call/abc123?caller=true           → video call, caller side
/video-call/abc123?caller=true&audioOnly=true  → voice call, caller side
/video-call/abc123?autoStart=true        → video call, callee side
/video-call/abc123?autoStart=true&audioOnly=true → voice call, callee side
```

---

## 16. Known Issues & Safeguards

### Autoplay Policy
Browsers block audio autoplay without user interaction. If blocked:
- `autoplayBlocked` state is set to `true`
- A "Tap to hear audio" button appears — clicking it unlocks audio

### Pending Offer
If the `offer` socket event arrives before the `otherUser` data is loaded from the API:
- It's stored in `pendingOffer.current`
- Processed in `useEffect` once `otherUser` is loaded

### Socket Reconnection
If the socket disconnects and reconnects during a call:
- The `attach()` function is re-called on `socket.on('connect', attach)`
- All listeners are re-registered
- The `joinRoom` event is re-emitted

### ICE Pre-warming
`iceCandidatePoolSize: 10` tells the browser to pre-gather 10 ICE candidates before the offer is created. This significantly reduces connection time.

### Multiple Call Guard
The `isInitiating` ref ensures that even if `calleeReady` or button click fires multiple times, only one call setup proceeds at a time.

---

## Summary

| Component | What it does |
|---|---|
| **Chat.jsx** | Entry point — emits `initiateCall`, navigates to VideoCall |
| **IncomingCallModal.jsx** | Always-on receiver — shows ring UI, navigates on accept |
| **VideoCall.jsx** | All WebRTC logic — ICE, offer/answer, tracks, cleanup |
| **socket.js** | Socket client — relays all signaling events |
| **notifications.js** | Web Audio ringtones, browser push notifications |
| **Backend /api/ice-servers** | Fetches fresh TURN credentials dynamically |
| **Backend chat.socket.js** | Relays socket events between the two users |
