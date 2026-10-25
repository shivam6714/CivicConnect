import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../dist/config/index.js';
import { connectDB, disconnectDB } from '../dist/config/db.js';
import { initAuthIndexes } from '../dist/modules/auth/otp.model.js';

let activeMongod = null;

/**
 * Validates that a target database URI is strictly an isolated, local test database.
 * Throws a descriptive error if the URI targets MongoDB Atlas, cloud providers,
 * or matches the non-test MONGODB_URI configured in .env.
 */
export function validateIsolatedTestUri(uri) {
  if (!uri || typeof uri !== 'string' || uri.trim().length === 0) {
    throw new Error('Database Isolation Safety Error: Test database URI is missing or empty.');
  }

  const trimmed = uri.trim().toLowerCase();

  // 1. Strict rejection of MongoDB Atlas SRV connection strings
  if (trimmed.startsWith('mongodb+srv:')) {
    throw new Error(
      'Database Isolation Safety Violation: Test execution rejected! ' +
        'URI uses "mongodb+srv:" which targets a remote cloud cluster. ' +
        'Automated tests are strictly forbidden from connecting to MongoDB Atlas.'
    );
  }

  // 2. Strict rejection of cloud database domains
  if (
    trimmed.includes('mongodb.net') ||
    trimmed.includes('.azure.') ||
    trimmed.includes('.aws.') ||
    trimmed.includes('.digitalocean.') ||
    trimmed.includes('.gcp.')
  ) {
    throw new Error(
      'Database Isolation Safety Violation: Test execution rejected! ' +
        'URI targets a remote cloud database domain. Tests must run exclusively against an isolated in-memory or local test database.'
    );
  }

  // 3. Strict rejection if URI matches the configured development/production MONGODB_URI from .env
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

  // 4. Accept only verified local loopback in-memory instances
  const isLocalLoopback =
    trimmed.startsWith('mongodb://127.0.0.1:') ||
    trimmed.startsWith('mongodb://localhost:') ||
    trimmed.startsWith('mongodb://[::1]:');

  if (!isLocalLoopback) {
    throw new Error(
      `Database Isolation Safety Violation: Test execution rejected! ` +
        `URI is not recognized as a safe, isolated local test database.`
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
  // Ensure test mode
  process.env.NODE_ENV = 'test';
  config.nodeEnv = 'test';
  config.enableDb = true;

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
