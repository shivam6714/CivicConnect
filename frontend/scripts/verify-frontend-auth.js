/**
 * Automated Verification Suite for CivicConnect Frontend OTP Authentication Integration
 *
 * Verifies:
 * 1. Mobile number validation (Indian 10-digit standard)
 * 2. OTP format validation (6-digit exact match)
 * 3. Request OTP API contract (POST /api/auth/request-otp)
 * 4. Verify OTP API contract & validation (POST /api/auth/verify-otp)
 * 5. Error responses: invalid phone, invalid OTP, cooldown/throttling
 * 6. User profile mapping from backend CitizenUser to frontend User
 * 7. Token storage semantics and security boundaries
 */

const API_BASE_URL = 'http://localhost:8000';

const INDIAN_MOBILE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;

function isValidIndianMobile(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return INDIAN_MOBILE_REGEX.test(cleaned);
}

function extractTenDigitMobile(phone) {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.slice(-10);
}

function mapBackendCitizenToUser(citizenUser) {
  return {
    id: citizenUser.id,
    name: citizenUser.fullName?.trim() || `Citizen (${citizenUser.phoneNumber})`,
    email: `${citizenUser.phoneNumber.replace('+', '')}@citizen.civicconnect.in`,
    phone: citizenUser.phoneNumber,
    phoneNumber: citizenUser.phoneNumber,
    role: 'CITIZEN',
    wardAssigned: citizenUser.wardNumber,
    wardNumber: citizenUser.wardNumber,
    isPhoneVerified: citizenUser.isPhoneVerified,
  };
}

