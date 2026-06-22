// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

// Show notification
export const showNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    const { icon, badge, ...safeOptions } = options
    const notification = new Notification(title, safeOptions)
    setTimeout(() => notification.close(), 5000)
    return notification
  }
}

// Show message notification
export const showMessageNotification = (senderName, message) => {
  return showNotification(`New message from ${senderName}`, {
    body: message,
    tag: 'message',
    requireInteraction: false,
  })
}

// Show call notification
export const showCallNotification = (callerName) => {
  return showNotification(`Incoming call from ${callerName}`, {
    body: 'Click to answer',
    tag: 'call',
    requireInteraction: true,
  })
}

// Play notification sound
export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch (error) {}
}

// ── Ringtone for incoming calls (loops until stopped) ────────────────────────
let _ringtoneAudio = null

export const startRingtone = () => {
  stopRingtone()
  try {
    // Generate a ringtone using Web Audio API — no external file needed
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    let stopped = false

    const playBeep = (time) => {
      if (stopped) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, time)
      osc.frequency.setValueAtTime(660, time + 0.15)
      gain.gain.setValueAtTime(0.3, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4)
      osc.start(time)
      osc.stop(time + 0.4)
    }

    // Ring pattern: beep beep ... pause ... repeat
    let t = ctx.currentTime
    const scheduleRing = () => {
      if (stopped) return
      playBeep(t)
      playBeep(t + 0.5)
      t += 2.5
      setTimeout(() => scheduleRing(), 2500)
    }
    scheduleRing()

    _ringtoneAudio = { stop: () => { stopped = true; ctx.close() } }
  } catch (e) {
    // fallback: silent
    _ringtoneAudio = { stop: () => {} }
  }
}

export const stopRingtone = () => {
  if (_ringtoneAudio) {
    _ringtoneAudio.stop()
    _ringtoneAudio = null
  }
}

// ── Outgoing call sound (single beep tone) ───────────────────────────────────
let _callingAudio = null

export const startCallingTone = () => {
  stopCallingTone()
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    let stopped = false

    const playTone = (time) => {
      if (stopped) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 440
      gain.gain.setValueAtTime(0.15, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8)
      osc.start(time)
      osc.stop(time + 0.8)
    }

    let t = ctx.currentTime
    const schedule = () => {
      if (stopped) return
      playTone(t)
      t += 2
      setTimeout(() => schedule(), 2000)
    }
    schedule()

    _callingAudio = { stop: () => { stopped = true; ctx.close() } }
  } catch (e) {
    _callingAudio = { stop: () => {} }
  }
}

export const stopCallingTone = () => {
  if (_callingAudio) {
    _callingAudio.stop()
    _callingAudio = null
  }
}

