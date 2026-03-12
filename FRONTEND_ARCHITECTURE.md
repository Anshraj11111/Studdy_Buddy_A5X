# Studdy Buddy Frontend Architecture

## Project Overview

Studdy Buddy Frontend is a production-ready React application built with Vite, Tailwind CSS, and modern web technologies. It provides a premium, responsive user interface for the peer-to-peer robotics learning platform.

**Features:**
- Real-time chat and video calling
- Doubt posting and matching
- Resource sharing and discovery
- Community collaboration
- Mentor request system
- Dark/Light mode toggle
- PWA support for offline access
- Responsive design for all devices

## Tech Stack

### Core Framework
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Icon library

### State Management & API
- **Zustand** - Lightweight state management
- **Axios** - HTTP client
- **Socket.io-client** - Real-time communication

### Development
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## Folder Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Badge.jsx
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Navbar.jsx
│   ├── pages/               # Page components
│   │   ├── Chat.jsx
│   │   ├── Communities.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Doubts.jsx
│   │   ├── Login.jsx
│   │   ├── PostDoubt.jsx
│   │   ├── Profile.jsx
│   │   ├── Resources.jsx
│   │   ├── Signup.jsx
│   │   └── VideoCall.jsx
│   ├── services/            # API and Socket services
│   │   ├── api.js           # Axios API client
│   │   └── socket.js        # Socket.io client
│   ├── store/               # Zustand stores
│   │   ├── authStore.js     # Authentication state
│   │   └── themeStore.js    # Theme state
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles
├── public/
│   ├── manifest.json        # PWA manifest
│   └── service-worker.js    # Service worker
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
├── eslint.config.js         # ESLint configuration
├── package.json
└── .env.example
```

## Component Architecture

### Base Components
- **Button** - Reusable button with variants (primary, secondary, outline, danger)
- **Input** - Form input with label and error support
- **Card** - Container component with shadow and hover effects
- **Badge** - Tag/label component with color variants
- **Modal** - Dialog component with animations
- **Navbar** - Navigation bar with theme toggle and user menu

### Page Components
- **Login** - User authentication
- **Signup** - User registration
- **Dashboard** - Main dashboard with stats and quick actions
- **Doubts** - List and search doubts with filtering
- **PostDoubt** - Create new doubt
- **Resources** - Browse and search resources
- **Communities** - List and join communities
- **Profile** - User profile and settings
- **Chat** - Real-time messaging
- **VideoCall** - WebRTC video calling

## State Management

### Auth Store (Zustand)
```javascript
{
  user: null,
  token: null,
  loading: false,
  error: null,
  register: async (email, password, name, role) => {},
  login: async (email, password) => {},
  logout: () => {},
  fetchProfile: async () => {},
  updateProfile: async (updates) => {},
}
```

### Theme Store (Zustand)
```javascript
{
  isDark: boolean,
  toggleTheme: () => {},
  initTheme: () => {},
}
```

## API Integration

### Axios Configuration
- Base URL: `http://localhost:5000/api`
- Auto-attach JWT token to requests
- Auto-redirect to login on 401 errors
- Request/response interceptors

### API Endpoints

**Authentication**
- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update profile

**Doubts**
- `POST /doubts` - Create doubt
- `GET /doubts` - List doubts (paginated)
- `GET /doubts/:id` - Get doubt details
- `GET /doubts/search?q=query` - Search doubts
- `GET /doubts/topic/:topic` - Get doubts by topic

**Resources**
- `POST /resources` - Upload resource
- `GET /resources` - List resources (paginated)
- `GET /resources/:id` - Get resource details
- `GET /resources/search?q=query` - Search resources
- `GET /resources/topic/:topic` - Get resources by topic
- `POST /resources/:id/download` - Increment download count
- `DELETE /resources/:id` - Delete resource

**Communities**
- `POST /communities` - Create community
- `GET /communities` - List communities (paginated)
- `GET /communities/:id` - Get community details
- `POST /communities/:id/join` - Join community
- `POST /communities/:id/leave` - Leave community
- `POST /communities/:id/posts` - Create post
- `GET /communities/:id/posts` - Get community posts

**Mentor**
- `POST /mentor/request` - Create mentor request
- `GET /mentor/requests/pending` - Get pending requests
- `GET /mentor/requests` - Get my requests
- `PUT /mentor/requests/:id/accept` - Accept request
- `PUT /mentor/requests/:id/reject` - Reject request
- `PUT /mentor/requests/:id/complete` - Complete request

## Real-time Communication

### Socket.io Events

**Chat Events**
- `joinRoom(roomId, userId)` - Join chat room
- `sendMessage(roomId, content)` - Send message
- `onMessage(callback)` - Receive message
- `typing(roomId, userId)` - Send typing indicator
- `onTyping(callback)` - Receive typing indicator
- `leaveRoom(roomId)` - Leave room

