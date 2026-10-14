# 🎯 Quick Testing Guide - Lecture Progress System

## Before You Start
1. Open browser console (F12)
2. Login as a student
3. Navigate to a course with multiple lectures
4. Have the console visible at all times

---

## 🔥 CRITICAL TESTS (Must Pass)

### Test 1: Basic Progress Tracking
```
1. Click on first lecture → Video opens
2. Play video for 30 seconds
3. Watch console → Should see "✅ Progress updated: X%" every 5 seconds
4. Close video modal
5. Check lecture card → Should show exact % (e.g., 15%, 20%)
✅ PASS: Progress shows real-time percentage
❌ FAIL: Progress stuck at 0% or wrong number
```

### Test 2: Progress Saves on Close
```
1. Play video to ~60%
2. Close modal → Console shows "💾 Saving progress before close: 60%"
3. Lecture card immediately shows 60% (NO REFRESH)
4. Reopen same video → Should remember 60%
✅ PASS: Progress persists without refresh
❌ FAIL: Progress resets or needs refresh
```

### Test 3: 95% Completion & Unlock
```
1. Play Lecture 1 to 95%+ (can fast-forward)
2. Console shows "🎉 Lecture AUTO-COMPLETED at 95%!"
3. Close video
4. Lecture 1: Shows ✅ checkmark + "Completed"
5. Lecture 2: UNLOCKS instantly (🔒 → 🔓)
6. Console shows "✅ UNLOCKED" for Lecture 2
7. NO PAGE REFRESH NEEDED
✅ PASS: Next lecture unlocks instantly at 95%
❌ FAIL: Stays locked or needs refresh
```

### Test 4: Exact Percentage Display
```
1. Play video to 70%
2. Check lecture card
✅ PASS: Shows "70%" (exact number)
❌ FAIL: Shows "100%" or wrong number
```

### Test 5: Sequential Locking
```
Before completing Lecture 1:
- Lecture 1: 🔓 Unlocked
- Lecture 2: 🔒 Locked
- Lecture 3: 🔒 Locked

After completing Lecture 1 (95%+):
- Lecture 1: ✅ Completed
- Lecture 2: 🔓 Unlocked  
- Lecture 3: 🔒 Still Locked (correctly!)

After completing Lecture 2:
- Lecture 1: ✅ Completed
- Lecture 2: ✅ Completed
- Lecture 3: 🔓 Unlocked
✅ PASS: Lectures unlock one by one
❌ FAIL: All unlock or none unlock
```

---

## 🎬 Step-by-Step Test Scenario

### Scenario: Complete 3 Lectures
```
STEP 1: Start fresh
→ Lecture 1: 0% (unlocked)
→ Lecture 2: 0% (🔒 locked)
→ Lecture 3: 0% (🔒 locked)

STEP 2: Play Lecture 1 to 50%
→ Watch console for "✅ Progress updated: 50%"
→ Close video
→ Console: "💾 Saving progress before close: 50%"
→ Lecture 1 card: Shows "50%" immediately (no refresh)
→ Lecture 2: Still 🔒 locked

STEP 3: Reopen Lecture 1, fast-forward to 96%
→ Console: "🎉 Lecture AUTO-COMPLETED at 96%!"
→ Close video
→ Lecture 1: ✅ "Completed" + green checkmark
→ Lecture 2: 🔓 UNLOCKS INSTANTLY
→ Console: "✅ UNLOCKED" for Lecture 2

STEP 4: Play Lecture 2 to 95%+
→ Close video
→ Lecture 2: ✅ Completed
→ Lecture 3: 🔓 UNLOCKS INSTANTLY

STEP 5: Play Lecture 3 to 70%
→ Close video
→ Lecture 3: Shows "70%" (not 100%!)
→ Lecture 4: Still 🔒 locked (correct!)

ALL TESTS PASSED! ✅
```

---

## 🔍 Console Logs You Should See

### During Playback (every 5 seconds):
```
✅ Progress updated: 15%
✅ Progress updated: 20%
✅ Progress updated: 25%
...
```

### When Reaching 95%:
```
🎉 Lecture AUTO-COMPLETED at 95%!
```

### When Closing Modal:
```
💾 Saving progress before close: 75%
✅ Final progress saved on close: {watchedPercentage: 75, isCompleted: false}
```

### When Checking Lock Status:
```
🔍 Accessibility Check for Lecture 2: {prevProgress: {isCompleted: true}}
✅ UNLOCKED (previous lecture completed)

🔍 Accessibility Check for Lecture 3: {prevProgress: {isCompleted: false}}
🔒 LOCKED (previous lecture not completed)
```

---

## ❌ Common Issues & Fixes

### Issue 1: Progress Stuck at 0%
→ Check: Video is actually playing?
→ Check: Console shows "✅ Progress updated"?
→ Fix: Might be network issue, check backend logs

### Issue 2: Lecture Not Unlocking
→ Check: Previous lecture >= 95%?
→ Check: Console shows "✅ UNLOCKED"?
→ Check: Console might show nested progress structure issue
→ Should be fixed now (checks both structures)

### Issue 3: Shows 100% Instead of Exact %
→ This is now FIXED
→ Should always show exact % (e.g., 70%, 92%)

### Issue 4: Needs Refresh to Update
→ This is now FIXED
→ Real-time `onProgressUpdate` callback handles it

---

## 📱 Mobile Testing
```
1. Open on mobile device
2. Play video (controls should work)
3. Progress updates every 5 seconds
4. Close video → Progress persists
5. Next lecture unlocks at 95%
All features should work same as desktop
```

---

## ✅ Final Checklist Before Push

- [ ] Progress updates every 5 seconds during playback
- [ ] Console shows "💾 Saving progress" on close
- [ ] Exact percentage displays (not forced to 100%)
- [ ] 95%+ marks lecture complete
- [ ] Next lecture unlocks immediately (no refresh)
- [ ] Console shows "✅ UNLOCKED" when unlocking
- [ ] Sequential locking works (only next unlocks)
- [ ] Quiz button appears after completion
- [ ] No errors in console
- [ ] Works on mobile + desktop

**If all checked, system is PRODUCTION READY! 🚀**

---

## 📞 Report Issues

If any test fails:
1. Share console screenshot
2. Share exact steps to reproduce
3. Share network tab (F12 → Network) showing API calls
4. Share current lecture progress state

