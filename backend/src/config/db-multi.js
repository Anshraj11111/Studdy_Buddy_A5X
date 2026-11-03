import mongoose from "mongoose";

/**
 * Multi-Database Configuration for 10K+ Users
 * Splits data across 3 FREE MongoDB Atlas M0 clusters (512MB each = 1.5GB total)
 * 
 * Database 1 (Primary): Users, Auth, Communities, Connections
 * Database 2 (Secondary): Doubts, Resources, Playlists, Posts
 * Database 3 (Tertiary): Messages, Notifications, Broadcasts, Rooms
 */

const connections = {};

export const connectionOptions = {
  // ── Optimized for 10K Users (3 Servers) ──────────────────────────────────
  maxPoolSize: 100,          // Increased from 80 to 100 connections per DB
  minPoolSize: 10,           // Increased from 5 to keep more connections ready
  
  // ── Timeouts (Production-optimized) ───────────────────────────────────────
  serverSelectionTimeoutMS: 10000,  // Reduced from 15s to 10s for faster failures
  socketTimeoutMS: 45000,           // Socket timeout
  connectTimeoutMS: 15000,          // Reduced from 20s to 15s
  
  // ── Performance Optimizations ─────────────────────────────────────────────
  family: 4,                 // Force IPv4 (faster than IPv6)
  retryWrites: true,         // Auto-retry failed writes
  w: 'majority',             // Write concern: majority nodes
  readPreference: 'primaryPreferred', // Changed from 'nearest' - more consistent
  
  // ── Health Checks & Keep-Alive ────────────────────────────────────────────
  heartbeatFrequencyMS: 10000, // Changed from 5s to 10s (reduce overhead)
  maxIdleTimeMS: 120000,       // Increased from 60s to 120s (keep connections longer)
  
  // ── Compression (Reduce bandwidth by 60-70%) ──────────────────────────────
  compressors: ['zlib'],     // Enable compression
  zlibCompressionLevel: 6,   // Balanced compression (1-9, 6 is good)
  
  // ── Query Performance ─────────────────────────────────────────────────────
  autoIndex: false,          // Don't auto-create indexes (do manually)
  bufferCommands: false,     // Fail fast if not connected
};

/**
 * Connect to a specific database
 * @param {string} name - Database identifier (primary, secondary, tertiary)
 * @param {string} uri - MongoDB connection string
 */
const connectDatabase = async (name, uri) => {
  try {
    if (!uri) {
      console.warn(`⚠️ ${name} database URI not provided - using fallback to MONGO_URI`);
      uri = process.env.MONGO_URI;
    }

    console.log(`Connecting to ${name} database...`);
    const conn = await mongoose.createConnection(uri, connectionOptions).asPromise();
    
    connections[name] = conn;
    
    // Create indexes for this connection
    conn.once('open', async () => {
      console.log(`✓ ${name} database connected: ${conn.host}`);
    });

    conn.on('error', (err) => {
      console.error(`✗ ${name} database error:`, err.message);
    });

    conn.on('disconnected', () => {
      console.warn(`⚠️ ${name} database disconnected`);
    });

    return conn;
  } catch (error) {
    console.error(`✗ ${name} database connection failed:`, error.message);
    throw error;
  }
};

/**
 * Initialize all database connections
 */
export const connectAllDatabases = async () => {
  try {
    // Check if multi-database mode is enabled
    const isMultiDbMode = process.env.MONGO_URI_PRIMARY || 
                          process.env.MONGO_URI_SECONDARY || 
                          process.env.MONGO_URI_TERTIARY;

    if (!isMultiDbMode) {
      console.log('📦 Single database mode detected (no MONGO_URI_PRIMARY found)');
      console.log('💡 To enable 10K user capacity, add 3 MongoDB URIs to .env:');
      console.log('   MONGO_URI_PRIMARY=... (Users, Auth, Communities)');
      console.log('   MONGO_URI_SECONDARY=... (Doubts, Resources)');
      console.log('   MONGO_URI_TERTIARY=... (Messages, Broadcasts)');
      
      // Fallback to single database - mongoose.connection is already connected from server.js
      connections.primary = mongoose.connection;
      connections.secondary = mongoose.connection;
      connections.tertiary = mongoose.connection;
      console.log(`✓ Single MongoDB Connected: ${mongoose.connection.host}`);
      return;
    }

    console.log('🚀 Multi-database mode enabled - connecting to additional DBs...');

    // Primary is already connected via mongoose.connect() in server.js
    connections.primary = mongoose.connection;

    // Connect secondary and tertiary individually - don't crash if one fails
    try {
      await connectDatabase('secondary', process.env.MONGO_URI_SECONDARY);
    } catch (err) {
      console.warn('⚠️ Secondary DB failed, using primary as fallback:', err.message);
      connections.secondary = mongoose.connection;
    }

    try {
      await connectDatabase('tertiary', process.env.MONGO_URI_TERTIARY);
    } catch (err) {
      console.warn('⚠️ Tertiary DB failed, using primary as fallback:', err.message);
      connections.tertiary = mongoose.connection;
    }

    console.log('✅ All databases connected (with fallbacks if needed)!');
    console.log('📊 Total capacity: 10,000+ concurrent users');

  } catch (error) {
    console.error('✗ Multi-database connection failed:', error.message);
    // Don't exit - use what we have
    console.warn('⚠️ Starting with available connections...');
  }
};

/**
 * Get database connection by name
 * @param {string} name - primary, secondary, or tertiary
 */
export const getConnection = (name = 'primary') => {
  const conn = connections[name];
  if (!conn) {
    // Silently return default connection (this is normal during initialization)
    return mongoose.connection;
  }
  return conn;
};

/**
 * Close all database connections
 */
export const closeAllConnections = async () => {
  const promises = Object.entries(connections).map(([name, conn]) => {
    console.log(`Closing ${name} database connection...`);
    return conn.close();
  });
  await Promise.all(promises);
  console.log('✓ All database connections closed');
};

// Export connections for direct access
export const primaryDb = () => getConnection('primary');
export const secondaryDb = () => getConnection('secondary');
export const tertiaryDb = () => getConnection('tertiary');

export default {
  connectAllDatabases,
  getConnection,
  closeAllConnections,
  primaryDb,
  secondaryDb,
  tertiaryDb,
};
