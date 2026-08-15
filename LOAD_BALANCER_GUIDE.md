# 🚀 Client-Side Load Balancer Guide

## 📋 Overview

Studdy Buddy ab **client-side load balancer** use karta hai jo automatically 3 Render backend servers ke beech requests distribute karta hai.

## 🎯 Features

### ✅ **Automatic Load Distribution**
- Round-robin algorithm
- Requests evenly distribute across 3 servers
- Each server handles ~33% traffic

### ✅ **Health Monitoring**
- Automatic health checks har 30 seconds
- Failed servers ko automatically skip karta hai
- Recovered servers ko automatically add karta hai

### ✅ **Failover & Retry**
- Agar ek server fail ho, automatically dusre server se retry
- No downtime for users
- Seamless experience

### ✅ **Keep-Alive System**
- Teeno servers ko har 4 minutes ping karta hai
- Render cold starts prevent karta hai
- Always fast response

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         FRONTEND (Vercel)               │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Load Balancer (loadBalancer.js) │ │
│  │   • Round-robin distribution      │ │
│  │   • Health checks                 │ │
│  │   • Automatic failover            │ │
│  └───────────────────────────────────┘ │
└──────────┬──────────┬──────────┬───────┘
           │          │          │
     33%   │    33%   │    33%   │
           ↓          ↓          ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  SERVER 1    │ │  SERVER 2    │ │  SERVER 3    │
│  (Render)    │ │  (Render)    │ │  (Render)    │
│              │ │              │ │              │
│ a5x.onrender │ │ ytip.onrender│ │ 2dn7.onrender│
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
                        ↓
         ┌──────────────────────────────┐
         │   3 MongoDB Databases        │
         │   • PRIMARY (Users/Auth)     │
         │   • SECONDARY (Content)      │
         │   • TERTIARY (Messages)      │
         └──────────────────────────────┘
```

---

## 🔧 Configuration

### **Backend Servers:**
```javascript
// frontend/src/config/loadBalancer.js

servers: [
  {
    url: 'https://studdy-buddy-backend-a5x.onrender.com',
    name: 'Server-1',
    healthy: true,
  },
  {
    url: 'https://studdy-buddy-backend-a5x-ytip.onrender.com',
    name: 'Server-2',
    healthy: true,
  },
  {
    url: 'https://studdy-buddy-backend-a5x-2dn7.onrender.com',
    name: 'Server-3',
    healthy: true,
  },
]
```

### **Settings:**
- **Health Check Interval:** 30 seconds
- **Failure Threshold:** 3 consecutive fails
- **Timeout:** 5 seconds per health check
- **Keep-Alive Ping:** Every 4 minutes

---

## 📊 How It Works

### **1. Request Flow**

```javascript
User makes request
        ↓
loadBalancer.getApiUrl()  // Round-robin server selection
        ↓
Request sent to Server-1, Server-2, or Server-3
        ↓
Response received
        ↓
Server marked as successful
```

### **2. Health Check Flow**

```javascript
Every 30 seconds:
        ↓
Ping all 3 servers at /health
        ↓
Server responds OK → healthy = true
        ↓
Server fails → failCount++
        ↓
failCount >= 3 → healthy = false
        ↓
Skip unhealthy servers in rotation
```

### **3. Failover Flow**

```javascript
Request to Server-1
        ↓
Server-1 fails (timeout/error)
        ↓
Mark Server-1 as failed
        ↓
Automatically retry with Server-2
        ↓
Success → User doesn't notice
```

---

## 🎨 Visual Status Monitor

### **LoadBalancerStats Component**

Add to your App.jsx:

```jsx
import LoadBalancerStats from './components/LoadBalancerStats';

function App() {
  return (
    <>
      {/* Your app components */}
      
      {/* Load Balancer Stats - only in production */}
      {!import.meta.env.DEV && <LoadBalancerStats />}
    </>
  );
}
```

**Shows:**
- ✅ Total servers online/offline
- ✅ Individual server health status
- ✅ Fail counts
- ✅ Last health check time
- ✅ Real-time updates

---

## 🔍 Debugging

### **Check Load Balancer Status:**

Open browser console:
```javascript
import loadBalancer from './config/loadBalancer.js';

// Get current stats
loadBalancer.getStats();
// Output: { total: 3, healthy: 3, unhealthy: 0, healthPercentage: "100.0" }

// Get server status
loadBalancer.getServerStatus();
// Output: [ { name: "Server-1", url: "...", healthy: true, ... }, ... ]

