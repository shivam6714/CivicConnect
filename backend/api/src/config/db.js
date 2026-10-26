import mongoose from 'mongoose';

export const dbState = {
  isConnected: false,
  mode: 'disconnected',
  uri: '',
  error: null,
};

// Wire dynamic Mongoose connection event listeners
mongoose.connection.on('connected', () => {
  dbState.isConnected = true;
  dbState.mode = 'mongodb';
  dbState.error = null;
});

mongoose.connection.on('disconnected', () => {
  dbState.isConnected = false;
  dbState.mode = 'disconnected';
});

mongoose.connection.on('error', (err) => {
  dbState.isConnected = false;
  dbState.error = err.message;
});

/**
 * Check if MongoDB connection is active and ready
 */
export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

/**
 * Connect to MongoDB database
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicconnect';
  dbState.uri = uri;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    dbState.isConnected = true;
    dbState.mode = 'mongodb';
    dbState.error = null;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    dbState.isConnected = false;
    dbState.mode = 'disconnected';
    dbState.error = error.message;

    console.warn(`[MongoDB] Warning: Could not connect to MongoDB at "${uri}".`);
    console.warn(`[MongoDB] Reason: ${error.message}`);
    return null;
  }
}
