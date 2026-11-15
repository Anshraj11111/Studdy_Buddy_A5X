/**
 * Model Registry for Multi-Database Setup
 * 
 * This file maps each model to its appropriate database connection
 * for optimal distribution across 3 MongoDB clusters
 * 
 * Distribution Strategy:
 * - PRIMARY DB: Frequently accessed data (Users, Auth, Communities, Connections)
 * - SECONDARY DB: Content data (Doubts, Resources, Playlists, Posts)
 * - TERTIARY DB: Real-time data (Messages, Notifications, Broadcasts, Rooms)
 */

export const MODEL_DATABASE_MAP = {
  // ═══════════════════════════════════════════════════════════════
  // PRIMARY DATABASE (User-centric, auth, social connections)
  // ═══════════════════════════════════════════════════════════════
  User: 'primary',
  Community: 'primary',
  Connection: 'primary',
  MentorRequest: 'primary',
  
  // ═══════════════════════════════════════════════════════════════
  // SECONDARY DATABASE (Content, learning materials, school channels)
  // ═══════════════════════════════════════════════════════════════
  Doubt: 'secondary',
  Resource: 'secondary',
  Playlist: 'secondary',
  Post: 'secondary',
  FeedPost: 'secondary',
  SchoolChannel: 'secondary',
  
  // ═══════════════════════════════════════════════════════════════
  // TERTIARY DATABASE (Real-time, messaging, broadcasts, school messages)
  // ═══════════════════════════════════════════════════════════════
  Message: 'tertiary',
  GroupMessage: 'tertiary',
  Notification: 'tertiary',
  Room: 'tertiary',
  GroupMember: 'tertiary',
  BroadcastStream: 'tertiary',
  BroadcastMessage: 'tertiary',
  BroadcastCode: 'tertiary',
  BroadcastEnrollment: 'tertiary',
  BroadcastJoinRequest: 'tertiary',
  SchoolChannelMessage: 'tertiary',
};

/**
 * Get the database connection name for a model
 * @param {string} modelName - Name of the model
 * @returns {string} Database connection name (primary, secondary, or tertiary)
 */
export const getModelDatabase = (modelName) => {
  return MODEL_DATABASE_MAP[modelName] || 'primary';
};

/**
 * Get all models for a specific database
 * @param {string} dbName - Database name (primary, secondary, tertiary)
 * @returns {string[]} Array of model names
 */
export const getModelsForDatabase = (dbName) => {
  return Object.entries(MODEL_DATABASE_MAP)
    .filter(([_, db]) => db === dbName)
    .map(([model, _]) => model);
};

export default {
  MODEL_DATABASE_MAP,
  getModelDatabase,
  getModelsForDatabase,
};
