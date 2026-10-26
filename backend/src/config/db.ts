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
 * Strict validator for test database URIs.
 * Uses a strict parser allowing ONLY verified localhost/loopback addresses (127.0.0.1, localhost, ::1).
 * Rejects every other host, including mongodb+srv: and all remote cloud/internal hosts.
 */
export function validateIsolatedTestDbUri(uri: string): void {
  if (!uri || typeof uri !== 'string' || uri.trim().length === 0) {
    throw new Error('Database Isolation Safety Error: Test database URI is missing or empty.');
  }

  const trimmed = uri.trim();
  const lower = trimmed.toLowerCase();

  // 1. mongodb+srv: is strictly forbidden as it resolves via DNS SRV to external clusters
  if (lower.startsWith('mongodb+srv:')) {
    throw new Error(
      'Database Isolation Safety Violation: Test execution rejected! ' +
        'URI uses "mongodb+srv:" which targets remote DNS-resolved clusters. ' +
        'Automated tests are strictly forbidden from connecting to MongoDB Atlas.'
    );
  }

  // 2. Must use standard mongodb:// protocol
  if (!lower.startsWith('mongodb://')) {
    throw new Error(
      'Database Isolation Safety Violation: Test execution rejected! ' +
        'Test database URI must use the standard "mongodb://" protocol.'
    );
  }

  // 3. Extract and strictly validate host component(s)
  let afterProto = trimmed.slice('mongodb://'.length);
  const atIdx = afterProto.indexOf('@');
  if (atIdx !== -1) {
    afterProto = afterProto.slice(atIdx + 1);
  }
  const slashIdx = afterProto.indexOf('/');
  const questionIdx = afterProto.indexOf('?');
  let hostPart = afterProto;
  if (slashIdx !== -1) {
    hostPart = hostPart.slice(0, slashIdx);
  }
  if (questionIdx !== -1) {
    hostPart = hostPart.slice(0, questionIdx);
  }

  const hostEntries = hostPart.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (hostEntries.length === 0) {
    throw new Error(
      'Database Isolation Safety Violation: Test database URI does not specify any valid host.'
    );
  }

  const allowedLoopbackHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

  for (const entry of hostEntries) {
    let hostOnly = entry;
    if (entry.startsWith('[')) {
      const closingBracket = entry.indexOf(']');
      if (closingBracket !== -1) {
        hostOnly = entry.slice(0, closingBracket + 1);
      }
    } else {
      const colonIdx = entry.indexOf(':');
      if (colonIdx !== -1) {
        hostOnly = entry.slice(0, colonIdx);
      }
    }

    if (!allowedLoopbackHosts.has(hostOnly)) {
      throw new Error(
        `Database Isolation Safety Violation: Test execution rejected! ` +
          `Host "${hostOnly}" is not a verified localhost/loopback address. ` +
          `Automated tests must run strictly against local loopback storage (127.0.0.1 or localhost) ` +
          `and are forbidden from connecting to remote or cloud databases.`
      );
    }
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

  // Test mode safety check: automated tests are strictly forbidden from connecting to non-loopback databases
  const isTest =
    config.nodeEnv === 'test' ||
    process.env.NODE_ENV === 'test' ||
    process.env.CIVICCONNECT_TEST_MODE === 'true';

  if (isTest) {
    validateIsolatedTestDbUri(config.mongoUri);
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
