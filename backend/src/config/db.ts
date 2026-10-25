import mongoose from 'mongoose';
import { config } from './index.js';

export type DatabaseStatus = 'connected' | 'connecting' | 'disconnecting' | 'disconnected' | 'disabled';

let areListenersRegistered = false;

/**
 * Registers Mongoose connection lifecycle listeners exactly once.
 * Prevents duplicate listener registration when connectDB() is invoked multiple times.
 */
export function registerConnectionListeners(): void {
  if (areListenersRegistered) {
    return;
  }

  mongoose.connection.on('connected', () => {
    console.log('[MongoDB] Connected to database instance.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('[MongoDB] Connection disconnected.');
  });

  areListenersRegistered = true;
}

/**
 * Checks whether Mongoose currently has an active, established connection.
 */
export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Returns current MongoDB connection status.
 */
export function getDbStatus(): DatabaseStatus {
  if (!config.enableDb) {
    return 'disabled';
  }

  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}

/**
 * Connects to MongoDB using Mongoose.
 * This is NOT called automatically on import to ensure test isolation.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (!config.mongoUri) {
    throw new Error(
      'Cannot connect to database: MONGODB_URI is not configured. ' +
        'Set MONGODB_URI in .env or disable database mode via ENABLE_DB=false.'
    );
  }

  // Ensure listeners are registered at most once
  registerConnectionListeners();

  // Return existing active connection if already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    return conn;
  } catch (error) {
    console.error('[MongoDB] Failed to establish initial connection:', error);
    throw error;
  }
}

/**
 * Disconnects from MongoDB cleanly.
 */
export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected successfully.');
  }
}
