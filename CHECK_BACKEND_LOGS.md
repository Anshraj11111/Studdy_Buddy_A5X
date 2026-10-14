# 🔍 Backend Console Check Karo

## Jab student doubt post kare, backend console mein ye logs aane chahiye:

```
📢 [Doubt Notification] Starting notification process...
📢 [Doubt Notification] Found 1 mentors: ["Anshraj"]
📢 [Doubt Notification] ✅ Created 1 in-app notifications
📢 [Doubt Notification] Emitting socket to room: user:6abc123...
📢 [Doubt Notification] ✅ Emitted 1 socket notifications
📢 [Doubt Notification] Sending web push to 1 mentors...
📢 [Doubt Notification] ✅ Web push: 0 success, 1 failed
✅ Sent doubt notifications to 1 mentors (in-app + socket + push)
```

## Agar ye logs NAHI aa rahe:

### Option 1: Backend restart karo
```powershell
# Backend terminal mein:
Ctrl+C (stop backend)
npm start (restart)
```

### Option 2: Check karo backend running hai ya nahi
```powershell
netstat -ano | findstr :5000
```

## Frontend Browser Console Check:

Browser console (F12) mein check karo:

### Socket connected hai?
```
[Socket] Connected
```

### Notification receive hua?
```
[Socket] notification received: {...}
```

### Agar kuch nahi dikh raha:
- Browser console filter "notification" ya "socket" pe set karo
- Verbose/All levels select karo
