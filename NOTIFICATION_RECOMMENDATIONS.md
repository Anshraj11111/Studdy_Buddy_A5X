# 🔔 Notification System - Recommendations & Missing Features

## ✅ **Currently Working Notifications**

| Feature | Event | Status |
|---------|-------|--------|
| **Doubt System** | Student posts doubt → Mentors notified | ✅ Working |
| **Doubt Reply** | Mentor replies → Student notified | ✅ Working |
| **Feed Like** | Someone likes post → Owner notified | ✅ Working |
| **Feed Comment** | Someone comments → Owner notified | ✅ Working |
| **Feed Mention** | Someone mentions you (@user) → Notified | ✅ Working |

---

## 🎯 **RECOMMENDED: Notifications To Add**

### **Priority 1 - High Impact** (Zaruri hai!)

#### 1. **Broadcast Channel Notifications** 🎙️
**Current Status:** Only socket events, NO proper notifications

**Where to Add:**
- `broadcast.controller.js` → `acceptRequest()` function
- `broadcast.controller.js` → `rejectRequest()` function
- `broadcast.controller.js` → `startStream()` function

**Recommended Notifications:**

| Event | Recipient | Message | Priority |
|-------|-----------|---------|----------|
| **Channel Join Approved** | Student | "Your request to join [Channel] has been approved! 🎉" | 🔴 HIGH |
| **Channel Join Rejected** | Student | "Your request to join [Channel] was not approved" | 🟡 MEDIUM |
| **Live Stream Started** | All Channel Members | "🔴 LIVE: [Mentor] started streaming in [Channel]!" | 🔴 HIGH |
| **New Announcement Posted** | All Channel Members | "📢 New announcement in [Channel]" | 🟡 MEDIUM |

**Why Important:**
- Students won't know if their channel request approved/rejected
- Missing live stream notifications = students miss classes
- Very high engagement feature

---

#### 2. **Quiz Completion Notifications** 📝
**Current Status:** NO notifications at all

**Where to Add:**
- `quiz.controller.js` → `submitQuiz()` function

**Recommended Notifications:**

| Event | Recipient | Message | Priority |
|-------|-----------|---------|----------|
| **Quiz Passed** | Student | "🎉 Congratulations! You passed the quiz with [X]% score!" | 🟢 LOW |
| **Quiz Failed** | Student | "Keep trying! You scored [X]%. Pass mark is [Y]%" | 🟢 LOW |
| **Quiz Milestone** | Student | "🏆 Perfect Score! You got 100% in the quiz!" | 🟢 LOW |

**Why Important:**
- Students get instant feedback
- Gamification + motivation
- Low priority because students already on quiz results page

---

#### 3. **Course Progress Milestones** 🎓
**Current Status:** NO notifications

**Where to Add:**
- `lectureProgress.controller.js` → `updateProgress()` function

**Recommended Notifications:**

| Event | Recipient | Message | Priority |
|-------|-----------|---------|----------|
| **Module Completed** | Student | "🎓 Module completed! [X] is now unlocked!" | 🟡 MEDIUM |
| **Course 50% Complete** | Student | "Halfway there! 🔥 You're 50% done with [Course]" | 🟢 LOW |
| **Course Completed** | Student | "🎉 Course Complete! You finished [Course Name]!" | 🟡 MEDIUM |

**Why Important:**
- Motivational notifications
- Keeps students engaged
- Encourages completion

---

### **Priority 2 - Nice to Have** (Achha hoga agar ho)

#### 4. **Community Post Reply Notifications** 💬
**Current Status:** Only top-level comment notifications work

**Where to Add:**
- `feed.routes.js` → `POST /:id/comment/:commentId/reply` route

**Recommended:**
- When User A replies to User B's comment → User B gets notified
- "User A replied to your comment"

**Why Important:**
- Right now only post owner gets notified
- Person who commented doesn't know someone replied to THEIR comment

---

#### 5. **Mentor Assignment Notifications** 🤝
**Current Status:** Unclear if implemented

**Where to Check:**
- `mentor.controller.js`
- `room.controller.js` (doubt matching)

**Recommended Notifications:**

| Event | Recipient | Message |
|-------|-----------|---------|
| **Matched with Mentor** | Student | "You've been matched with [Mentor] for your doubt!" |
| **Matched with Student** | Mentor | "New student matched: [Student] needs help!" |

---

### **Priority 3 - Optional** (Zarurat nahi, but good to have)

#### 6. **Payment Success/Failure** 💳
**Current Status:** Unclear

**Where to Add:**
- `payment.controller.js`

**Recommended:**
- "Payment successful! Welcome to [Course]" 
- "Payment failed. Please try again"

---

#### 7. **School Channel Messages** 🏫
**Current Status:** Unclear

**Where to Check:**
- `schoolChannel.controller.js`

**Recommended:**
- Teacher posts in school channel → All students notified
- Similar to broadcast but school-specific

---

#### 8. **General Group Chat** 💬
**Current Status:** Unclear

