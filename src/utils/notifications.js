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
    // Strip icon/badge to avoid 404 on missing logo.png
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
    // No icon — logo.png doesn't exist in public folder
  })
}

// Play notification sound
export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {}) // silently ignore if file missing or autoplay blocked
  } catch (error) {
    // Sound not available — non-fatal
  }
}