**Video Events**
- `initiateCall(roomId, calleeId)` - Start call
- `onIncomingCall(callback)` - Receive incoming call
- `acceptCall(roomId, callerId)` - Accept call
- `rejectCall(roomId, callerId)` - Reject call
- `offer(roomId, recipientId, offer)` - Send WebRTC offer
- `onOffer(callback)` - Receive offer
- `answer(roomId, recipientId, answer)` - Send WebRTC answer
- `onAnswer(callback)` - Receive answer
- `iceCandidate(roomId, recipientId, candidate)` - Send ICE candidate
- `onIceCandidate(callback)` - Receive ICE candidate
- `callEnded(roomId)` - End call
- `onCallEnded(callback)` - Call ended notification

## Design System

### Color Palette
- **Primary** - #6366F1 (Indigo)
- **Secondary** - #8B5CF6 (Purple)
- **Accent** - #06B6D4 (Cyan)
- **Background Light** - #F9FAFB
- **Background Dark** - #0F172A

### Typography
- **Font Family** - Inter, system-ui, sans-serif
- **Headings** - Bold weights (600-700)
- **Body** - Regular weight (400)

### Spacing
- Uses Tailwind's default spacing scale
- Consistent padding/margin throughout

### Animations
- Fade in/out transitions
- Slide up animations on page load
- Smooth hover effects
- Framer Motion for complex animations

## Dark Mode

### Implementation
- Uses Tailwind's `dark:` prefix
- Theme stored in localStorage
- Persists across sessions
- Toggle in navbar

### Usage
```jsx
<div className="bg-white dark:bg-gray-800">
  Light mode: white, Dark mode: gray-800
</div>
```

## Routing

### Public Routes
- `/login` - Login page
- `/signup` - Signup page

### Protected Routes
- `/dashboard` - Main dashboard
- `/doubts` - Doubts list
- `/doubts/new` - Post doubt
- `/resources` - Resources list
- `/communities` - Communities list
- `/profile` - User profile
- `/chat/:roomId` - Chat room
- `/video/:roomId/:calleeId` - Video call

### Route Protection
- ProtectedRoute component checks for valid token
- Redirects to login if not authenticated
- Automatically initializes socket connection

## PWA Support

### Features
- Installable on mobile and desktop
- Offline support via service worker
- App manifest with icons and metadata
- Shortcuts for quick actions

### Configuration
- `manifest.json` - PWA metadata
- `service-worker.js` - Offline caching
- Cache strategy: Network first, fallback to cache

### Installation
1. Visit app in supported browser
2. Click "Install" or "Add to Home Screen"
3. App runs as standalone application

## Performance Optimization

### Code Splitting
- React Router lazy loading
- Dynamic imports for pages
- Chunk splitting by route

### Caching
- HTTP caching headers
- Service worker caching
- Browser cache for assets

### Bundle Size
- Tree shaking unused code
- Minification in production
- Gzip compression

### Rendering
- Memoization for expensive components
- Lazy loading images
- Virtual scrolling for large lists

## Development

### Setup
```bash
cd frontend
npm install
```

### Environment Variables
Create `.env` file:
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Running Development Server
```bash
npm run dev
```
Server runs on `http://localhost:3000`

### Building for Production
```bash
npm run build
```
Output in `dist/` directory

### Linting
```bash
npm run lint
```

## Deployment

### Prerequisites
- Node.js 16+
- npm or yarn

### Build
```bash
npm run build
```

### Serve
```bash
npm run preview
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Environment Variables for Production
```
VITE_API_URL=https://api.yourdomain.com
VITE_SOCKET_URL=https://yourdomain.com
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Accessibility

### Features
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Color contrast compliance
- Focus indicators

### Testing
- Manual testing with screen readers
- Keyboard-only navigation
- Color contrast verification

## Security

### Measures
- JWT token storage in localStorage
- HTTPS only in production
- CORS configuration
- Input validation
- XSS protection via React

### Best Practices
- Never store sensitive data in localStorage
- Validate all user inputs
- Use HTTPS for all API calls
- Implement rate limiting on backend

## Troubleshooting

### Common Issues

**API Connection Failed**
- Check VITE_API_URL in .env
- Verify backend is running
- Check CORS configuration

**Socket Connection Failed**
- Check VITE_SOCKET_URL in .env
- Verify Socket.io server is running
- Check firewall rules

**Dark Mode Not Working**
- Clear localStorage
- Check theme store initialization
- Verify Tailwind dark mode config

**Video Call Issues**
- Check browser permissions
- Verify WebRTC support
- Check ICE server connectivity

## Performance Metrics

### Target Metrics
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3.5s

### Monitoring
- Use Lighthouse for audits
- Monitor Core Web Vitals
- Track error rates
- Monitor API response times

## Future Enhancements

- Advanced search with filters
- User notifications system
- File upload for resources
- Advanced video features (screen sharing)
- Analytics dashboard
- Admin panel
- Mobile app (React Native)

## Support & Maintenance

### Regular Tasks
- Update dependencies
- Monitor performance
- Fix reported bugs
- Review security updates
- Optimize bundle size

### Monitoring
- Error tracking (Sentry)
- Performance monitoring
- User analytics
- API monitoring

## License

ISC

## Version

1.0.0
