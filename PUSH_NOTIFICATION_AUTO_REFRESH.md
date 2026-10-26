# Push Notification Auto-Refresh Implementation

## Problem
Push notifications were intermittently failing for mentors because FCM tokens expire after ~60-70 days. Subscriptions created in September 2026 (48+ days old) had stale tokens, causing silent failures despite correct VAPID configuration and notification code.

**Affected Mentors (from checkPushSubscriptions.js):**
- Anshraj: 46 days old (9/7/2026)
- Chris: 48 days old (9/5/2026)
- Amit: 42-51 days old (9/5, 9/14/2026)
- Apoorva: 46 days old (9/7/2026)

## Root Cause
Browser push subscriptions contain FCM tokens that expire but the subscription object remains valid in the browser. Without automatic refresh logic, expired tokens silently fail when backend tries to send notifications.

## Solution
Implemented automatic subscription refresh mechanism that:
1. **Checks subscription age on login** - Queries backend for creation timestamp
2. **Forces re-subscription if >30 days** - Unsubscribes old subscription, creates fresh one
3. **Preserves fresh subscriptions** - Only refreshes if needed, avoiding unnecessary churn
4. **Transparent to user** - Happens automatically during setupPushNotifications()

## Changes Made

### Frontend: `frontend/src/services/pushNotification.js`

**Added `isSubscriptionStale()` function:**
```javascript
async function isSubscriptionStale(subscription) {
  const response = await api.post('/push/check-subscription-age', {
    endpoint: subscription.endpoint,
  })
  const { ageInDays } = response.data.data
  return ageInDays > 30  // Stale if >30 days (50% FCM token lifetime)
}
```

**Modified `setupPushNotifications()` logic:**
```javascript
// Old: Always kept existing subscription
const existing = await registration.pushManager.getSubscription()
if (existing) {
  await saveSubscriptionToBackend(existing)
  return true
}

// New: Check age and refresh if stale
const existing = await registration.pushManager.getSubscription()
if (existing) {
  const isStale = await isSubscriptionStale(existing)
  if (isStale) {
    await existing.unsubscribe()  // Remove stale subscription
    // Continue to create fresh subscription
  } else {
    await saveSubscriptionToBackend(existing)  // Refresh backend record
    return true
  }
}
```

### Backend: `backend/src/routes/push.routes.js`

**Added `/api/push/check-subscription-age` endpoint:**
```javascript
router.post('/check-subscription-age', authenticate, async (req, res) => {
  const subscription = await PushSubscription.findOne({ 
    endpoint: req.body.endpoint, 
    user: req.user._id 
  })
  
  const createdAt = subscription.createdAt || subscription._id.getTimestamp()
  const ageInMs = Date.now() - createdAt.getTime()
  const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24))
  
  res.json({
    success: true,
    data: { ageInDays, createdAt, isStale: ageInDays > 30 }
  })
})
```

**Enhanced `/api/push/subscribe` endpoint:**
- Now tracks if subscription is new vs refresh
- Preserves original `createdAt` on refresh (doesn't reset to current date)
- Returns `isRefresh` flag and `createdAt` in response
- Logs "created" vs "refreshed" for better debugging

## How It Works

### Flow Diagram
```
User logs in
    ↓
setupPushNotifications() called
    ↓
Check if existing subscription exists
    ↓
    YES → Call isSubscriptionStale(subscription)
    |       ↓
    |     Backend checks createdAt from DB
    |       ↓
    |     Age > 30 days?
    |       ↓
    |     YES → Unsubscribe old + Create new subscription
    |     NO  → Refresh backend record + Done
    ↓
    NO → Create new subscription (first time user)
```

### Why 30 Days Threshold?
- FCM tokens expire at ~60-70 days
- 30 days = 50% of lifetime = safe refresh window
- Prevents last-minute failures when tokens are close to expiration
- Reduces unnecessary refreshes for recently created subscriptions

## Testing Strategy

### Before Deployment
1. **Test with stale subscription (Anshraj/Chris account):**
   - Login as mentor with 48-day old subscription
   - Check browser console for "[Push] ⚠️ Subscription is stale" log
   - Verify new subscription created
   - Test doubt notification delivery

2. **Test with fresh subscription (Siddharth/Krishi account):**
   - Login as mentor with <30-day old subscription
   - Verify no refresh triggered
   - Confirm existing subscription preserved

3. **Test with no subscription (Aditya account):**
   - Login as mentor with no prior subscription
   - Verify normal subscription flow
   - Test notification delivery

### After Deployment
1. Monitor backend logs for next doubt creation
2. Check if all 8 mentors receive push notifications
3. Compare success rate to previous ~50% baseline
4. Track subscription refresh logs over 7 days

## Expected Outcomes

### Immediate (First Login After Deploy)
- Mentors with 46-48 day old subscriptions get fresh tokens
- New subscriptions created for Anshraj, Chris, Amit, Apoorva
- Fresh subscriptions (Siddharth, Krishi) unchanged

### Long-term (Next 30 Days)
- Push notification delivery rate improves to >95%
- Subscriptions automatically refresh before expiration
- No manual intervention needed for token management
- Admin dashboard shows healthier subscription ages

## Rollback Plan
If issues arise:
1. Revert `frontend/src/services/pushNotification.js` to previous version
2. Keep backend endpoint (backwards compatible, won't break old frontend)
3. Old frontend will work normally (no age checking, just refresh backend)

## Monitoring

**Key Metrics:**
- Push notification success rate (target: >95%)
- Average subscription age (target: <30 days)
- Subscription refresh frequency (should see spike after deploy, then periodic)

**Backend Logs to Watch:**
```
[Push Subscribe] ✅ Subscription created: <id>    ← New subscriptions
[Push Subscribe] ✅ Subscription refreshed: <id>  ← Age-based refreshes
[Push Check Age] Subscription age: X days         ← Age check queries
```

**Frontend Console Logs (User's Browser):**
```
[Push] ⚠️ Subscription is stale (>30 days), forcing refresh...
[Push] Old subscription unsubscribed, will create new one
[Push] ✅ PushManager subscription created
[Push] ✅ Subscription saved to backend
```

## Related Files
- Frontend: `frontend/src/services/pushNotification.js` (subscription logic)
- Backend: `backend/src/routes/push.routes.js` (API endpoints)
- Backend: `backend/src/models/PushSubscription.js` (DB schema with timestamps)
- Backend: `backend/src/controllers/doubt.controller.js` (notification sending logic - unchanged)

## Previous Investigation
- Diagnosis document: `PUSH_NOTIFICATION_FIX.md`
- Diagnostic script: `backend/checkPushSubscriptions.js`
- Initial findings: 7/8 mentors had 42-51 day old subscriptions
- VAPID keys confirmed present in production (screenshot verified)
- Notification code verified correct with proper error handling

## Date
**Implemented:** October 23, 2026
**Deploy Target:** Production (awaiting commit + push)
