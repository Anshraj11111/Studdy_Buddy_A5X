# 🔔 Doubt Notification Testing Guide

## 🎯 Goal
Test if mentors receive notifications when students post doubts.

## ✅ Prerequisites

1. **Backend Running**: Port 5000
2. **Frontend Running**: Port 3000 or 3001
3. **Two Browser Windows**:
   - Window 1: Student account
   - Window 2: Mentor account (with code H5)

## 📋 Test Steps

### Step 1: Login as Mentor
```
1. Open browser window 1
2. Go to http://localhost:3000
3. Click "Login"
4. Enter mentor credentials (use code H5 at signup)
5. Navigate to "Doubts" or "Mentor Dashboard"
6. Keep this window OPEN and VISIBLE
```

### Step 2: Login as Student (Different Browser/Incognito)
```
1. Open browser window 2 (or incognito mode)
2. Go to http://localhost:3000
3. Login as student account
4. Navigate to "Doubts" page
```

### Step 3: Post a Doubt (as Student)
```
1. Click "Post Doubt" or "Ask Question"
2. Fill in:
   - Title: "Test notification - JavaScript async/await"
   - Description: "How does async/await work in JavaScript?"
   - Topic: "JavaScript" or "Programming"
3. Click "Submit" or "Post"
4. Wait for success message
```

### Step 4: Check Mentor Window
**Expected Results:**

#### ✅ In-App Notification (Socket.IO)
- **Bell icon** should show red dot or count increase
- **Notification dropdown** should show new notification:
  ```
  🆘 New Doubt Posted
  Test notification - JavaScript async/await
  ```

#### ✅ Browser Notification (Web Push)
**Note:** Only works in PRODUCTION mode
- Desktop notification appears (if permission granted)
- Shows: "🆘 New Doubt Posted"
- Body: Doubt title

#### ✅ Mentor Dashboard
- "Pending" count increases
- "Total Doubts" count increases
- New doubt appears in list

## 🔍 Debugging - Backend Logs

### Check Console Output
When doubt is posted, backend console should show:

```
📢 [Doubt Notification] Starting notification process...
📢 [Doubt Notification] Found 1 mentors: ["Mentor Name"]
📢 [Doubt Notification] ✅ Created 1 in-app notifications
📢 [Doubt Notification] Emitting socket to room: user:6abc123...
📢 [Doubt Notification] ✅ Emitted 1 socket notifications
📢 [Doubt Notification] Sending web push to 1 mentors...
📢 [Doubt Notification] ✅ Web push: 0 success, 1 failed (dev mode)
✅ Sent doubt notifications to 1 mentors (in-app + socket + push)
```

### What Each Log Means:

1. **Found X mentors**: Database query successful
2. **Created X notifications**: Saved to database (TERTIARY)
3. **Emitting socket to room**: Real-time notification sent
4. **Web push: 0 success**: Normal in DEV mode (no service worker)

## ❌ Common Issues

### Issue 1: "Found 0 mentors"
**Problem:** No mentor accounts exist
**Fix:** Create mentor account with code H5

### Issue 2: "Socket not emitting"
**Problem:** Mentor not connected to socket
**Fix:** 
- Refresh mentor page
- Check browser console for socket errors
- Verify backend socket.io is running

### Issue 3: "Web push: 0 success"
**Expected in DEV mode:** Service worker only registers in production
**Production fix:**
1. Build frontend: `npm run build`
2. Serve production build
3. Mentor must grant notification permission

### Issue 4: Bell icon doesn't update
**Problem:** Frontend not listening to socket events
**Fix:**
- Check browser console: `[Socket] notification received`
- Verify App.jsx has `onNotification()` handler
- Check notification store is updating

## 🔬 Manual Database Check

### Check if notification was created:
```javascript
// In MongoDB PRIMARY database
db.notifications.find({ type: 'doubt' }).sort({ createdAt: -1 }).limit(1)
```

### Check mentor's userId:
```javascript
// In MongoDB PRIMARY database
db.users.find({ role: 'mentor' }).project({ _id: 1, name: 1, email: 1 })
```

### Check push subscriptions:
```javascript
// In MongoDB PRIMARY database
db.pushsubscriptions.find({ user: ObjectId("mentorUserId") }).count()
```

## ✅ Success Criteria

**All must pass:**
- [x] Backend logs show "Found 1 mentors"
- [x] Backend logs show "Created 1 notifications"
- [x] Backend logs show "Emitted 1 socket notifications"
- [x] Mentor's bell icon shows notification count
- [x] Mentor can see doubt in notifications dropdown
- [x] Mentor dashboard "Pending" count increases
- [x] New doubt visible in doubt list

**Production only:**
- [ ] Desktop browser notification appears (requires HTTPS + service worker)

## 🎯 Quick Test Command

Run this to check notification system:
```bash
cd backend
node testDoubtNotification.js
```

## 📊 Expected Output

### Development Mode:
✅ In-app notification: **Works**
✅ Socket.IO real-time: **Works**
❌ Web Push notification: **Not available** (service worker DEV disabled)

### Production Mode:
✅ In-app notification: **Works**
✅ Socket.IO real-time: **Works**
✅ Web Push notification: **Works** (if permission granted)

---

## 🚀 Ready for Testing!

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Follow steps above
4. Check mentor window for notifications

**Good luck! 🎉**
