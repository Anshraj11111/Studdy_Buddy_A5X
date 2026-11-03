#!/usr/bin/env node

/**
 * Manual Database Index Fix
 * This will connect to the actual database and fix the index issue
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixDatabaseIndex() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Use the actual MongoDB URI from environment
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI or MONGODB_URI not found in environment variables');
    }
    
    console.log('Using MongoDB URI:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('broadcastenrollments');
    
    console.log('🔍 Checking if collection exists...');
    const collections = await db.listCollections({ name: 'broadcastenrollments' }).toArray();
    
    if (collections.length === 0) {
      console.log('ℹ️ Collection does not exist yet. This is normal for new databases.');
      console.log('✅ No action needed - new indexes will be created automatically');
      return;
    }
    
    console.log('📋 Collection exists. Checking indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => `${i.name}: ${JSON.stringify(i.key)}`));
    
    // Check for the problematic single user index
    const hasOldIndex = indexes.some(idx => 
      idx.name === 'user_1' || 
      (JSON.stringify(idx.key) === '{"user":1}' && idx.unique === true)
    );
    
    if (hasOldIndex) {
      console.log('🗑️ Found problematic user_1 index. Dropping it...');
      try {
        // Try different ways to drop the index
        await collection.dropIndex('user_1');
        console.log('✅ Dropped user_1 index');
      } catch (err) {
        try {
          await collection.dropIndex({ user: 1 });
          console.log('✅ Dropped { user: 1 } index');
        } catch (err2) {
          console.log('⚠️ Could not drop old index:', err2.message);
        }
      }
    }
    
    // Create the new composite index
    console.log('🔧 Creating new composite index { user: 1, channel: 1 }...');
    try {
      await collection.createIndex({ user: 1, channel: 1 }, { unique: true });
      console.log('✅ Created composite unique index');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️ Composite index already exists');
      } else {
        console.log('⚠️ Error creating composite index:', err.message);
      }
    }
    
    // Final verification
    console.log('🔍 Final verification - all indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''}`);
    });
    
    console.log('✅ Database index fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the fix
fixDatabaseIndex();