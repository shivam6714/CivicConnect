import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../dist/app.js';
import { config, validateConfig, parseCorsConfig } from '../dist/config/index.js';
import { getDbStatus, isDbConnected, registerConnectionListeners } from '../dist/config/db.js';
import { getOtpProvider, setOtpProvider, MockOtpProvider } from '../dist/providers/otp/index.js';
import { isValidIndianMobile, normalizeIndianMobile, maskPhoneNumber } from '../dist/utils/phone.js';
import { validateIsolatedTestUri } from './testDbHelper.js';

async function runTests() {
  console.log('=== Starting CivicConnect Backend Foundation Hardening Verification ===\n');
  let passed = 0;
  let failed = 0;

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
  // 1. Phone Utilities
  // ==========================================
  console.log('--- 1. Testing Phone Utilities ---');
  assert(isValidIndianMobile('9419112345') === true, 'Valid 10-digit Indian mobile (starts with 9)');
  assert(isValidIndianMobile('+919876543210') === true, 'Valid Indian mobile with +91');
  assert(isValidIndianMobile('8899012345') === true, 'Valid 10-digit Indian mobile (starts with 8)');
  assert(isValidIndianMobile('5512345678') === false, 'Invalid Indian mobile (starts with 5)');
  assert(isValidIndianMobile('12345') === false, 'Invalid mobile (too short)');
  assert(normalizeIndianMobile('09419112345') === '+919419112345', 'Normalizes 0-prefixed number to +91');
  assert(maskPhoneNumber('+919419112345') === '+91******2345', 'Masks phone number safely for logs');

  // ==========================================
  // 2. Production OTP Safety
  // ==========================================
  console.log('\n--- 2. Testing Production OTP Safety ---');
  const savedNodeEnv = config.nodeEnv;
  const savedOtpProvider = config.otp.provider;

  try {
    // Development mode behavior
    config.nodeEnv = 'development';
    config.otp.provider = 'mock';
    setOtpProvider(null);
    const devOtpProvider = getOtpProvider();
    assert(devOtpProvider.name === 'mock', 'Mock provider allowed in development mode');

    const result = await devOtpProvider.sendOtp({
      recipient: '+919419112345',
      otp: '782914',
      expiryMinutes: 5,
    });
    assert(result.success === true, 'Mock OTP dispatch succeeds in development');
    assert(typeof result.messageId === 'string' && result.messageId.length > 0, 'Generates unique messageId');

    // Switch to production mode
    config.nodeEnv = 'production';

    // A. validateConfig() rejects OTP_PROVIDER=mock in production
    config.otp.provider = 'mock';
    config.jwtSecret = 'a_very_secure_and_long_random_jwt_secret_key_123456';
    assertThrows(
      () => validateConfig(),
      'validateConfig rejects OTP_PROVIDER="mock" in production',
      'OTP_PROVIDER cannot be "mock"'
    );

    // B. MockOtpProvider constructor throws in production
    assertThrows(
      () => new MockOtpProvider(),
      'MockOtpProvider constructor throws error in production mode',
      'cannot be instantiated in production'
    );

    // C. getOtpProvider rejects mock in production
    setOtpProvider(null);
    assertThrows(
      () => getOtpProvider(),
      'getOtpProvider throws when provider is mock in production',
      'MockOtpProvider cannot be used in production'
    );

    // D. getOtpProvider rejects unknown provider in production (prohibiting silent fallback)
    config.otp.provider = 'unsupported_sms_gateway';
    setOtpProvider(null);
    assertThrows(
      () => getOtpProvider(),
      'getOtpProvider prohibits silent fallback to mock in production',
      'Silent fallback to MockOtpProvider is strictly forbidden'
    );
  } finally {
    config.nodeEnv = savedNodeEnv;
    config.otp.provider = savedOtpProvider;
    setOtpProvider(null);
  }

  // ==========================================
  // 3. JWT Configuration Hardening
  // ==========================================
  console.log('\n--- 3. Testing JWT and OTP Pepper Configuration Hardening ---');
  const savedJwtSecret = config.jwtSecret;
  const savedOtpSecret = config.otpSecret;

  try {
    config.nodeEnv = 'production';
    config.otp.provider = 'real_cdac_sms'; // valid non-mock provider for this test
    config.otpSecret = 'super_secret_otp_pepper_production_civicconnect_2026';

    // A. Empty JWT secret in production
    config.jwtSecret = '';
    assertThrows(
      () => validateConfig(),
      'validateConfig rejects empty JWT_SECRET in production',
      'JWT_SECRET is required'
    );

    // B. Placeholder JWT secret in production
    config.jwtSecret = 'your_jwt_secret_key_change_in_production';
    assertThrows(
      () => validateConfig(),
      'validateConfig rejects placeholder JWT_SECRET in production',
      'insecure placeholder'
    );

    // C. Short JWT secret in production (< 32 chars)
    config.jwtSecret = 'too_short_secret_key_123';
    assertThrows(
      () => validateConfig(),
      'validateConfig rejects JWT_SECRET shorter than 32 chars in production',
      'at least 32 characters'
    );

    // D. Strong JWT secret passes with valid OTP secret
    config.jwtSecret = 'super_secret_cryptographic_key_jammu_production_civicconnect_2026';
    let passedValidSecret = true;
    try {
      validateConfig();
    } catch (err) {
      passedValidSecret = false;
      console.error('Unexpected failure on valid production config:', err);
    }
    assert(passedValidSecret, 'validateConfig accepts strong 32+ char JWT secret in production');

    // E. Empty OTP_SECRET in production
    config.otpSecret = '';
    assertThrows(
      () => validateConfig(),
      'validateConfig rejects empty OTP_SECRET in production',
      'OTP_SECRET is required'
    );

    // F. Placeholder OTP_SECRET in production
    config.otpSecret = 'dev_otp_pepper_secret_civicconnect_jammu_2026';
    assertThrows(
      () => validateConfig(),
      'validateConfig rejects placeholder OTP_SECRET in production',
      'insecure placeholder'
    );

    // G. Short OTP_SECRET in production (< 32 chars)
    config.otpSecret = 'short_otp_secret_key';
    assertThrows(
      () => validateConfig(),
      'validateConfig rejects OTP_SECRET shorter than 32 chars in production',
      'at least 32 characters'
    );

    // H. Strong OTP_SECRET passes
    config.otpSecret = 'super_strong_otp_pepper_secret_production_civicconnect_2026';
    let passedValidOtpSecret = true;
    try {
      validateConfig();
    } catch (err) {
      passedValidOtpSecret = false;
      console.error('Unexpected failure on valid OTP_SECRET config:', err);
    }
    assert(passedValidOtpSecret, 'validateConfig accepts strong 32+ char OTP pepper secret in production');
  } finally {
    config.nodeEnv = savedNodeEnv;
    config.jwtSecret = savedJwtSecret;
    config.otpSecret = savedOtpSecret;
    config.otp.provider = savedOtpProvider;
  }


  // ==========================================
  // 4. CORS Configuration & Credential Safety
  // ==========================================
  console.log('\n--- 4. Testing CORS Configuration & Credential Safety ---');
  const wildcardCors = parseCorsConfig('*');
  assert(wildcardCors.corsOrigin === '*', 'parseCorsConfig(*) returns wildcard origin');
  assert(wildcardCors.corsCredentials === false, 'Wildcard CORS strictly disables credentials (browser safety)');

  const allowlistCors = parseCorsConfig('http://localhost:3000, http://localhost:5173');
  assert(
    Array.isArray(allowlistCors.corsOrigin) &&
      allowlistCors.corsOrigin.includes('http://localhost:3000') &&
      allowlistCors.corsOrigin.includes('http://localhost:5173'),
    'parseCorsConfig parses comma-separated allowlist'
  );
  assert(allowlistCors.corsCredentials === true, 'Allowlist CORS enables credentials for authorized origins');

  // Test live CORS middleware with Wildcard
  const wildcardApp = createApp({ corsOrigin: '*', corsCredentials: false });
  const wildcardServer = http.createServer(wildcardApp);
  await new Promise((resolve) => wildcardServer.listen(8002, resolve));

  try {
    const res = await fetch('http://localhost:8002/', {
      headers: { Origin: 'http://example.com' },
    });
    assert(
      res.headers.get('access-control-allow-origin') === '*',
      'Wildcard CORS returns Access-Control-Allow-Origin: *'
    );
    assert(
      res.headers.get('access-control-allow-credentials') !== 'true',
      'Wildcard CORS does NOT set Access-Control-Allow-Credentials: true'
    );
  } finally {
    await new Promise((resolve) => wildcardServer.close(resolve));
  }

  // Test live CORS middleware with Allowlist
  const allowlistApp = createApp({
    corsOrigin: ['http://localhost:3000', 'http://localhost:5173'],
    corsCredentials: true,
  });
  const allowlistServer = http.createServer(allowlistApp);
  await new Promise((resolve) => allowlistServer.listen(8003, resolve));

  try {
    // Authorized origin
    const authorizedRes = await fetch('http://localhost:8003/', {
      headers: { Origin: 'http://localhost:3000' },
    });
    assert(
      authorizedRes.headers.get('access-control-allow-origin') === 'http://localhost:3000',
      'Allowlist CORS echoes authorized origin'
    );
    assert(
      authorizedRes.headers.get('access-control-allow-credentials') === 'true',
      'Allowlist CORS sets Access-Control-Allow-Credentials: true'
    );

    // Unauthorized origin
    const unauthorizedRes = await fetch('http://localhost:8003/', {
      headers: { Origin: 'http://attacker.example.com' },
    });
    assert(
      unauthorizedRes.headers.get('access-control-allow-origin') === null,
      'Allowlist CORS blocks unauthorized origin from receiving allow header'
    );
  } finally {
    await new Promise((resolve) => allowlistServer.close(resolve));
  }

  // ==========================================
  // 5. Health Checks in Both Database Modes
  // ==========================================
  console.log('\n--- 5. Testing Health Checks in Both Database Modes ---');
  const baseApp = createApp();
  const testServer = http.createServer(baseApp);
  await new Promise((resolve) => testServer.listen(8004, resolve));
  const baseUrl = 'http://localhost:8004';

  try {
    // Mode A: ENABLE_DB = false
    config.enableDb = false;
    const disabledHealthRes = await fetch(`${baseUrl}/health`);
    const disabledHealthBody = await disabledHealthRes.json();
    assert(disabledHealthRes.status === 200, 'Health check returns HTTP 200 when ENABLE_DB=false');
    assert(disabledHealthBody.status === 'ok', 'Reports status: "ok" in standalone mode');
    assert(
      disabledHealthBody.database.enabled === false && disabledHealthBody.database.status === 'disabled',
      'Explicitly declares database is disabled (not verified) when ENABLE_DB=false'
    );
    assert(
      disabledHealthBody.database.message.includes('disabled'),
      'Includes clear explanation message for disabled database'
    );

    // Mode B: ENABLE_DB = true with disconnected DB
    config.enableDb = true;
    const disconnectedHealthRes = await fetch(`${baseUrl}/health`);
    const disconnectedHealthBody = await disconnectedHealthRes.json();
    assert(
      disconnectedHealthRes.status === 503,
      'Health check returns HTTP 503 Service Unavailable when ENABLE_DB=true and DB is disconnected'
    );
    assert(
      disconnectedHealthBody.status === 'unhealthy',
      'Reports status: "unhealthy" when database is unavailable'
    );
    assert(
      disconnectedHealthBody.database.enabled === true,
      'Reports database.enabled: true when ENABLE_DB=true'
    );
    assert(
      disconnectedHealthBody.database.status === 'disconnected',
      'Reports database.status: "disconnected"'
    );
  } finally {
    config.enableDb = false; // Restore safe default
    await new Promise((resolve) => testServer.close(resolve));
  }

  // ==========================================
  // 6. Database Listener Deduplication & Lifecycle
  // ==========================================
  console.log('\n--- 6. Testing Database Lifecycle & Listener Deduplication ---');
  const initialConnectedCount = mongoose.connection.listenerCount('connected');
  registerConnectionListeners();
  registerConnectionListeners();
  registerConnectionListeners();
  const finalConnectedCount = mongoose.connection.listenerCount('connected');
  assert(
    finalConnectedCount === Math.max(initialConnectedCount, 1),
    `Listeners are deduplicated (listenerCount is ${finalConnectedCount}, not multiplied)`
  );

  // ==========================================
  // 7. General API Endpoints & 404 Handling
  // ==========================================
  console.log('\n--- 7. Testing General API Endpoints & 404 Handling ---');
  const defaultServer = http.createServer(createApp());
  await new Promise((resolve) => defaultServer.listen(8005, resolve));

  try {
    const rootRes = await fetch('http://localhost:8005/');
    const rootBody = await rootRes.json();
    assert(rootRes.status === 200, 'GET / returns HTTP 200');
    assert(rootBody.success === true, 'GET / returns success: true');

    const notFoundRes = await fetch('http://localhost:8005/unknown-route');
    const notFoundBody = await notFoundRes.json();
    assert(notFoundRes.status === 404, 'Unknown GET returns HTTP 404');
    assert(notFoundBody.error.code === 'NOT_FOUND', 'Unknown route returns NOT_FOUND code');

    const notFoundPostRes = await fetch('http://localhost:8005/unknown-route', { method: 'POST' });
    assert(notFoundPostRes.status === 404, 'Unknown POST returns HTTP 404');
  } finally {
    await new Promise((resolve) => defaultServer.close(resolve));
  }

  // ==========================================
  // 8. Development-Only Mock OTP Terminal Visibility & Safeguards
  // ==========================================
  console.log('\n--- 8. Testing Development-Only Mock OTP Terminal Visibility & Safeguards ---');

  const originalConsoleLog = console.log;
  let interceptedLogs = [];
  function startLogCapture() {
    interceptedLogs = [];
    console.log = (...args) => {
      interceptedLogs.push(args.join(' '));
      originalConsoleLog(...args);
    };
  }
  function stopLogCapture() {
    console.log = originalConsoleLog;
    return interceptedLogs;
  }

  const testMobile = '+919419112345';
  const testOtpValue = '987654';

  // Subtest 8A: When NODE_ENV=development, mock OTP is printed to terminal and labeled [DEVELOPMENT ONLY]
  const devProvider = new MockOtpProvider();
  config.nodeEnv = 'development';
  startLogCapture();
  await devProvider.sendOtp({
    recipient: testMobile,
    otp: testOtpValue,
    expiryMinutes: 5,
  });
  const devLogs = stopLogCapture();
  const hasDevOtpLog = devLogs.some(
    (log) => log.includes('[MockOtpProvider]') && log.includes('[DEVELOPMENT ONLY]') && log.includes(testOtpValue)
  );
  assert(hasDevOtpLog, 'Development mode prints generated OTP labeled with [DEVELOPMENT ONLY]');

  // Subtest 8B: When NODE_ENV=test, mock OTP is strictly OMITTED from logs
  config.nodeEnv = 'test';
  startLogCapture();
  await devProvider.sendOtp({
    recipient: testMobile,
    otp: testOtpValue,
    expiryMinutes: 5,
  });
  const testLogs = stopLogCapture();
  const leakedInTest = testLogs.some((log) => log.includes(testOtpValue));
  assert(!leakedInTest, 'Test mode strictly omits plaintext OTP from console logs');

  // Subtest 8C: When NODE_ENV=production, mock OTP provider throws immediately
  config.nodeEnv = 'production';
  startLogCapture();
  assertThrows(
    () => new MockOtpProvider(),
    'MockOtpProvider instantiation throws safety violation in production mode',
    'cannot be instantiated in production'
  );
  let sendErrorCaught = false;
  try {
    await devProvider.sendOtp({ recipient: testMobile, otp: testOtpValue, expiryMinutes: 5 });
  } catch (err) {
    sendErrorCaught = true;
    assert(
      err.message.includes('Attempted to send mock OTP in production mode'),
      'MockOtpProvider.sendOtp throws safety violation in production mode'
    );
  }
  assert(sendErrorCaught, 'sendOtp throws in production mode');

  const prodLogs = stopLogCapture();
  const leakedInProd = prodLogs.some((log) => log.includes(testOtpValue));
  assert(!leakedInProd, 'Production mode never logs OTPs (throws error instead)');

  // Restore environment
  config.nodeEnv = savedNodeEnv;

  // ==========================================
  // 9. Integration Test Database Isolation Safeguards
  // ==========================================
  console.log('\n--- 9. Testing Integration Test Database Isolation Safeguards ---');

  // Subtest 9A: Rejection of Atlas SRV URIs
  assertThrows(
    () => validateIsolatedTestUri('mongodb+srv://admin:pass@cluster0.abcde.mongodb.net/civicconnect?retryWrites=true'),
    'validateIsolatedTestUri rejects mongodb+srv: Atlas URIs',
    'Automated tests are strictly forbidden from connecting to MongoDB Atlas'
  );

  // Subtest 9B: Rejection of standard remote cloud database URIs
  assertThrows(
    () => validateIsolatedTestUri('mongodb://user:secret@civicconnect-db.azure.com:27017/civicconnect'),
    'validateIsolatedTestUri rejects cloud provider URIs',
    'URI targets a remote cloud database domain'
  );

  // Subtest 9C: Rejection of empty/missing URI
  assertThrows(
    () => validateIsolatedTestUri(''),
    'validateIsolatedTestUri rejects empty database URI',
    'Test database URI is missing or empty'
  );

  // Subtest 9D: Acceptance of isolated local in-memory loopback URIs
  assert(
    validateIsolatedTestUri('mongodb://127.0.0.1:54321/test_isolated') === true,
    'validateIsolatedTestUri permits safe 127.0.0.1 loopback test URI'
  );
  assert(
    validateIsolatedTestUri('mongodb://localhost:27017/test_local') === true,
    'validateIsolatedTestUri permits safe localhost loopback test URI'
  );

  // Subtest 9E: If MONGODB_URI in .env is configured for Atlas, ensure it is rejected for tests
  if (process.env.MONGODB_URI && (process.env.MONGODB_URI.includes('mongodb+srv') || process.env.MONGODB_URI.includes('mongodb.net'))) {
    assertThrows(
      () => validateIsolatedTestUri(process.env.MONGODB_URI),
      'validateIsolatedTestUri strictly rejects the actual .env MongoDB Atlas URI',
      'forbidden'
    );
  }

  console.log(`\n=== Verification Complete: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});
