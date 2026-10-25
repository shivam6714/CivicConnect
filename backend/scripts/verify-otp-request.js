import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../dist/app.js';
import { config } from '../dist/config/index.js';
import { setupIsolatedTestDb, teardownIsolatedTestDb } from './testDbHelper.js';
import {
  generateSecureOtp,
  hashOtp,
  verifyOtpHash,
  isOtpExpired,
} from '../dist/modules/auth/otp.utils.js';
import { requestOtpSchema } from '../dist/modules/auth/auth.types.js';
import {
  OtpModel,
  initAuthIndexes,
  areAuthIndexesReady,
} from '../dist/modules/auth/otp.model.js';
import {
  OtpThrottleModel,
  checkAndAcquireOtpThrottle,
  rollbackOtpThrottle,
  MAX_OTP_REQUESTS_PER_WINDOW,
} from '../dist/modules/auth/otpThrottle.model.js';
import {
  getOtpProvider,
  setOtpProvider,
  MockOtpProvider,
} from '../dist/providers/otp/index.js';

async function runOtpTests() {
  console.log('=== Starting CivicConnect POST /api/auth/request-otp Verification & Hardening Suite ===\n');
  let passed = 0;
  let failed = 0;
  let testDbServer = null;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  function assertThrows(fn, testName, expectedSubstring) {
    try {
      fn();
      console.error(`[FAIL] ${testName} (Expected exception but none was thrown)`);
      failed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!expectedSubstring || message.toLowerCase().includes(expectedSubstring.toLowerCase())) {
        console.log(`[PASS] ${testName} (Threw: "${message}")`);
        passed++;
      } else {
        console.error(`[FAIL] ${testName} (Threw unexpected message: "${message}")`);
        failed++;
      }
    }
  }

  // ==========================================
  // 1. Cryptographic OTP Generation & Entropy
  // ==========================================
  console.log('--- 1. Testing Cryptographic OTP Generation ---');
  const sampleOtps = new Set();
  for (let i = 0; i < 50; i++) {
    const otp = generateSecureOtp();
    assert(/^\d{6}$/.test(otp), `OTP "${otp}" is strictly a 6-digit string`);
    const num = parseInt(otp, 10);
    assert(num >= 100000 && num <= 999999, `OTP ${num} is within range [100000, 999999]`);
    sampleOtps.add(otp);
  }
  assert(sampleOtps.size > 45, `Entropy check: ${sampleOtps.size}/50 unique OTPs generated`);

  // ==========================================
  // 2. Dedicated Pepper & Salted HMAC-SHA256
  // ==========================================
  console.log('\n--- 2. Testing Dedicated OTP Pepper & Salted HMAC-SHA256 ---');
  const testOtp = '849201';
  const customPepper = 'dedicated_super_strong_otp_pepper_secret_2026';
  const wrongPepper = 'wrong_attacker_pepper_secret_key_1234567890';

  // A. Hash generation format
  const hashedWithPepper = hashOtp(testOtp, undefined, customPepper);
  assert(typeof hashedWithPepper === 'string' && hashedWithPepper.includes(':'), 'Hash format contains salt and HMAC separated by colon');
  assert(hashedWithPepper !== testOtp, 'Plaintext OTP is never equal to hashed OTP');

  // B. Random salt uniqueness check
  const hashedAgain = hashOtp(testOtp, undefined, customPepper);
  assert(hashedWithPepper !== hashedAgain, 'Different random salts produce distinct hashes for identical OTP and pepper');

  // C. Verification with correct secret
  assert(verifyOtpHash(testOtp, hashedWithPepper, customPepper) === true, 'verifyOtpHash succeeds with correct OTP and correct pepper');

  // D. Verification FAILS with wrong secret (prevents offline cracking without pepper)
  assert(verifyOtpHash(testOtp, hashedWithPepper, wrongPepper) === false, 'verifyOtpHash strictly FAILS with wrong pepper');

  // E. Verification FAILS with wrong OTP
  assert(verifyOtpHash('123456', hashedWithPepper, customPepper) === false, 'verifyOtpHash fails with wrong OTP');

  // F. Verification fails on empty inputs or malformed hash
  assert(verifyOtpHash('', hashedWithPepper, customPepper) === false, 'verifyOtpHash fails with empty candidate');
  assert(verifyOtpHash(testOtp, 'invalid-hash-string', customPepper) === false, 'verifyOtpHash safely handles malformed hash');
  assert(verifyOtpHash(testOtp, hashedWithPepper, '') === false, 'verifyOtpHash fails if pepper is missing');

  // G. hashOtp fails safely if pepper is missing or empty
  assertThrows(
    () => hashOtp(testOtp, undefined, ''),
    'hashOtp throws error when OTP_SECRET pepper is empty',
    'OTP_SECRET is missing or empty'
  );

  // ==========================================
  // 3. Application-Level Expiration Logic
  // ==========================================
  console.log('\n--- 3. Testing Expiration Logic ---');
  const futureExpiry = new Date(Date.now() + 5 * 60 * 1000);
  const pastExpiry = new Date(Date.now() - 1000);
  assert(isOtpExpired(futureExpiry) === false, 'Future timestamp is not expired');
  assert(isOtpExpired(pastExpiry) === true, 'Past timestamp is expired');

  // ==========================================
  // 4. Request Validation Schema (Zod)
  // ==========================================
  console.log('\n--- 4. Testing requestOtpSchema Validation ---');
  const validParsed = requestOtpSchema.parse({ phoneNumber: '9419112345' });
  assert(validParsed.phoneNumber === '+919419112345', 'Normalizes 10-digit number to +91 format');

  const validWithPrefix = requestOtpSchema.parse({ phoneNumber: '+919876543210' });
  assert(validWithPrefix.phoneNumber === '+919876543210', 'Preserves valid +91 number');

  let invalidCaught = false;
  try {
    requestOtpSchema.parse({ phoneNumber: '5512345678' });
  } catch {
    invalidCaught = true;
  }
  assert(invalidCaught, 'Rejects mobile starting with 5');

  let tooShortCaught = false;
  try {
    requestOtpSchema.parse({ phoneNumber: '12345' });
  } catch {
    tooShortCaught = true;
  }
  assert(tooShortCaught, 'Rejects short mobile number');

  let emptyCaught = false;
  try {
    requestOtpSchema.parse({});
  } catch {
    emptyCaught = true;
  }
  assert(emptyCaught, 'Rejects missing phoneNumber field');

  // ==========================================
  // 5. Explicit Index Initialization Verification
  // ==========================================
  console.log('\n--- 5. Testing Explicit Index Initialization ---');
  const isolatedDb = await setupIsolatedTestDb();
  testDbServer = isolatedDb.mongod;
  assert(mongoose.connection.readyState === 1, 'Isolated in-memory MongoDB connected for test suite');
  assert(isolatedDb.uri.startsWith('mongodb://127.0.0.1:'), 'Target database verified strictly local in-memory instance');
  assert(areAuthIndexesReady() === true, 'initAuthIndexes marks auth indexes as ready in isolated test DB');

  const otpIndexes = await OtpModel.listIndexes();
  const indexNames = otpIndexes.map((idx) => idx.name);
  assert(
    indexNames.some((n) => n.includes('expiresAt')),
    'OtpModel contains TTL index on expiresAt'
  );
  assert(
    indexNames.some((n) => n.includes('phoneNumber') && n.includes('status')),
    'OtpModel contains compound index on phoneNumber and status'
  );

  const throttleIndexes = await OtpThrottleModel.listIndexes();
  const throttleIndexNames = throttleIndexes.map((idx) => idx.name);
  assert(
    throttleIndexNames.some((n) => n.includes('phoneNumber')),
    'OtpThrottleModel contains unique index on phoneNumber'
  );
  assert(
    throttleIndexNames.some((n) => n.includes('expiresAt')),
    'OtpThrottleModel contains TTL index on expiresAt'
  );

  // ==========================================
  // 6. HTTP API Integration & Delivery State Machine
  // ==========================================
  console.log('\n--- 6. Testing HTTP POST /api/auth/request-otp & State Machine ---');

  const app = createApp();
  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(8007, resolve));
  const baseUrl = 'http://localhost:8007';

  const testPhone = '+919419199991';
  const testPhoneRaw = '9419199991';

  try {
    // Clean up test records
    await OtpModel.deleteMany({ phoneNumber: testPhone });
    await OtpThrottleModel.deleteMany({ phoneNumber: testPhone });

    // Activate MockOtpProvider
    const mockProvider = new MockOtpProvider();
    setOtpProvider(mockProvider);

    // Test A: Invalid input returns HTTP 400
    const invalidRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '123' }),
    });
    const invalidBody = await invalidRes.json();
    assert(invalidRes.status === 400, 'Invalid phone number returns HTTP 400');
    assert(invalidBody.success === false, 'Invalid response has success: false');
    assert(invalidBody.error.statusCode === 400, 'Error status code is 400');
    assert(Array.isArray(invalidBody.error.details), 'Error includes Zod details array');

    // Test B: Empty body returns HTTP 400
    const emptyRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(emptyRes.status === 400, 'Empty body returns HTTP 400');

    // Test C: Valid request returns HTTP 200 and transitions state to ACTIVE
    const validRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: testPhoneRaw }),
    });
    const validBody = await validRes.json();
    assert(validRes.status === 200, 'Valid request returns HTTP 200');
    assert(validBody.success === true, 'Response body has success: true');
    assert(typeof validBody.message === 'string', 'Response contains descriptive generic message');
    assert(validBody.cooldownSeconds === 60, 'Response includes cooldownSeconds');

    // CRITICAL SECURITY ASSERTION 1: Plaintext OTP NEVER in HTTP response
    const rawResponseText = JSON.stringify(validBody);
    const sentOtp = mockProvider.getLastSentOtpForTest(testPhone);
    assert(typeof sentOtp === 'string' && sentOtp.length === 6, 'Mock provider received dispatched 6-digit OTP');
    assert(!rawResponseText.includes(sentOtp), 'CRITICAL: Plaintext OTP is NEVER present in HTTP response body');
    assert(!rawResponseText.toLowerCase().includes('hash'), 'Response body contains no internal hash details');

    // CRITICAL SECURITY ASSERTION 2: Database state machine and peppered hash
    const dbRecord = await OtpModel.findOne({ phoneNumber: testPhone, status: 'ACTIVE' });
    assert(dbRecord !== null, 'Active OTP record found in MongoDB');
    assert(dbRecord.status === 'ACTIVE', 'Record successfully transitioned from PENDING_DELIVERY to ACTIVE');
    assert(dbRecord.hashedOtp !== sentOtp, 'CRITICAL: Database hashedOtp is NOT plaintext OTP');
    assert(
      verifyOtpHash(sentOtp, dbRecord.hashedOtp) === true,
      'Stored hash successfully validates against delivered OTP using config.otpSecret'
    );
    assert(
      verifyOtpHash(sentOtp, dbRecord.hashedOtp, wrongPepper) === false,
      'Stored hash cannot be verified with wrong pepper'
    );
    assert(dbRecord.attempts === 0, 'Initial attempts count is 0');
    assert(dbRecord.maxAttempts === 3, 'Default maxAttempts is 3');
    assert(dbRecord.expiresAt.getTime() > Date.now(), 'OTP expiresAt is set in the future');
    assert(dbRecord.isUsed === false, 'Initial isUsed status is false');

    // Test D: Resend Cooldown Throttling (immediate second request)
    console.log('\n--- 7. Testing Cooldown & Throttling Protection ---');
    const cooldownRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: testPhoneRaw }),
    });
    const cooldownBody = await cooldownRes.json();
    assert(cooldownRes.status === 429, 'Immediate second request returns HTTP 429 (cooldown active)');
    assert(cooldownBody.success === false, 'Cooldown response has success: false');
    assert(cooldownBody.error.statusCode === 429, 'Cooldown error code is 429');
    assert(
      cooldownBody.error.message.includes('seconds before requesting a new OTP'),
      'Cooldown message informs user to wait'
    );
    assert(
      typeof cooldownBody.error.details?.retryAfter === 'number',
      'Cooldown response details include retryAfter seconds'
    );

    // Test E: Rate Limit Window Exhaustion (24-hour limit)
    console.log('\n--- 8. Testing 24-Hour Max Requests Throttling ---');
    const throttlePhone = '+919419199992';
    await OtpModel.deleteMany({ phoneNumber: throttlePhone });
    await OtpThrottleModel.deleteMany({ phoneNumber: throttlePhone });

    // Artificially simulate reaching MAX_OTP_REQUESTS_PER_WINDOW
    await OtpThrottleModel.create({
      phoneNumber: throttlePhone,
      lastRequestedAt: new Date(Date.now() - 120 * 1000), // cooldown expired 2m ago
      requestCount: MAX_OTP_REQUESTS_PER_WINDOW,          // max requests reached
      windowStartTime: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      expiresAt: new Date(Date.now() + 23 * 3600 * 1000),
    });

    const rateLimitRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419199992' }),
    });
    const rateLimitBody = await rateLimitRes.json();
    assert(rateLimitRes.status === 429, 'Exceeded window requests returns HTTP 429');
    assert(
      rateLimitBody.error.message.toLowerCase().includes('maximum otp request limit reached'),
      'Clear rate limit error message returned'
    );

    // Test F: Safe Failure Strategy on Provider Outage (Failed State & Throttle Rollback)
    console.log('\n--- 9. Testing Provider Failure & Safe State Transition ---');
    const failPhone = '+919419199993';
    await OtpModel.deleteMany({ phoneNumber: failPhone });
    await OtpThrottleModel.deleteMany({ phoneNumber: failPhone });

    // Install a failing mock provider
    const failingProvider = {
      name: 'failing-mock',
      async sendOtp() {
        throw new Error('Simulated SMS gateway connection timeout');
      },
    };
    setOtpProvider(failingProvider);

    const failRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419199993' }),
    });
    const failBody = await failRes.json();
    assert(failRes.status === 502, 'Provider failure returns HTTP 502 Bad Gateway');
    assert(failBody.success === false, 'Failure response has success: false');

    // CRITICAL SECURITY ASSERTION 3: No ACTIVE usable OTP in database after delivery failure
    const activeDanglingOtp = await OtpModel.findOne({ phoneNumber: failPhone, status: 'ACTIVE' });
    assert(activeDanglingOtp === null, 'CRITICAL: Delivery failure left NO ACTIVE usable OTP in DB');

    // Throttle rollback assertion: Citizen is not blocked from retrying after provider failure
    const throttleAfterFail = await OtpThrottleModel.findOne({ phoneNumber: failPhone });
    assert(
      throttleAfterFail === null || throttleAfterFail.lastRequestedAt.getTime() === 0,
      'Throttle state was rolled back to permit retry after provider outage'
    );

    // Test G: Throttle Rollback Concurrency Protection
    console.log('\n--- 10. Testing Throttle Rollback Concurrency Protection ---');
    const concurrencyPhone = '+919419199995';
    await OtpThrottleModel.deleteMany({ phoneNumber: concurrencyPhone });

    // Initial acquire at T1
    const t1Snapshot = await checkAndAcquireOtpThrottle(concurrencyPhone, 60);
    const initialDoc = await OtpThrottleModel.findOne({ phoneNumber: concurrencyPhone });
    assert(initialDoc.requestCount === 1, 'Initial request count is 1');

    // Simulate a newer request updating the record at T2 (newer than T1)
    const t2Time = new Date(Date.now() + 1000);
    await OtpThrottleModel.updateOne(
      { phoneNumber: concurrencyPhone },
      { $set: { lastRequestedAt: t2Time, requestCount: 2 } }
    );

    // Attempt rollback with older T1 timestamp (should NOT overwrite newer T2 state)
    await rollbackOtpThrottle(concurrencyPhone, t1Snapshot.acquiredAt);
    const docAfterOldRollback = await OtpThrottleModel.findOne({ phoneNumber: concurrencyPhone });
    assert(
      docAfterOldRollback.lastRequestedAt.getTime() === t2Time.getTime(),
      'Rollback with stale acquiredAt did NOT overwrite newer concurrent state'
    );
    assert(
      docAfterOldRollback.requestCount === 2,
      'Rollback with stale acquiredAt did NOT decrement newer requestCount'
    );

    // Now rollback with matching T2 timestamp
    await rollbackOtpThrottle(concurrencyPhone, t2Time);
    const docAfterValidRollback = await OtpThrottleModel.findOne({ phoneNumber: concurrencyPhone });
    assert(
      docAfterValidRollback.requestCount === 1 && docAfterValidRollback.lastRequestedAt.getTime() === 0,
      'Rollback with matching acquiredAt successfully rolled back state'
    );

    // Test H: Verify /api/v1/auth/request-otp routing
    console.log('\n--- 11. Testing Route Aliasing (/api/v1/auth/request-otp) ---');
    setOtpProvider(new MockOtpProvider());
    const v1Phone = '9419199994';
    await OtpModel.deleteMany({ phoneNumber: '+919419199994' });
    await OtpThrottleModel.deleteMany({ phoneNumber: '+919419199994' });

    const v1Res = await fetch(`${baseUrl}/api/v1/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: v1Phone }),
    });
    assert(v1Res.status === 200, 'POST /api/v1/auth/request-otp succeeds identically');
  } finally {
    // Cleanup test documents from MongoDB
    await OtpModel.deleteMany({
      phoneNumber: {
        $in: [testPhone, '+919419199992', '+919419199993', '+919419199994', '+919419199995'],
      },
    });
    await OtpThrottleModel.deleteMany({
      phoneNumber: {
        $in: [testPhone, '+919419199992', '+919419199993', '+919419199994', '+919419199995'],
      },
    });

    setOtpProvider(null);
    await new Promise((resolve) => testServer.close(resolve));
    await teardownIsolatedTestDb(testDbServer);
  }

  console.log(`\n=== Verification Complete: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runOtpTests().catch((err) => {
  console.error('OTP Test Runner Exception:', err);
  process.exit(1);
});