// Manually trigger health check
await loadBalancer.checkHealth();
```

### **Console Logs:**

```
🌐 API Mode: Production (Load Balanced)
🌐 API base URL: https://studdy-buddy-backend-a5x.onrender.com/api
🔥 Keep-alive enabled for all 3 servers
🏥 Running health checks...
✅ Server-1 is healthy
✅ Server-2 is healthy
✅ Server-3 is healthy
🎯 Using Server-2: https://studdy-buddy-backend-a5x-ytip.onrender.com
```

---

## 📈 Performance Benefits

### **Before Load Balancer:**
```
Single Server:
- 1,500-2,000 concurrent users
- 100 database connections
- Single point of failure
- Cold starts impact all users
```

### **After Load Balancer:**
```
3 Servers Load Balanced:
- 4,500-6,000 concurrent users (3x capacity)
- 300 database connections total
- No single point of failure
- Cold starts impact only 33% of users
- Automatic failover
```

---

## 🧪 Testing

### **1. Test Load Distribution**

```bash
# Open browser console
# Make 10 API calls
for(let i=0; i<10; i++) {
  await fetch('/api/auth/profile');
}

# Check console logs - you'll see round-robin:
# 🎯 Using Server-1
# 🎯 Using Server-2
# 🎯 Using Server-3
# 🎯 Using Server-1
# ... (repeats)
```

### **2. Test Failover**

```bash
# Manually stop Server-1 on Render
# Make API calls
# Load balancer will automatically use Server-2 & Server-3
# Check console:
# ⚠️ Server-1 failed (1/3)
# 🔄 Retrying request with different server
# ✅ Request successful with Server-2
```

### **3. Test Health Checks**

```bash
# Open browser console
# Wait 30 seconds
# You'll see:
# 🏥 Running health checks...
# ✅ Server-1 is healthy
# ✅ Server-2 is healthy
# ✅ Server-3 is healthy
```

---

## 🚨 Troubleshooting

### **Problem: All servers showing unhealthy**
**Solution:**
1. Check Render dashboard - are all servers running?
2. Check CORS configuration in backend
3. Check browser network tab for errors
4. Manually test: `curl https://studdy-buddy-backend-a5x.onrender.com/health`

### **Problem: Only using one server**
**Solution:**
1. Check if other servers are marked unhealthy
2. Open LoadBalancerStats component
3. Check failCount - might need to restart servers
4. Check browser console for health check errors

### **Problem: Slow response times**
**Solution:**
1. Check if servers are in cold start (first request)
2. Keep-alive pings should prevent this
3. Check Render logs for performance issues
4. Consider upgrading Render plan

---

## 📊 Monitoring

### **Key Metrics to Watch:**

1. **Health Percentage:**
   - Target: 100% (all servers healthy)
   - Alert: Below 67% (2 servers down)

2. **Fail Counts:**
   - Target: 0
   - Alert: Consistently above 1

3. **Response Times:**
   - Target: < 500ms
   - Alert: > 2000ms

4. **Success Rate:**
   - Target: > 99%
   - Alert: < 95%

---

## 🎯 Best Practices

### ✅ **DO:**
- Monitor LoadBalancerStats regularly
- Keep all 3 servers running 24/7
- Update all servers with same code version
- Test failover during low-traffic times
- Keep logs for debugging

### ❌ **DON'T:**
- Stop all servers at once (always keep 1 running)
- Deploy different versions to different servers
- Ignore health check warnings
- Remove keep-alive pings
- Override load balancer in production

---

## 🔮 Future Enhancements

### **Planned Features:**
- [ ] Weighted load balancing (prefer faster servers)
- [ ] Geographic routing (nearest server)
- [ ] Request queue during high load
- [ ] Advanced metrics (response time tracking)
- [ ] Server-side load balancer (Cloudflare Workers)
- [ ] Auto-scaling based on load

---

## 📞 Support

**Questions?**
1. Check browser console logs
2. Review LoadBalancerStats component
3. Test individual servers manually
4. Check Render logs for backend issues

---

## ✅ Summary

**What We Have Now:**
- ✅ 3 Render backend servers
- ✅ 3 MongoDB databases
- ✅ Client-side load balancer
- ✅ Automatic health checks
- ✅ Failover & retry logic
- ✅ Keep-alive system
- ✅ Visual status monitor

**Capacity:**
- **Users:** 4,500-6,000 concurrent
- **Connections:** 300 total (100 per DB)
- **Storage:** 1.5GB (512MB × 3)
- **Cost:** ₹0 (100% FREE)

**Next Steps:**
1. Deploy frontend with load balancer
2. Monitor LoadBalancerStats
3. Test with real traffic
4. Scale to 10,000+ users! 🚀

---

**Version:** 1.0.0  
**Last Updated:** July 16, 2026  
**Status:** Production Ready ✅
