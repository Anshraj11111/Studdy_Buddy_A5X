import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000,
    };

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, options);

    // Create indexes for faster auth queries
    mongoose.connection.once('open', async () => {
      try {
        const db = mongoose.connection.db;
        await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true });
        console.log('✓ DB indexes verified');
      } catch { /* indexes may already exist */ }
    });

    console.log(`✓ MongoDB Connected: ${mongoose.connection.host}`);

  } catch (error) {
    console.error(`✗ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;