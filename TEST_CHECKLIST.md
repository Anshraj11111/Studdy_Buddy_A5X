# Studdy Buddy A5x - Complete Testing Checklist

## ✅ Recently Implemented Features to Test

### 1. Notes Upload Feature (NEW)
- [ ] **Upload Notes in Create Resource**
  - Open Resources page
  - Click "Upload Resource"
  - Add title, topic, YouTube URL
  - Upload PDF/DOC file in "Notes" section
  - Verify file shows in preview
  - Submit and check if resource created with notes

- [ ] **View/Download Notes**
  - Click green "Notes" button on resource card
  - **Desktop**: Should open PDF directly in browser
  - **Mobile**: Should open in Google Docs Viewer
  - Verify PDF displays correctly without corruption

- [ ] **Edit Notes in Resource**
  - Click "Edit" button on resource with notes
  - Should show "Notes attached" with green badge
  - Click "Remove" to delete existing notes
  - Upload new notes file
  - Update and verify changes saved

- [ ] **Notes Without Corruption**
  - Download/view PDF on mobile
  - Should NOT show "Google Play Services for AR" error
  - PDF should render properly in Google Docs Viewer

### 2. Optional Description Field (Fixed)
- [ ] **Create Resource Without Description**
  - Upload resource with only title and topic
  - Leave description empty
  - Should save successfully

- [ ] **Edit Resource Without Description**
  - Edit any resource
  - Delete description text
  - Update should work without errors

### 3. Playlist Edit/Delete (Mentors)
- [ ] **Edit Playlist**
  - Login as mentor
  - Go to Resources → Playlists tab
  - Click "Edit" on any playlist
  - Modify title/description
  - Verify update successful

- [ ] **Delete Playlist**
  - Click "Delete" on playlist
  - Confirm deletion prompt
  - Verify playlist removed from list

### 4. Rate Limiter Fix (Production)
- [ ] **Login Without Errors**
  - Go to production URL: https://studdy-buddy-a5x.vercel.app
  - Login with credentials
  - Should NOT get 500 error
  - Check browser console - no X-Forwarded-For errors

- [ ] **API Requests Work**
  - Navigate to different pages
  - All API calls should work
  - No rate limiter crashes in Render logs

### 5. School Channel Name Fix
- [ ] **Auto-Join School Channel**
  - Register new student account
  - Provide school name and city
  - Should auto-join correct channel
  - No "channel not found" errors in logs

---

## 🔧 Core Features to Verify

### Authentication
- [ ] Login (email/password)
- [ ] Register (student/mentor with mentor code)
- [ ] Logout
- [ ] Token refresh on page reload
- [ ] Auto-logout prevention (fixed)

### Resources
- [ ] View all resources
- [ ] Filter by topic
- [ ] Search resources
- [ ] Watch YouTube videos (fullscreen working)
- [ ] Download resources
- [ ] Upload resource (mentor)
- [ ] Edit resource (mentor)
- [ ] Delete resource (mentor)

### Playlists
- [ ] View playlists
- [ ] Create playlist (mentor)
- [ ] Add videos to playlist
- [ ] Play playlist
- [ ] Navigate between videos
- [ ] Edit playlist (mentor)
- [ ] Delete playlist (mentor)

### Doubts/Q&A
- [ ] Ask doubt
- [ ] View doubts feed
- [ ] Answer doubt
- [ ] Upvote answers
- [ ] Mark solution

### My School (School Channel)
- [ ] View school channel
- [ ] Send messages
- [ ] View members list
- [ ] Real-time message updates
- [ ] Loading speed (should be <3 seconds)

### Communities
- [ ] View communities
- [ ] Join community
- [ ] Post in community
- [ ] Comment on posts

### Video Calling (WebRTC)
- [ ] Start 1-on-1 call
- [ ] Accept incoming call
- [ ] Video/audio working
- [ ] Screen sharing
- [ ] Call feedback modal

### Profile & Settings
- [ ] View profile
- [ ] Edit profile
- [ ] Upload profile picture
- [ ] Dark/light theme toggle
- [ ] XP and level display
- [ ] Leaderboard

### Notifications
- [ ] Real-time notifications
- [ ] Mark as read
- [ ] Notification bell badge count

---

## 🌐 Cross-Platform Testing

### Desktop Browser
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari (Mac)

### Mobile Browser
- [ ] Android Chrome
- [ ] iOS Safari
- [ ] Responsive design working

### Production Deployment
- [ ] Frontend: Vercel deployment successful
- [ ] Backend: Render servers healthy (3 servers)
- [ ] Database: MongoDB connections stable
- [ ] Redis: Cache working
- [ ] Cloudinary: Image/file uploads working

---

## 🐛 Known Issues to Check

- [ ] JWT_EXPIRE env var format (should use default '24h')
- [ ] Cloudinary env vars set on all 3 Render services
- [ ] Trust proxy enabled (no rate limiter errors)
- [ ] Channel name normalization working
- [ ] Google OAuth origin configured

---

## 📊 Performance Checks

- [ ] My School page loads in <3 seconds
- [ ] API response times reasonable
- [ ] No memory leaks
- [ ] Socket connections stable
- [ ] File uploads complete successfully

---

**Test Date**: August 25, 2026
**Tester**: Ansh Raj Baghel
**Environment**: Production (studdy-buddy-a5x.vercel.app)
