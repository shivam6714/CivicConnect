import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicconnect';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host} / database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.warn('[MongoDB] Hint: If local MongoDB is not running, configure MONGODB_URI in backend/api/.env with a local URI or free MongoDB Atlas cluster connection string.');
    return null;
  }
}
