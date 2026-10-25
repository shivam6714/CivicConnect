import { config, validateConfig } from '../dist/config/index.js';
import { getDbStatus } from '../dist/config/db.js';
import mongoose from 'mongoose';

console.log('=== Verifying Config Validation & DB Error Handling ===\n');

const initialEnableDb = config.enableDb;
const initialMongoUri = config.mongoUri;

// Test 1: getDbStatus when disabled
config.enableDb = false;
console.log(`When ENABLE_DB=false, getDbStatus(): ${getDbStatus()}`);
if (getDbStatus() !== 'disabled') {
  console.error('FAIL: Expected db status to be "disabled" when ENABLE_DB=false');
  process.exit(1);
}
console.log('[PASS] DB status reports "disabled" when ENABLE_DB=false');

// Test 2: getDbStatus when enabled but disconnected
config.enableDb = true;
console.log(`When ENABLE_DB=true (disconnected), getDbStatus(): ${getDbStatus()}`);
if (getDbStatus() !== 'disconnected') {
  console.error('FAIL: Expected db status to be "disconnected" when ENABLE_DB=true and disconnected');
  process.exit(1);
}
console.log('[PASS] DB status reports "disconnected" when ENABLE_DB=true and disconnected');

// Test 3: Mongoose connection readyState should be 0 (disconnected)
if (mongoose.connection.readyState !== 0) {
  console.error('FAIL: Mongoose auto-connected on module import!');
  process.exit(1);
}
console.log('[PASS] Mongoose did NOT auto-connect on module import');

// Test 4: Clear failure when MONGODB_URI is missing while DB mode is enabled
try {
  config.enableDb = true;
  config.mongoUri = '';
  let caught = false;
  try {
    validateConfig();
  } catch (err) {
    caught = true;
    console.log(`[PASS] Caught expected validation error: "${err.message}"`);
  }
  if (!caught) {
    console.error('FAIL: validateConfig did not throw when MONGODB_URI was missing with ENABLE_DB=true');
    process.exit(1);
  }
} finally {
  config.enableDb = initialEnableDb;
  config.mongoUri = initialMongoUri;
}

console.log('\n=== All Config and DB Isolation Checks Passed ===');