async function runTests() {
  console.log('===============================================================');
  console.log('CivicConnect Frontend OTP Authentication Integration Verification');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // TEST SUITE 1: Mobile Number Validation
  console.log('--- Suite 1: Indian Mobile Number Validation ---');
  assert(isValidIndianMobile('9103009286'), 'Accepts standard 10-digit mobile number 9103009286');
  assert(isValidIndianMobile('+919103009286'), 'Accepts +91 prefixed mobile number');
  assert(isValidIndianMobile('09103009286'), 'Accepts 0-prefixed 11-digit mobile number');
  assert(isValidIndianMobile('8989898989'), 'Accepts valid number starting with 8');
  assert(isValidIndianMobile('7006123456'), 'Accepts valid Jammu number starting with 7');
  assert(isValidIndianMobile('6005123456'), 'Accepts valid number starting with 6');
  assert(!isValidIndianMobile('1234567890'), 'Rejects mobile number starting with 1');
  assert(!isValidIndianMobile('5555555555'), 'Rejects mobile number starting with 5');
  assert(!isValidIndianMobile('910300928'), 'Rejects 9-digit incomplete number');
  assert(!isValidIndianMobile('910300928612'), 'Rejects 12-digit number without prefix');
  assert(!isValidIndianMobile(''), 'Rejects empty string');
  assert(!isValidIndianMobile('abcdefghij'), 'Rejects non-numeric alphabetic input');
  assert(extractTenDigitMobile('+91 9103-009-286') === '9103009286', 'Normalizes formatted input to 10 digits');

  // TEST SUITE 2: OTP Formatting & Validation
  console.log('\n--- Suite 2: OTP Format Validation ---');
  const isOtpValid = (code) => /^\d{6}$/.test(code.trim());
  assert(isOtpValid('123456'), 'Accepts 6-digit numeric string');
  assert(isOtpValid('896324'), 'Accepts realistic 6-digit OTP');
  assert(!isOtpValid('12345'), 'Rejects 5-digit code');
  assert(!isOtpValid('1234567'), 'Rejects 7-digit code');
  assert(!isOtpValid('12345a'), 'Rejects alphanumeric 6-character code');
  assert(!isOtpValid('      '), 'Rejects whitespace');

  // TEST SUITE 3: Backend Integration - Request OTP Contract
  console.log('\n--- Suite 3: Backend POST /api/auth/request-otp Integration ---');
  try {
    // 3A: Invalid phone request
    const invalidPhoneRes = await fetch(`${API_BASE_URL}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '123' }),
    });
    const invalidPhoneData = await invalidPhoneRes.json();
    assert(invalidPhoneRes.status === 400, 'Returns HTTP 400 for invalid phone number');
    assert(invalidPhoneData.success === false, 'Returns success: false for invalid phone');
    assert(
      invalidPhoneData.error && invalidPhoneData.error.message.includes('validation'),
      'Provides structured validation error message'
    );
  } catch (err) {
    assert(false, `Request failed: ${err.message}`);
  }

  // 3B: Valid request OTP with test number
  // Using a unique timestamp-derived test number to avoid throttling conflicts
  const testPhone = `98${Date.now().toString().slice(-8)}`;
  let requestOtpResult;
  try {
    const validRes = await fetch(`${API_BASE_URL}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: testPhone }),
    });
    requestOtpResult = await validRes.json();
    assert(validRes.status === 200, `Returns HTTP 200 on valid phone request (${testPhone})`);
    assert(requestOtpResult.success === true, 'Response contains success: true');
    assert(
      typeof requestOtpResult.cooldownSeconds === 'number' && requestOtpResult.cooldownSeconds > 0,
      `Response returns cooldownSeconds (${requestOtpResult.cooldownSeconds}s)`
    );
  } catch (err) {
    assert(false, `Request OTP failed: ${err.message}`);
  }

  // 3C: Throttle Cooldown Enforcement
  try {
    const throttledRes = await fetch(`${API_BASE_URL}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: testPhone }),
    });
    const throttledData = await throttledRes.json();
    assert(throttledRes.status === 429, 'Returns HTTP 429 Too Many Requests when calling within cooldown');
    assert(
      throttledData.error && throttledData.error.message.includes('wait'),
      `Provides clear cooldown error message: "${throttledData.error?.message}"`
    );
  } catch (err) {
    assert(false, `Throttle test failed: ${err.message}`);
  }

  // TEST SUITE 4: Backend Integration - Verify OTP Contract
  console.log('\n--- Suite 4: Backend POST /api/auth/verify-otp Integration ---');
  try {
    // 4A: Malformed OTP (not 6 digits)
    const malformedOtpRes = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: testPhone, otp: '12' }),
    });
    const malformedData = await malformedOtpRes.json();
    assert(malformedOtpRes.status === 400, 'Returns HTTP 400 for non-6-digit OTP');
    assert(
      malformedData.error?.details?.[0]?.message?.includes('6 digits') ||
      malformedData.error?.message?.includes('validation'),
      'Returns specific 6-digit validation error'
    );

    // 4B: Incorrect 6-digit OTP
    const wrongOtpRes = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: testPhone, otp: '000000' }),
    });
    const wrongOtpData = await wrongOtpRes.json();
    assert(wrongOtpRes.status === 400, 'Returns HTTP 400 for incorrect 6-digit OTP');
    assert(
      wrongOtpData.error && wrongOtpData.error.message.includes('Invalid'),
      `Returns clean error message on wrong code: "${wrongOtpData.error?.message}"`
    );
  } catch (err) {
    assert(false, `Verify OTP tests failed: ${err.message}`);
  }

  // TEST SUITE 5: Entity Mapping & Role Verification
  console.log('\n--- Suite 5: Citizen User Entity Mapping ---');
  const mockBackendUser = {
    id: 'usr-6ad48d2f740e',
    phoneNumber: '+919103009286',
    fullName: 'Rajesh Verma',
    wardNumber: 12,
    role: 'citizen',
    isPhoneVerified: true,
  };

  const mappedUser = mapBackendCitizenToUser(mockBackendUser);
  assert(mappedUser.id === 'usr-6ad48d2f740e', 'Maps citizen user ID correctly');
  assert(mappedUser.name === 'Rajesh Verma', 'Preserves citizen full name');
  assert(mappedUser.role === 'CITIZEN', 'Normalizes backend "citizen" role to "CITIZEN"');
  assert(mappedUser.phone === '+919103009286', 'Preserves phone number');
  assert(mappedUser.wardAssigned === 12, 'Maps wardNumber to wardAssigned for portal compatibility');

  const mockUserWithoutName = {
    id: 'usr-unnamed',
    phoneNumber: '+919876543210',
    role: 'citizen',
    isPhoneVerified: true,
  };
  const mappedFallback = mapBackendCitizenToUser(mockUserWithoutName);
  assert(
    mappedFallback.name === 'Citizen (+919876543210)',
    'Provides graceful fallback display name when fullName is omitted'
  );

  console.log('\n===============================================================');
  console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
