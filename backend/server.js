import http from 'http';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import mongoose from 'mongoose';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { connectAllDatabases, connectionOptions } from './src/config/db-multi.js';
import connectRedis from './src/config/redis.js';
import setupChatSocket from './src/sockets/chat.socket.js';
import setupVideoSocket from './src/sockets/video.socket.js';
import setupGeneralGroupSocket from './src/sockets/generalGroup.socket.js';
import setupBroadcastSocket from './src/sockets/broadcast.socket.js';
import { setupSchoolChannelSocket } from './src/sockets/schoolChannel.socket.js';
import logger from './src/utils/logger.js';
import chatRoutes from "./src/routes/chatRoute.js";

dotenv.config();

// Suppress mongoose warnings
mongoose.set('strictQuery', false);

const PORT = process.env.PORT || 5000;

// Auto-kill any process occupying the port before starting
try {
  if (process.platform === 'win32') {
    execSync(`for /f "tokens=5" %a in ('netstat -aon ^| find ":${PORT}" ^| find "LISTENING"') do taskkill /F /PID %a`, { stdio: 'ignore', shell: true });
  } else {
    execSync(`lsof -ti:${PORT} | xargs kill -9`, { stdio: 'ignore' });
  }
} catch { /* port was already free */ }

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with proper CORS for production
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'https://studdy-buddy-a5x.vercel.app',
        /https:\/\/studdy-buddy.*\.vercel\.app$/,
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) return allowed.test(origin);
        return allowed === origin;
      });
      
      // Allow all origins for now — tighten in production if needed
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  // ── Increase buffer size to handle WebRTC SDP offers/answers (~50KB each) ──
  maxHttpBufferSize: 10e6,
  // WebSocket with polling fallback for Render compatibility
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingInterval: 25000,
  pingTimeout: 60000,
  connectTimeout: 45000,
});

// Setup socket handlers
setupChatSocket(io);
setupVideoSocket(io);
setupGeneralGroupSocket(io);
setupBroadcastSocket(io);
setupSchoolChannelSocket(io);

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

// Connect to databases and start server
const startServer = async () => {
  try {
    // Check if multi-database mode is enabled
    const isMultiDbMode = process.env.MONGO_URI_PRIMARY || 
                          process.env.MONGO_URI_SECONDARY || 
                          process.env.MONGO_URI_TERTIARY;

    if (isMultiDbMode) {
      console.log('🚀 Multi-database mode detected - connecting to 3 clusters...');
      await mongoose.connect(process.env.MONGO_URI_PRIMARY, connectionOptions);
      console.log('✅ Mongoose default connection set to PRIMARY DB');
      await connectAllDatabases();
    } else {
      console.log('📦 Single database mode - connecting to MongoDB...');
      await connectDB();
    }

    // Connect to Redis AND apply Socket.IO adapter for multi-server real-time sync
    // Without this, chat/notifications between users on different servers break
    if (process.env.REDIS_URL) {
      try {
        // Create 2 dedicated Redis clients for Socket.IO adapter (pub + sub)
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log('✅ Socket.IO Redis adapter enabled — multi-server real-time sync active');

        // Also connect the app-level Redis for caching
        connectRedis().catch(() => {});
      } catch (err) {
        console.warn('⚠️ Redis adapter failed — falling back to single-server mode:', err.message);
        connectRedis().catch(() => {});
      }
    } else {
      console.log('ℹ️  No REDIS_URL — Socket.IO running in single-server mode');
    }

    // Start server
    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      if (isMultiDbMode) {
        console.log('💪 Capacity: 10,000+ concurrent users (Multi-DB)');
      } else {
        console.log('⚡ Capacity: 1,500-2,000 concurrent users (Single-DB)');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`✗ Port ${PORT} is already in use. Kill the process and retry.`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  // Ignore harmless network errors (client disconnects)
  if (reason?.code === 'ECONNRESET' || reason?.code === 'EPIPE') {
    // Client disconnected - normal behavior, no need to log
    return;
  }
  logger.error('Unhandled rejection', { reason, promise });
});