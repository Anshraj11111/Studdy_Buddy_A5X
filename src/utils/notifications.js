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
    const notification = new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options,
    })

    // Auto close after 5 seconds
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
    audio.play().catch(err => console.log('Could not play sound:', err))
  } catch (error) {
    console.log('Sound not available')
  }
}
