# Studdy Buddy Frontend - Setup Guide

## Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager
- Backend running on `http://localhost:5000`

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Update .env if needed**
   ```
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Project Structure

```
src/
├── components/      # Reusable UI components
├── pages/          # Page components
├── services/       # API and Socket services
├── store/          # Zustand state stores
├── App.jsx         # Main app component
├── main.jsx        # React entry point
└── index.css       # Global styles
```

## Key Features

### Authentication
- User registration and login
- JWT token-based authentication
- Protected routes
- Auto-logout on token expiration

### Real-time Features
- Socket.io integration for chat
- WebRTC video calling
- Typing indicators
- Live notifications

### Pages
- **Dashboard** - Overview and quick actions
- **Doubts** - Post and browse doubts
- **Resources** - Share and discover resources
- **Communities** - Join and participate in communities
- **Profile** - User profile and settings
- **Chat** - Real-time messaging
- **Video Call** - WebRTC video calling

### UI Features
- Dark/Light mode toggle
- Responsive design
- Smooth animations
- Loading states
- Error handling

## Configuration

### Tailwind CSS
- Custom color palette
- Dark mode support
- Custom animations
- Component utilities

### Vite
- Fast HMR (Hot Module Replacement)
- Optimized build
- CSS preprocessing
- Asset optimization

## Troubleshooting

### Port Already in Use
```bash
# Use different port
npm run dev -- --port 3001
```

### Dependencies Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors
```bash
# Clear Vite cache
rm -rf dist .vite
npm run build
```

## Browser DevTools

### React DevTools
- Install React DevTools browser extension
- Inspect component hierarchy
- Debug state and props

### Network Tab
- Monitor API calls
- Check response times
- Debug Socket.io events

## Performance Tips

1. **Use React DevTools Profiler**
   - Identify slow components
   - Check render times

2. **Monitor Bundle Size**
   ```bash
   npm run build
   # Check dist/ folder size
   ```

3. **Lighthouse Audit**
   - Open DevTools
   - Run Lighthouse audit
   - Fix reported issues

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Docker Deployment
```bash
docker build -t studdy-buddy-frontend .
docker run -p 3000:3000 studdy-buddy-frontend
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:5000/api |
| VITE_SOCKET_URL | Socket.io server URL | http://localhost:5000 |

## Next Steps

1. Start the backend server
2. Run `npm run dev`
3. Open `http://localhost:3000`
4. Sign up or login
5. Explore the app

## Support

For issues or questions:
1. Check FRONTEND_ARCHITECTURE.md
2. Review component documentation
3. Check browser console for errors
4. Verify backend is running

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Socket.io Client](https://socket.io/docs/v4/client-api/)
- [Framer Motion](https://www.framer.com/motion/)
