import mongoose from 'mongoose';

export const dbState = {
  isConnected: false,
  mode: 'disconnected',
  uri: '',
  error: null,
};

/**
 * Connect to MongoDB database with graceful fallback detection
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicconnect';
  dbState.uri = uri;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout to detect local daemon
    });

    dbState.isConnected = true;
    dbState.mode = 'mongodb';
    dbState.error = null;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    dbState.isConnected = false;
    dbState.mode = 'memory-fallback';
    dbState.error = error.message;

    console.warn(`[MongoDB] Warning: Could not connect to MongoDB at "${uri}".`);
    console.warn(`[MongoDB] Reason: ${error.message}`);
    console.warn('[MongoDB] Activating in-memory storage fallback so backend endpoints remain fully operational and testable.');
    console.warn('[MongoDB] To persist to a real database, ensure MongoDB is running or configure MONGODB_URI in backend/api/.env with a valid MongoDB connection string.');
    return null;
  }
}
