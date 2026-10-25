import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../dist/app.js';
import { config } from '../dist/config/index.js';
import { setupIsolatedTestDb, teardownIsolatedTestDb } from './testDbHelper.js';
import { hashOtp } from '../dist/modules/auth/otp.utils.js';
import { verifyAuthToken } from '../dist/modules/auth/jwt.utils.js';
import { OtpModel, initAuthIndexes } from '../dist/modules/auth/otp.model.js';
import { OtpThrottleModel } from '../dist/modules/auth/otpThrottle.model.js';
import { UserModel } from '../dist/modules/auth/user.model.js';
import {
  setOtpProvider,
  MockOtpProvider,
} from '../dist/providers/otp/index.js';

async function runVerificationTests() {
  console.log('=== Starting CivicConnect POST /api/auth/verify-otp Verification Suite ===\n');
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

  // 1. Database Connection and Index Verification
  const isolatedDb = await setupIsolatedTestDb();
  testDbServer = isolatedDb.mongod;
  assert(mongoose.connection.readyState === 1, 'Isolated in-memory MongoDB connected for verify-otp tests');
  assert(isolatedDb.uri.startsWith('mongodb://127.0.0.1:'), 'Target database verified strictly local in-memory instance');
  assert(true, 'initAuthIndexes successfully ensured indexes on Otp, OtpThrottle, and User models in isolated test DB');

  const app = createApp();
  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(8008, resolve));
  const baseUrl = 'http://localhost:8008';

  const mockProvider = new MockOtpProvider();
  setOtpProvider(mockProvider);

  // Dedicated test phone numbers
  const testPhone1 = '+919419200001';
  const testPhone2 = '+919419200002';
  const testPhone3 = '+919419200003';
  const testPhone4 = '+919419200004';
  const testPhone5 = '+919419200005';
  const testPhone6 = '+919419200006';

  const allTestPhones = [testPhone1, testPhone2, testPhone3, testPhone4, testPhone5, testPhone6];

  try {
    // Clean up any pre-existing test data
    await OtpModel.deleteMany({ phoneNumber: { $in: allTestPhones } });
    await OtpThrottleModel.deleteMany({ phoneNumber: { $in: allTestPhones } });
    await UserModel.deleteMany({ phoneNumber: { $in: allTestPhones } });

    // ==========================================
    // 1. Input Validation Tests (verifyOtpSchema)
    // ==========================================
    console.log('--- 1. Testing Input Validation (verifyOtpSchema) ---');

    // Invalid phone number
    const invalidPhoneRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '12345', otp: '123456' }),
    });
    assert(invalidPhoneRes.status === 400, 'Rejects invalid phone number with HTTP 400');
    const invalidPhoneBody = await invalidPhoneRes.json();
    assert(invalidPhoneBody.success === false, 'Invalid phone response has success: false');

    // Non-6-digit OTP
    const shortOtpRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200001', otp: '12345' }),
    });
    assert(shortOtpRes.status === 400, 'Rejects short OTP (< 6 digits) with HTTP 400');

    // Non-numeric OTP
    const alphaOtpRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200001', otp: 'abcdef' }),
    });
    assert(alphaOtpRes.status === 400, 'Rejects non-numeric OTP with HTTP 400');

    // Invalid ward number (> 75)
    const invalidWardRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200001', otp: '123456', wardNumber: 80 }),
    });
    assert(invalidWardRes.status === 400, 'Rejects ward number > 75 with HTTP 400');

    // Name too short (< 2 characters)
    const shortNameRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200001', otp: '123456', fullName: 'A' }),
    });
    assert(shortNameRes.status === 400, 'Rejects full name < 2 characters with HTTP 400');

    // ==========================================
    // 2. Successful Verification for New Citizen
    // ==========================================
    console.log('\n--- 2. Testing Successful Verification for New Citizen ---');

    // Request OTP first
    const reqRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200001' }),
    });
    assert(reqRes.status === 200, 'OTP request succeeds with HTTP 200');

    const sentOtp1 = mockProvider.getLastSentOtpForTest(testPhone1);
    assert(typeof sentOtp1 === 'string' && sentOtp1.length === 6, 'Retrieved dispatched OTP from mock provider');

    // Submit valid verification
    const verifyRes1 = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '9419200001',
        otp: sentOtp1,
        fullName: 'Aarav Sharma',
        wardNumber: 14,
      }),
    });
    const verifyBody1 = await verifyRes1.json();
    assert(verifyRes1.status === 200, 'Valid verification returns HTTP 200');
    assert(verifyBody1.success === true, 'Response body has success: true');
    assert(typeof verifyBody1.token === 'string' && verifyBody1.token.length > 20, 'Response includes signed JWT token');

    // Verify JWT token signature and payload
    const decodedJwt = verifyAuthToken(verifyBody1.token);
    assert(decodedJwt.sub === verifyBody1.user.id, 'JWT sub matches returned citizen user id');
    assert(decodedJwt.phoneNumber === testPhone1, 'JWT phoneNumber matches normalized phone');
    assert(decodedJwt.role === 'citizen', 'JWT role is citizen');

    // Verify user profile fields in response
    assert(verifyBody1.user.phoneNumber === testPhone1, 'Returned user phoneNumber is normalized E.164');
    assert(verifyBody1.user.fullName === 'Aarav Sharma', 'Returned user fullName is correct');
    assert(verifyBody1.user.wardNumber === 14, 'Returned user wardNumber is 14');
    assert(verifyBody1.user.role === 'citizen', 'Returned user role is citizen');
    assert(verifyBody1.user.isPhoneVerified === true, 'isPhoneVerified is set to true');

    // CRITICAL: Ensure no sensitive fields leaked in HTTP response
    const rawResponse1 = JSON.stringify(verifyBody1);
    assert(!rawResponse1.includes(sentOtp1), 'CRITICAL: Plaintext OTP is NEVER returned in verify response');
    assert(!rawResponse1.toLowerCase().includes('hash'), 'CRITICAL: No hash details returned in verify response');
    assert(!rawResponse1.includes('__v'), 'Mongoose version key __v is not in response');

    // Verify database state: OTP session must be atomically marked USED
    const consumedRecord = await OtpModel.findOne({ phoneNumber: testPhone1, status: 'USED' });
    assert(consumedRecord !== null, 'OTP record in DB is transitioned to USED');
    assert(consumedRecord.isUsed === true, 'OTP record isUsed is set to true');

    // Verify database state: User record persisted in UserModel
    const dbUser = await UserModel.findOne({ phoneNumber: testPhone1 });
    assert(dbUser !== null, 'Citizen user record persisted in MongoDB UserModel');
    assert(dbUser.isPhoneVerified === true, 'Database citizen user isPhoneVerified is true');

    // ==========================================
    // 3. Existing Citizen Login & Optional Fields Preservation
    // ==========================================
    console.log('\n--- 3. Testing Existing Citizen Login & Optional Profile Preservation ---');

    // Clear cooldown for testPhone1 so we can request a new login OTP
    await OtpThrottleModel.deleteMany({ phoneNumber: testPhone1 });

    const reqRes2 = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200001' }),
    });
    assert(reqRes2.status === 200, 'Second OTP request for existing user succeeds');
    const sentOtp2 = mockProvider.getLastSentOtpForTest(testPhone1);

    // Verify without providing optional fullName or wardNumber
    const verifyRes2 = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '9419200001',
        otp: sentOtp2,
      }),
    });
    const verifyBody2 = await verifyRes2.json();
    assert(verifyRes2.status === 200, 'Existing citizen login verification succeeds with HTTP 200');

    // Profile fields must NOT be wiped by omitted optional fields
    assert(
      verifyBody2.user.fullName === 'Aarav Sharma',
      'Existing fullName was NOT overwritten by missing/undefined value'
    );
    assert(
      verifyBody2.user.wardNumber === 14,
      'Existing wardNumber was NOT overwritten by missing/undefined value'
    );
    assert(verifyBody2.user.id === dbUser._id.toString(), 'Returned user ID matches existing record');

    // Verify updating optional profile field on subsequent login
    await OtpThrottleModel.deleteMany({ phoneNumber: testPhone1 });
    await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200001' }),
    });
    const sentOtp3 = mockProvider.getLastSentOtpForTest(testPhone1);

    const verifyResUpdate = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '9419200001',
        otp: sentOtp3,
        fullName: 'Aarav Updated Sharma',
        wardNumber: 25,
      }),
    });
    const updateBody = await verifyResUpdate.json();
    assert(updateBody.user.fullName === 'Aarav Updated Sharma', 'Updates fullName when explicitly provided');
    assert(updateBody.user.wardNumber === 25, 'Updates wardNumber when explicitly provided');

    // ==========================================
    // 4. Incorrect OTP & Attempt Decrement Tracking
    // ==========================================
    console.log('\n--- 4. Testing Incorrect OTP & Attempt Decrement ---');

    // Request OTP for testPhone2
    await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200002' }),
    });

    // Attempt 1: wrong OTP
    const wrongRes1 = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200002', otp: '000000' }),
    });
    const wrongBody1 = await wrongRes1.json();
    assert(wrongRes1.status === 400, 'Wrong OTP returns HTTP 400');
    assert(wrongBody1.error.details.remainingAttempts === 2, 'Reports 2 remaining attempts after 1st failure');
    assert(wrongBody1.error.message.includes('2 attempts remaining'), 'Message reports 2 attempts remaining');

    const dbOtpAfterFail1 = await OtpModel.findOne({ phoneNumber: testPhone2, status: 'ACTIVE' });
    assert(dbOtpAfterFail1.attempts === 1, 'Database OTP document attempts count incremented to 1');

    // Attempt 2: wrong OTP again
    const wrongRes2 = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200002', otp: '111111' }),
    });
    const wrongBody2 = await wrongRes2.json();
    assert(wrongRes2.status === 400, 'Second wrong OTP returns HTTP 400');
    assert(wrongBody2.error.details.remainingAttempts === 1, 'Reports 1 remaining attempt after 2nd failure');

    // ==========================================
    // 5. Attempt Exhaustion & Invalidation
    // ==========================================
    console.log('\n--- 5. Testing Attempt Exhaustion & Invalidation ---');

    const correctOtp2 = mockProvider.getLastSentOtpForTest(testPhone2);

    // Attempt 3: wrong OTP (exhausts maxAttempts of 3)
    const wrongRes3 = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200002', otp: '222222' }),
    });
    const wrongBody3 = await wrongRes3.json();
    assert(wrongRes3.status === 400, 'Third wrong OTP returns HTTP 400');
    assert(
      wrongBody3.error.message.toLowerCase().includes('maximum verification attempts exceeded'),
      'Exhausted attempts returns clear invalidation message'
    );

    const dbOtpExhausted = await OtpModel.findOne({ phoneNumber: testPhone2, status: 'FAILED' });
    assert(dbOtpExhausted !== null, 'Exhausted OTP record is marked status: FAILED in database');
    assert(dbOtpExhausted.isUsed === true, 'Exhausted OTP record is marked isUsed: true');

    // Now submit the CORRECT OTP: must still be REJECTED because attempts are exhausted
    const correctAfterExhaustedRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200002', otp: correctOtp2 }),
    });
    assert(
      correctAfterExhaustedRes.status === 400,
      'Submitting correct OTP against exhausted/failed session is strictly rejected with HTTP 400'
    );

    // ==========================================
    // 6. OTP Reuse Prevention
    // ==========================================
    console.log('\n--- 6. Testing OTP Reuse Prevention ---');

    await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200003' }),
    });
    const sentOtp3Phone = mockProvider.getLastSentOtpForTest(testPhone3);

    // First verification succeeds
    const firstVerify = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200003', otp: sentOtp3Phone }),
    });
    assert(firstVerify.status === 200, 'Initial verification succeeds with HTTP 200');

    // Second verification with the exact same OTP must be rejected
    const reuseVerify = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200003', otp: sentOtp3Phone }),
    });
    assert(reuseVerify.status === 400, 'Reusing an already-consumed OTP strictly returns HTTP 400');

    // ==========================================
    // 7. Expired OTP Rejection
    // ==========================================
    console.log('\n--- 7. Testing Expired OTP Rejection ---');

    await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200004' }),
    });
    const sentOtp4 = mockProvider.getLastSentOtpForTest(testPhone4);

    // Artificially expire the OTP in MongoDB
    await OtpModel.updateOne(
      { phoneNumber: testPhone4, status: 'ACTIVE' },
      { $set: { expiresAt: new Date(Date.now() - 5000) } }
    );

    const expiredRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200004', otp: sentOtp4 }),
    });
    assert(expiredRes.status === 400, 'Verifying expired OTP returns HTTP 400');

    // ==========================================
    // 8. Missing OTP (No Session for Phone Number)
    // ==========================================
    console.log('\n--- 8. Testing Missing OTP ---');

    const missingRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200006', otp: '123456' }),
    });
    assert(missingRes.status === 400, 'Verification without active OTP request returns HTTP 400');

    // ==========================================
    // 9. Simultaneous / Concurrent Verification Race
    // ==========================================
    console.log('\n--- 9. Testing Simultaneous / Concurrent Verification Race ---');

    await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200005' }),
    });
    const sentOtp5 = mockProvider.getLastSentOtpForTest(testPhone5);

    // Launch two simultaneous verification requests with the same valid OTP
    const [raceRes1, raceRes2] = await Promise.all([
      fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: '9419200005', otp: sentOtp5, fullName: 'Race Citizen' }),
      }),
      fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: '9419200005', otp: sentOtp5, fullName: 'Race Citizen' }),
      }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(
      statuses[0] === 200 && statuses[1] === 400,
      'Concurrent race condition resolved safely: exactly ONE succeeds (200), other is rejected (400)'
    );

    // ==========================================
    // 10. Route Aliasing (/api/v1/auth/verify-otp)
    // ==========================================
    console.log('\n--- 10. Testing Route Aliasing (/api/v1/auth/verify-otp) ---');

    await OtpThrottleModel.deleteMany({ phoneNumber: testPhone6 });
    await fetch(`${baseUrl}/api/v1/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200006' }),
    });
    const sentOtp6 = mockProvider.getLastSentOtpForTest(testPhone6);

    const v1VerifyRes = await fetch(`${baseUrl}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9419200006', otp: sentOtp6 }),
    });
    assert(v1VerifyRes.status === 200, 'POST /api/v1/auth/verify-otp succeeds identically');
  } finally {
    // Clean up test data from MongoDB
    await OtpModel.deleteMany({ phoneNumber: { $in: allTestPhones } });
    await OtpThrottleModel.deleteMany({ phoneNumber: { $in: allTestPhones } });
    await UserModel.deleteMany({ phoneNumber: { $in: allTestPhones } });

    setOtpProvider(null);
    await new Promise((resolve) => testServer.close(resolve));
    await teardownIsolatedTestDb(testDbServer);
  }

  console.log(`\n=== Verification Complete: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationTests().catch((err) => {
  console.error('Verify-OTP Test Runner Exception:', err);
  process.exit(1);
});
