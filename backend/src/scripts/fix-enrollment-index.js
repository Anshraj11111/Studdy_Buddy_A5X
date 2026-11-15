#!/usr/bin/env node

/**
 * Fix BroadcastEnrollment Index Migration
 * Changes from single user index to user+channel composite index
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixEnrollmentIndex() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studdy-buddy';
    await mongoose.connect(mongoURI);
    
    console.log('✅ Connected to MongoDB');
    
    const collection = mongoose.connection.db.collection('broadcastenrollments');
    
    console.log('🔍 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));
    
    // Drop the old unique index on user field only
    try {
      await collection.dropIndex({ user: 1 });
      console.log('🗑️ Dropped old user index');
    } catch (err) {
      console.log('ℹ️ Old user index not found (probably already dropped)');
    }
    
    // Create new composite unique index on user + channel
    try {
      await collection.createIndex({ user: 1, channel: 1 }, { unique: true });
      console.log('✅ Created new user+channel composite index');
    } catch (err) {
      console.log('ℹ️ Composite index already exists');
    }
    
    console.log('🔍 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('✅ Index migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
fixEnrollmentIndex();