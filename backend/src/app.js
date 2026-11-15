import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import doubtRoutes from './routes/doubt.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import communityRoutes from './routes/community.routes.js';
import mentorRoutes from './routes/mentor.routes.js';
import roomRoutes from './routes/room.routes.js';
import feedRoutes from './routes/feed.routes.js';
import connectionRoutes from './routes/connection.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import followRoutes from './routes/follow.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatRoutes from './routes/chatRoute.js';
import googleAuthRoutes from './routes/google.auth.routes.js';
import rewardsRoutes from './routes/rewards.routes.js';
import generalGroupRoutes from './routes/generalGroup.routes.js';
import broadcastRoutes from './routes/broadcast.routes.js';
import playlistRoutes from './routes/playlist.routes.js';
import schoolChannelRoutes from './routes/schoolChannel.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import courseRoutes from './routes/course.routes.js';
import referralRoutes from './routes/referral.routes.js';
import healthRoutes from './routes/health.routes.js';
import pushRoutes from './routes/push.routes.js';
import lectureProgressRoutes from './routes/lectureProgress.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import courseAccessRoutes from './routes/courseAccess.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { sanitizeMongoOperators } from './middleware/input-sanitization.middleware.js';
import { securityHeaders, removeSensitiveHeaders } from './middleware/security-headers.middleware.js';
import csrfProtection from './middleware/csrf-protection.middleware.js';
import securityLogger from './middleware/security-logger.middleware.js';
import logger from './utils/logger.js';

const app = express();

// ══════════════════════════════════════════════════════════════════════════
// TRUST PROXY - CRITICAL FOR RENDER/HEROKU/VERCEL (Behind reverse proxy)
// ══════════════════════════════════════════════════════════════════════════
// This fixes rate limiting and IP detection when behind a proxy
app.set('trust proxy', 1); // Trust first proxy (Render/Vercel/Cloudflare)

// Remove sensitive headers
app.use(removeSensitiveHeaders);

// Compression middleware
app.use(compression());

// Security middleware
app.use(helmet());

// Additional security headers
app.use(securityHeaders);

// CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://studdy-buddy-a5x.vercel.app',
        'https://studdy-buddy-backend-a5x.onrender.com',
        'https://studdybuddy.a5x.in',
        'https://studdybuddy.docu.in',
        /https:\/\/studdy-buddy.*\.vercel\.app$/, // Allow all Vercel preview URLs
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        // Actually block unauthorized origins
        console.warn('⚠️ CORS blocked unauthorized origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));   // Reduced from 20mb for performance
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Input sanitization - Protect against NoSQL injection and XSS
app.use(sanitizeMongoOperators);

// CSRF Protection
app.use(csrfProtection);

// Security event logging
app.use(securityLogger);

// Request logging
app.use(requestLogger);

// Rate limiting middleware - OPTIMIZED FOR 10K USERS
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,  // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,                // 200 requests per 15 min
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting on error to prevent crashes
  skip: (req) => {
    // If X-Forwarded-For header causes issues, skip rate limiting
    return false;
  },
  // Use Redis for distributed rate limiting if available
  store: process.env.REDIS_URL ? undefined : undefined, // TODO: Add Redis store
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,  // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10,                 // 10 login attempts
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting on error to prevent crashes
  skip: (req) => {
    return false;
  },
});

// Apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
  app.use('/api/auth/', authLimiter);
  console.log('✅ Rate limiting enabled for production');
} else {
  console.log('⚠️ Rate limiting disabled in development');
}

