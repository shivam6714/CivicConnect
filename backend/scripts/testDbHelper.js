import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../dist/config/index.js';
import { connectDB, disconnectDB, validateIsolatedTestDbUri } from '../dist/config/db.js';
import { initAuthIndexes } from '../dist/modules/auth/otp.model.js';
import { setOtpProvider, MockOtpProvider } from '../dist/providers/otp/index.js';

let activeMongod = null;

/**
 * Validates that a target database URI is strictly an isolated, local test database.
 * Uses strict parser to enforce localhost/loopback only and reject remote hosts.
 */
export function validateIsolatedTestUri(uri) {
  validateIsolatedTestDbUri(uri);

  const trimmed = uri.trim().toLowerCase();
  const rawEnvUri = process.env.MONGODB_URI?.trim().toLowerCase();
  if (
    rawEnvUri &&
    rawEnvUri === trimmed &&
    !trimmed.includes('127.0.0.1') &&
    !trimmed.includes('localhost')
  ) {
    throw new Error(
      'Database Isolation Safety Violation: Test execution rejected! ' +
        'URI matches the development/production MONGODB_URI configured in environment. ' +
        'Tests must run against an isolated in-memory database.'
    );
  }

  return true;
}

/**
 * Boots an isolated in-memory MongoDB instance via MongoMemoryServer,
 * configures Mongoose, connects, and verifies critical auth indexes.
 *
 * Guarantees:
 * - Never connects to MongoDB Atlas or production/development databases.
 * - Forces NODE_ENV='test' and config.nodeEnv='test'.
 * - Validates the memory server URI before connecting.
 */
export async function setupIsolatedTestDb() {
  // Enforce test mode and mock OTP provider
  process.env.CIVICCONNECT_TEST_MODE = 'true';
  process.env.NODE_ENV = 'test';
  config.nodeEnv = 'test';
  config.enableDb = true;
  config.otp.provider = 'mock';
  setOtpProvider(new MockOtpProvider());

  // Disconnect any lingering active connection
  if (mongoose.connection.readyState !== 0) {
    await disconnectDB();
  }

  // Start in-memory MongoDB server
  console.log('[TestDB] Initializing isolated MongoMemoryServer instance...');
  activeMongod = await MongoMemoryServer.create();
  const memoryUri = activeMongod.getUri();

  // Validate the URI against all safety rules
  validateIsolatedTestUri(memoryUri);

  // Override config.mongoUri to point strictly to the isolated in-memory instance
  config.mongoUri = memoryUri;

  console.log(`[TestDB] Connecting Mongoose to isolated in-memory instance...`);
  await connectDB();

  // Initialize and verify critical auth indexes on the isolated memory database
  await initAuthIndexes();
  console.log('[TestDB] In-memory database connected and indexes verified.');

  return { mongod: activeMongod, uri: memoryUri };
}

/**
 * Cleanly disconnects Mongoose and stops the MongoMemoryServer instance,
 * releasing all in-memory database storage.
 */
export async function teardownIsolatedTestDb(mongod = activeMongod) {
  try {
    setOtpProvider(null);
  } catch {
    // Ignore if already cleared
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDB();
    }
  } catch (err) {
    console.error('[TestDB] Error disconnecting Mongoose during teardown:', err);
  }

  try {
    if (mongod) {
      await mongod.stop();
      console.log('[TestDB] MongoMemoryServer stopped and in-memory storage destroyed.');
    }
  } catch (err) {
    console.error('[TestDB] Error stopping MongoMemoryServer during teardown:', err);
  }

  activeMongod = null;
}
