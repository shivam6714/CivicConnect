/**
 * End-to-End Citizen Workflow Verification Suite
 *
 * Validates the complete Batch 1 citizen grievance workflow:
 * 1. Log in using the configured development OTP flow.
 * 2. Submit a grievance using fields supported by schema.
 * 3. Verify successful persistence in MongoDB.
 * 4. Confirm tracking ID is generated and returned.
 * 5. Refresh the dashboard (fetch grievances via GET /api/complaints/my).
 * 6. Confirm the grievance remains visible.
 * 7. Verify unauthorized requests are rejected (HTTP 401).
 * 8. Verify cross-citizen isolation (users cannot retrieve other citizens' private grievances).
 */

import { setupIsolatedTestDb, teardownIsolatedTestDb } from './testDbHelper.js';
import { createApp } from '../dist/app.js';
import { getOtpProvider } from '../dist/providers/otp/index.js';
import { GrievanceModel } from '../dist/modules/grievance/grievance.model.js';

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

async function runCitizenWorkflowTests() {
  console.log('===============================================================');
  console.log('CivicConnect Batch 1 Citizen Workflow E2E Verification Suite');
  console.log('===============================================================\n');

  // Step 0: Set up isolated test database
  console.log('--- Step 0: Initializing Isolated In-Memory Database ---');
  await setupIsolatedTestDb();
  const app = createApp();

  // Helper for supertest-like fetch against the express app
  // Using node-fetch / global fetch with ephemeral server
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const testPhone = '9876543210';
    const testFullName = 'Sunil Sharma';
    const testWard = 12; // Ward 12: Krishna Nagar

    // STEP 1: Log in using the configured development OTP flow
    console.log('\n--- Step 1: Citizen OTP Login Flow ---');
    const otpProvider = getOtpProvider();

    // 1A. Request OTP
    const reqRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: testPhone }),
    });
    const reqData = await reqRes.json();
    assert(reqRes.status === 200, 'POST /api/auth/request-otp returns HTTP 200');
    assert(reqData.success === true, 'Request OTP response has success: true');
    assert(reqData.cooldownSeconds === 60, 'Response includes 60-second cooldown');

    // 1B. Retrieve mock OTP from development provider
    const dispatchedOtp = otpProvider.getLastSentOtpForTest(`+91${testPhone}`);
    assert(dispatchedOtp !== null, 'Mock OTP provider captured generated OTP for development');
    assert(/^\d{6}$/.test(dispatchedOtp), `Dispatched OTP is a valid 6-digit code: ${dispatchedOtp}`);

    // 1C. Verify OTP
    const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: testPhone,
        otp: dispatchedOtp,
        fullName: testFullName,
        wardNumber: testWard,
      }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, 'POST /api/auth/verify-otp returns HTTP 200');
    assert(verifyData.success === true, 'Verify response has success: true');
    assert(typeof verifyData.token === 'string' && verifyData.token.length > 20, 'Signed JWT token returned');
    assert(verifyData.user.role === 'citizen', 'Citizen role assigned');
    assert(verifyData.user.fullName === testFullName, 'User profile fullName correctly stored');
    assert(verifyData.user.wardNumber === testWard, 'User wardNumber correctly stored');

    const citizenToken = verifyData.token;
    const citizenUserId = verifyData.user.id;

    // STEP 2: Submit a grievance
    console.log('\n--- Step 2: Grievance Submission ---');
    const grievancePayload = {
      title: 'Deep hazardous pothole near Science College gate',
      description: 'Massive pothole causing traffic blockage and two-wheeler accidents during evening rush hour.',
      category: 'POTHOLE_ROAD',
      location: {
        latitude: 32.7266,
        longitude: 74.8570,
      },
      address: 'Near GGM Science College, Canal Road, Jammu',
      landmark: 'Opposite Main Entrance Gate',
      wardId: 12,
      imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7',
      isAnonymous: false,
    };

    const submitRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify(grievancePayload),
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 201, 'POST /api/complaints returns HTTP 201 Created');
    assert(submitData.success === true, 'Submission response has success: true');

    const submittedComplaint = submitData.grievance || submitData.complaint;
    assert(submittedComplaint !== undefined, 'Created grievance object returned in response');

    // STEP 3: Verify successful persistence in MongoDB
    console.log('\n--- Step 3: MongoDB Persistence Verification ---');
    const dbRecord = await GrievanceModel.findOne({ trackingNumber: submittedComplaint.trackingNumber });
    assert(dbRecord !== null, 'Grievance document found directly in MongoDB database');
    assert(dbRecord.citizenId.toString() === citizenUserId, 'MongoDB citizenId matches authenticated user ID');
    assert(dbRecord.title === grievancePayload.title, 'MongoDB title matches submitted title');
    assert(dbRecord.category === 'POTHOLE_ROAD', 'MongoDB category stored correctly');
    assert(dbRecord.ward.number === 12, 'MongoDB ward number is 12');
    assert(dbRecord.geoPoint.type === 'Point', 'MongoDB geoPoint is GeoJSON Point');
    assert(dbRecord.geoPoint.coordinates[0] === grievancePayload.location.longitude, 'GeoJSON longitude persisted');
    assert(dbRecord.geoPoint.coordinates[1] === grievancePayload.location.latitude, 'GeoJSON latitude persisted');
    assert(dbRecord.status === 'REPORTED', 'Initial status is strictly "REPORTED"');
    assert(dbRecord.priority === 'MEDIUM', 'Initial priority is "MEDIUM"');

    // STEP 4: Confirm tracking ID is displayed
    console.log('\n--- Step 4: Tracking ID Verification ---');
    const trackingId = submittedComplaint.trackingNumber;
    assert(typeof trackingId === 'string', `Tracking number is present: ${trackingId}`);
    assert(/^JMC-\d{4}-\d{4}$/.test(trackingId), `Tracking ID matches standard format JMC-YYYY-XXXX: ${trackingId}`);

    // STEP 5: Refresh the dashboard (GET /api/complaints/my)
    console.log('\n--- Step 5: Dashboard Refresh (GET /api/complaints/my) ---');
    const refreshRes = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: {
        Authorization: `Bearer ${citizenToken}`,
      },
    });
    const refreshData = await refreshRes.json();
    assert(refreshRes.status === 200, 'GET /api/complaints/my returns HTTP 200');
    assert(refreshData.success === true, 'Refresh response has success: true');
    assert(Array.isArray(refreshData.complaints), 'Response complaints is an array');

    // STEP 6: Confirm grievance remains visible with full details
    console.log('\n--- Step 6: Grievance Visibility on Dashboard ---');
    const matchedComplaint = refreshData.complaints.find((c) => c.trackingNumber === trackingId);
    assert(matchedComplaint !== undefined, 'Submitted grievance is present on citizen dashboard');
    assert(matchedComplaint.trackingNumber === trackingId, 'Tracking number matches');
    assert(matchedComplaint.category === 'POTHOLE_ROAD', 'Category is POTHOLE_ROAD');
    assert(matchedComplaint.status === 'REPORTED', 'Current status is REPORTED');
    assert(matchedComplaint.ward.number === 12, 'Ward is 12');
    assert(matchedComplaint.address.includes('Science College'), 'Incident address matches');
    assert(matchedComplaint.location.latitude === 32.7266, 'Latitude coordinates match');
    assert(matchedComplaint.location.longitude === 74.8570, 'Longitude coordinates match');
    assert(matchedComplaint.createdAt !== undefined, 'Creation date timestamp is present');

    // STEP 7: Verify unauthorized requests are rejected
    console.log('\n--- Step 7: Unauthorized Request Rejection ---');
    // 7A: GET /api/complaints/my without token
    const unauthGetRes = await fetch(`${baseUrl}/api/complaints/my`);
    assert(unauthGetRes.status === 401, 'GET /api/complaints/my without token rejected with HTTP 401');

    // 7B: POST /api/complaints without token
    const unauthPostRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grievancePayload),
    });
    assert(unauthPostRes.status === 401, 'POST /api/complaints without token rejected with HTTP 401');

    // 7C: Invalid token
    const invalidTokenRes = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: 'Bearer forged_or_expired_jwt_token' },
    });
    assert(invalidTokenRes.status === 401, 'Request with forged/invalid token rejected with HTTP 401');

    // STEP 8: Verify cross-citizen data isolation
    console.log('\n--- Step 8: Citizen Data Isolation ---');
    const citizen2Phone = '9123456789';
    await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: citizen2Phone }),
    });
    const citizen2Otp = otpProvider.getLastSentOtpForTest(`+91${citizen2Phone}`);
    const citizen2Verify = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: citizen2Phone,
        otp: citizen2Otp,
        fullName: 'Citizen Two',
        wardNumber: 5,
      }),
    });
    const citizen2Data = await citizen2Verify.json();
    const citizen2Token = citizen2Data.token;

    // Citizen 2 fetches their own complaints
    const citizen2ComplaintsRes = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${citizen2Token}` },
    });
    const citizen2ComplaintsData = await citizen2ComplaintsRes.json();
    assert(citizen2ComplaintsRes.status === 200, 'Citizen 2 GET /api/complaints/my returns HTTP 200');
    assert(citizen2ComplaintsData.complaints.length === 0, 'Citizen 2 starts with 0 complaints');

    // CRITICAL: Ensure Citizen 2 does NOT see Citizen 1's complaint
    const leakCheck = citizen2ComplaintsData.complaints.find((c) => c.trackingNumber === trackingId);
    assert(leakCheck === undefined, 'CRITICAL: Citizen 2 strictly CANNOT see Citizen 1 grievance (Data Isolation Verified)');

  } finally {
    server.close();
    await teardownIsolatedTestDb();
  }

  console.log(`\n===============================================================`);
  console.log(`Verification Complete: ${passed} passed, ${failed} failed`);
  console.log(`===============================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runCitizenWorkflowTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