// ── ICE / TURN server config ──────────────────────────────────────────────
app.get('/api/ice-servers', async (req, res) => {
  const stunServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // ── Priority 1: Metered TURN with fresh credentials ──────────────────────
  try {
    const appName = process.env.METERED_APP_NAME;
    const apiKey  = process.env.METERED_API_KEY;

    if (appName && apiKey) {
      const meteredRes = await fetch(
        `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
      );
      if (meteredRes.ok) {
        const allServers = await meteredRes.json();
        // Find the username/credential from fetched servers
        const authServer = allServers.find(s => s.username && s.credential);
        const username = authServer?.username;
        const credential = authServer?.credential;

        if (username && credential) {
          // Use specific Mumbai IP directly — avoids geo-DNS returning different servers
          // 172.237.33.131 = Metered Mumbai relay (consistent for India users)
          const iceServers = [
            ...stunServers,
            {
              urls: [
                'turn:172.237.33.131:80',
                'turn:172.237.33.131:80?transport=tcp',
                'turn:172.237.33.131:443',
                'turns:172.237.33.131:443?transport=tcp',
              ],
              username,
              credential,
            },
          ];
          console.log('✅ Metered Mumbai TURN configured with direct IP');
          return res.status(200).json({ success: true, iceServers });
        }
        // Fallback: return all servers if no auth found
        const iceServers = [...stunServers, ...allServers];
        console.log('✅ Metered TURN credentials fetched:', allServers.length, 'servers');
        return res.status(200).json({ success: true, iceServers });
      }
    }
  } catch (err) {
    console.warn('⚠️ Metered TURN fetch failed:', err.message);
  }

  // ── Priority 2: Cloudflare TURN via HMAC ─────────────────────────────────
  try {
    const cfKeyId  = process.env.CF_TURN_KEY_ID;
    const cfSecret = process.env.CF_TURN_SECRET;

    if (cfKeyId && cfSecret) {
      const { createHmac } = await import('node:crypto');
      const ttl       = 86400;
      const timestamp = Math.floor(Date.now() / 1000) + ttl;
      const username  = `${timestamp}:${cfKeyId}`;
      const credential = createHmac('sha256', cfSecret).update(username).digest('base64');
      const iceServers = [
        ...stunServers,
        { urls: 'stun:stun.cloudflare.com:3478' },
        {
          urls: ['turn:turn.cloudflare.com:3478', 'turn:turn.cloudflare.com:3478?transport=tcp', 'turns:turn.cloudflare.com:5349'],
          username,
          credential,
        },
      ];
      console.log('✅ Cloudflare TURN credentials generated via HMAC');
      return res.status(200).json({ success: true, iceServers });
    }
  } catch (err) {
    console.warn('⚠️ Cloudflare TURN HMAC failed:', err.message);
  }

  // ── Static fallback ────────────────────────────────────────────────────────
  res.status(200).json({
    success: true,
    iceServers: [
      ...stunServers,
      {
        urls: ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:80?transport=tcp', 'turn:global.relay.metered.ca:443', 'turns:global.relay.metered.ca:443?transport=tcp'],
        username: 'dd9dff66bc88d50dc88d1cc3',
        credential: '3a7ymuMhHgFio/OH',
      },
    ],
  });
});

// Health check routes
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Keep-alive ping — separate from /health so ad blockers don't interfere
app.get('/ping', (req, res) => res.status(200).json({ ok: true }));

// ── Performance Stats Endpoint (10K Users Monitoring) ────────────────────────
app.get('/health/performance', async (req, res) => {
  try {
    const { getPerformanceStats } = await import('./utils/performance.js');
    const stats = getPerformanceStats();
    
    res.status(200).json({
      success: true,
      performance: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Performance stats failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Performance stats unavailable',
      error: error.message,
    });
  }
});

app.get('/health/db', async (req, res) => {
  try {
    // Check multi-database mode
    const isMultiDbMode = process.env.MONGO_URI_PRIMARY || 
                          process.env.MONGO_URI_SECONDARY || 
                          process.env.MONGO_URI_TERTIARY;

    if (isMultiDbMode) {
      // Multi-database health check
      const { getConnection } = await import('./config/db-multi.js');
      const primaryConn = getConnection('primary');
      const secondaryConn = getConnection('secondary');
      const tertiaryConn = getConnection('tertiary');

      const allConnected = 
        primaryConn?.readyState === 1 &&
        secondaryConn?.readyState === 1 &&
        tertiaryConn?.readyState === 1;

      if (allConnected) {
        res.status(200).json({
          success: true,
          message: 'All databases are healthy',
          mode: 'multi-database',
          databases: {
            primary: { status: 'connected', readyState: primaryConn.readyState },
            secondary: { status: 'connected', readyState: secondaryConn.readyState },
            tertiary: { status: 'connected', readyState: tertiaryConn.readyState },
          },
        });
      } else {
        res.status(503).json({
          success: false,
          message: 'One or more databases are not connected',
          mode: 'multi-database',
          databases: {
            primary: { status: primaryConn?.readyState === 1 ? 'connected' : 'disconnected', readyState: primaryConn?.readyState },
            secondary: { status: secondaryConn?.readyState === 1 ? 'connected' : 'disconnected', readyState: secondaryConn?.readyState },
            tertiary: { status: tertiaryConn?.readyState === 1 ? 'connected' : 'disconnected', readyState: tertiaryConn?.readyState },
          },
        });
      }
    } else {
      // Single database health check
      const mongoose = await import('mongoose');
      const mongooseConnection = mongoose.connection;
      if (mongooseConnection.readyState === 1) {
        res.status(200).json({
          success: true,
          message: 'Database is healthy',
          mode: 'single-database',
          database: 'MongoDB',
          readyState: mongooseConnection.readyState,
        });
      } else {
        res.status(503).json({
          success: false,
          message: 'Database connection failed',
          mode: 'single-database',
          readyState: mongooseConnection.readyState,
        });
      }
    }
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      message: 'Database health check failed',
      error: error.message,
    });
  }
});

app.get('/health/redis', async (req, res) => {
  try {
    const { getRedisClient } = await import('./config/redis.js');
    const redis = getRedisClient();
    
    if (redis && redis.isOpen) {
      // Test Redis with a ping
      await redis.ping();
      
      res.status(200).json({
        success: true,
        message: 'Redis is healthy',
        cache: 'Redis (Upstash)',
        status: 'connected',
        isOpen: redis.isOpen,
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Redis connection not available',
        status: 'disconnected',
        fallback: 'Using in-memory cache',
      });
    }
  } catch (error) {
    logger.error('Redis health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      message: 'Redis health check failed',
      error: error.message,
      fallback: 'Using in-memory cache',
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/notifications', notificationRoutes);
// IMPORTANT: Specific /admin/course-access routes MUST come BEFORE generic /admin routes
app.use('/api/admin/course-access', courseAccessRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/ai", chatRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/general-group', generalGroupRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/school-channel', schoolChannelRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/push', pushRoutes);
app.use('/api', lectureProgressRoutes);
app.use('/api', quizRoutes);

// Health check - no rate limiting, keeps server awake
app.use('/', healthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