**Where to Check:**
- `generalGroup.controller.js`

**Recommended:**
- New message in group → All members notified
- Someone mentions you in group → You get notified

---

## 🚨 **MUST AVOID Notifications** (Mat lagao!)

### ❌ **Don't Add Notifications For:**

1. **Lecture Progress Updates** ❌
   - Too frequent (every 5 seconds!)
   - Will spam users
   - No value

2. **Every Single Message in Chat** ❌
   - Chat already has real-time updates
   - Too noisy
   - Users will disable notifications

3. **Login/Logout Events** ❌
   - Not useful
   - Privacy concerns

4. **Profile View/Visit** ❌
   - Creepy
   - Not valuable

---

## 📊 **Implementation Priority**

### **Phase 1 - MUST HAVE** (Abhi implement karo)
1. ✅ Broadcast Channel Join Approved/Rejected
2. ✅ Live Stream Started
3. ✅ Community Post Reply (nested comments)

### **Phase 2 - GOOD TO HAVE** (Baad mein)
1. Quiz Completion notifications
2. Course milestone notifications
3. Mentor matching notifications

### **Phase 3 - NICE TO HAVE** (Optional)
1. Payment notifications
2. School channel notifications
3. General group notifications

---

## 🛠️ **How To Add New Notification**

### **Template Code:**

```javascript
// In any controller (e.g., broadcast.controller.js)

// 1. Import dependencies
const Notification = (await import('../models/Notification.js')).default;
const { sendPushToUser } = await import('../services/webPush.service.js');
const io = req.app.get('io');

// 2. Create in-app notification
const notification = await Notification.create({
  recipient: userId,           // Who receives it
  sender: req.user._id,         // Who triggered it (or null for system)
  type: 'broadcast_approved',   // Notification type
  message: 'Your request has been approved!',
  // Optional fields:
  // postId: postId,
  // doubtId: doubtId,
  // channelId: channelId,
  read: false,
});

// 3. Emit Socket.IO notification (real-time)
io.to(`user:${userId}`).emit('notification', {
  type: 'broadcast_approved',
  message: 'Your request has been approved!',
  sender: {
    _id: req.user._id,
    name: req.user.name,
    profileImage: req.user.profileImage,
  },
});

// 4. Send Web Push (phone notification)
await sendPushToUser(userId, {
  title: '🎉 Request Approved',
  body: 'Your request to join the channel has been approved!',
  icon: '/icons/icon-192x192.png',
  url: '/broadcast',
  type: 'broadcast_approved',
});

console.log(`✅ Sent notification to user ${userId}`);
```

---

## 📝 **Notification Types Reference**

| Type | Usage |
|------|-------|
| `doubt` | New doubt posted |
| `doubt_reply` | Reply to doubt |
| `like` | Post liked |
| `comment` | Post commented |
| `mention` | User mentioned |
| `broadcast_approved` | Channel join approved |
| `broadcast_rejected` | Channel join rejected |
| `stream_started` | Live stream started |
| `quiz_passed` | Quiz passed |
| `quiz_failed` | Quiz failed |
| `module_completed` | Module completed |
| `course_completed` | Course completed |
| `mentor_matched` | Matched with mentor/student |
| `payment_success` | Payment successful |
| `announcement` | New announcement |

---

## 🎯 **Key Recommendations**

### **DO:**
- ✅ Notify for important events (approvals, live streams, replies)
- ✅ Use all 4 notification layers (bell + socket + push + database)
- ✅ Add emoji to notification titles for better visibility
- ✅ Keep messages short and actionable
- ✅ Include deep link URLs (`url: '/doubts/123'`)
- ✅ Log all notifications with `console.log` for debugging

### **DON'T:**
- ❌ Spam with too many notifications
- ❌ Notify for every small action
- ❌ Send notifications without user's permission
- ❌ Forget to check "don't notify yourself" logic
- ❌ Send notifications without proper error handling

---

## 🔥 **Priority Action Items**

1. **Add Broadcast Channel Notifications** 
   - File: `broadcast.controller.js`
   - Functions: `acceptRequest()`, `rejectRequest()`, `startStream()`
   - Impact: HIGH - Students miss classes without this

2. **Add Community Reply Notifications**
   - File: `feed.routes.js`
   - Route: `POST /:id/comment/:commentId/reply`
   - Impact: MEDIUM - Better engagement

3. **Add Quiz Result Notifications**
   - File: `quiz.controller.js`
   - Function: `submitQuiz()`
   - Impact: LOW - Nice to have for motivation

---

**Kahan notification lagana ZAROORI hai:**
1. 🔴 Broadcast channel join approval/rejection
2. 🔴 Live stream start
3. 🟡 Community comment replies
4. 🟢 Quiz completion

**Kahan notification mat lagao:**
1. ❌ Lecture progress updates
2. ❌ Every chat message
3. ❌ Login/logout
4. ❌ Profile views

**Sabse important: Broadcast notifications! Students ko pata nahi chalega ki unka request approve hua ya live class start ho gayi!**
