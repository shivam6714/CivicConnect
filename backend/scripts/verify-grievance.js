import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../dist/app.js';
import { config } from '../dist/config/index.js';
import { setupIsolatedTestDb, teardownIsolatedTestDb } from './testDbHelper.js';
import { GrievanceModel } from '../dist/modules/grievance/grievance.model.js';
import { UserModel } from '../dist/modules/auth/user.model.js';
import { generateAuthToken } from '../dist/modules/auth/jwt.utils.js';

async function runGrievanceTests() {
  console.log('=== Starting CivicConnect Real Grievance Persistence & Isolation Verification ===\n');
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

  // 1. Setup Isolated in-memory Test Database
  console.log('--- 1. Setting up Isolated In-Memory Database ---');
  const isolatedDb = await setupIsolatedTestDb();
  testDbServer = isolatedDb.mongod;
  assert(mongoose.connection.readyState === 1, 'Isolated in-memory MongoDB connected for test suite');
  assert(isolatedDb.uri.startsWith('mongodb://127.0.0.1:'), 'Target database verified strictly local in-memory instance');

  // 2. Start Test Express HTTP Server
  const app = createApp();
  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(8008, resolve));
  const baseUrl = 'http://localhost:8008';

  try {
    // Create test citizens in isolated DB
    const citizen1 = await UserModel.create({
      phoneNumber: '+919419111111',
      fullName: 'Vikas Sharma',
      wardNumber: 20,
      role: 'citizen',
      isPhoneVerified: true,
    });
    const token1 = generateAuthToken(citizen1);

    const citizen2 = await UserModel.create({
      phoneNumber: '+919419222222',
      fullName: 'Pooja Jamwal',
      wardNumber: 14,
      role: 'citizen',
      isPhoneVerified: true,
    });
    const token2 = generateAuthToken(citizen2);

    // ==========================================
    // 2. Testing Authentication & Authorization Guards
    // ==========================================
    console.log('\n--- 2. Testing Authentication & Authorization Guards ---');

    // A. POST /api/complaints without token
    const noTokenRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Broken streetlight',
        description: 'Streetlight is out for days',
        category: 'STREET_LIGHT',
        location: { latitude: 32.7266, longitude: 74.857 },
        address: 'Gandhi Nagar',
        wardId: 20,
      }),
    });
    assert(noTokenRes.status === 401, 'POST /api/complaints without token is rejected with HTTP 401');

    // B. POST /api/complaints with invalid token
    const invalidTokenRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_forged_jwt_token',
      },
      body: JSON.stringify({
        title: 'Broken streetlight',
        description: 'Streetlight is out for days',
        category: 'STREET_LIGHT',
        location: { latitude: 32.7266, longitude: 74.857 },
        address: 'Gandhi Nagar',
        wardId: 20,
      }),
    });
    assert(invalidTokenRes.status === 401, 'POST /api/complaints with invalid token is rejected with HTTP 401');

    // C. GET /api/complaints/my without token
    const noTokenGetRes = await fetch(`${baseUrl}/api/complaints/my`);
    assert(noTokenGetRes.status === 401, 'GET /api/complaints/my without token is rejected with HTTP 401');

    // ==========================================
    // 3. Testing Input Validation (Zod Schema)
    // ==========================================
    console.log('\n--- 3. Testing Input Validation (Zod Schema) ---');

    // Short title
    const shortTitleRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        title: 'Hi',
        description: 'Valid description of the issue',
        category: 'POTHOLE_ROAD',
        location: { latitude: 32.7088, longitude: 74.8631 },
        address: 'Gol Market',
        wardId: 20,
      }),
    });
    assert(shortTitleRes.status === 400, 'Rejects title shorter than 3 characters with HTTP 400');

    // Invalid category
    const invalidCatRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        title: 'Pothole on main road',
        description: 'Deep road crater',
        category: 'NON_EXISTENT_CATEGORY',
        location: { latitude: 32.7088, longitude: 74.8631 },
        address: 'Gol Market',
        wardId: 20,
      }),
    });
    assert(invalidCatRes.status === 400, 'Rejects invalid category with HTTP 400');

    // Ward out of range (> 75)
    const invalidWardRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        title: 'Pothole on main road',
        description: 'Deep road crater',
        category: 'POTHOLE_ROAD',
        location: { latitude: 32.7088, longitude: 74.8631 },
        address: 'Gol Market',
        wardId: 999,
      }),
    });
    assert(invalidWardRes.status === 400, 'Rejects ward number > 75 with HTTP 400');

    // ==========================================
    // 4. Testing Successful Grievance Persistence
    // ==========================================
    console.log('\n--- 4. Testing Successful Grievance Persistence ---');

    const validSubmission = {
      title: 'Severe pothole crater near Gol Market gate',
      description: 'Dangerous crater causing vehicular accidents right outside market gate.',
      category: 'POTHOLE_ROAD',
      location: { latitude: 32.7088, longitude: 74.8631 },
      address: 'Near Gate 2, Gol Market, Gandhi Nagar, Jammu',
      landmark: 'Opposite State Bank',
      wardId: 20,
      isAnonymous: false,
    };

    const createRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify(validSubmission),
    });

    const createBody = await createRes.json();
    assert(createRes.status === 201, 'Valid grievance submission returns HTTP 201 Created');
    assert(createBody.success === true, 'Response indicates success: true');
    assert(Boolean(createBody.grievance.id), 'Response includes persistent database ID');

    const trackingNum = createBody.grievance.trackingNumber;
    assert(/^JMC-\d{4}-\d+$/.test(trackingNum), `Server generates valid tracking identifier: ${trackingNum}`);
    assert(createBody.grievance.status === 'REPORTED', 'Initial status is strictly "REPORTED" (no fake AI triage)');
    assert(createBody.grievance.priority === 'MEDIUM', 'Initial priority is set to default MEDIUM');
    assert(createBody.grievance.ward.id === 20, 'Ward metadata matches submitted wardId');
    assert(createBody.grievance.ward.zone === 'South Jammu', 'Ward zone is automatically resolved to "South Jammu"');
    assert(createBody.grievance.timeline.length === 1, 'Initial timeline has exactly 1 entry');
    assert(createBody.grievance.timeline[0].status === 'REPORTED', 'Timeline event status is REPORTED');
    assert(createBody.grievance.timeline[0].actor === 'Vikas Sharma', 'Timeline event actor matches authenticated citizen name');

    // Verify in MongoDB
    const storedDoc = await GrievanceModel.findById(createBody.grievance.id);
    assert(Boolean(storedDoc), 'Grievance record is successfully found in MongoDB');
    assert(storedDoc.citizenId.toString() === citizen1._id.toString(), 'Database citizenId is bound to verified JWT user ID');
    assert(storedDoc.reporterPhone === citizen1.phoneNumber, 'Database reporterPhone is bound to verified user phone');
    assert(storedDoc.geoPoint.type === 'Point', 'Database stores GeoJSON Point');
    assert(storedDoc.geoPoint.coordinates[0] === 74.8631, 'GeoJSON longitude is stored correctly');
    assert(storedDoc.geoPoint.coordinates[1] === 32.7088, 'GeoJSON latitude is stored correctly');

    // Second submission by Citizen 1 (Anonymous)
    const anonRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        title: 'Broken street lamp post',
        description: 'Lamp post fixture is hanging loosely over pedestrian walkway.',
        category: 'STREET_LIGHT',
        location: { latitude: 32.7095, longitude: 74.864 },
        address: 'Gandhi Nagar Block A',
        wardId: 20,
        isAnonymous: true,
      }),
    });
    const anonBody = await anonRes.json();
    assert(anonRes.status === 201, 'Anonymous grievance submission returns HTTP 201');
    assert(anonBody.grievance.isAnonymous === true, 'isAnonymous is true');
    assert(anonBody.grievance.reporterName === undefined, 'Public formatted response omits reporterName for anonymous submission');

    // Submission by Citizen 2
    const citizen2Res = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({
        title: 'Sewage drain overflowing onto Canal Road',
        description: 'Foul-smelling water overflowing onto the main thoroughfare.',
        category: 'DRAINAGE_SEWAGE',
        location: { latitude: 32.721, longitude: 74.845 },
        address: 'Canal Road near Bhagwati Nagar',
        wardId: 14,
        isAnonymous: false,
      }),
    });
    assert(citizen2Res.status === 201, 'Citizen 2 grievance submission returns HTTP 201');

    // ==========================================
    // 5. Testing Citizen Data Isolation (GET /api/complaints/my)
    // ==========================================
    console.log('\n--- 5. Testing Citizen Data Isolation (GET /api/complaints/my) ---');

    // Query with Citizen 1's token
    const myGrievancesRes1 = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const myGrievancesBody1 = await myGrievancesRes1.json();
    assert(myGrievancesRes1.status === 200, 'GET /api/complaints/my returns HTTP 200 for Citizen 1');
    assert(myGrievancesBody1.complaints.length === 2, 'Citizen 1 receives exactly their 2 submitted grievances');

    const citizen1GrievanceIds = myGrievancesBody1.complaints.map((g) => g.id);
    assert(citizen1GrievanceIds.includes(createBody.grievance.id), 'Citizen 1 complaint includes first submission');
    assert(citizen1GrievanceIds.includes(anonBody.grievance.id), 'Citizen 1 complaint includes anonymous submission');

    // CRITICAL: Ensure Citizen 2's complaint is NOT in Citizen 1's results
    const citizen2Doc = await GrievanceModel.findOne({ citizenId: citizen2._id });
    assert(
      !citizen1GrievanceIds.includes(citizen2Doc._id.toString()),
      'CRITICAL: Citizen 1 response strictly EXCLUDES Citizen 2 grievance (Data Isolation Verified)'
    );

    // Query with Citizen 2's token
    const myGrievancesRes2 = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const myGrievancesBody2 = await myGrievancesRes2.json();
    assert(myGrievancesRes2.status === 200, 'GET /api/complaints/my returns HTTP 200 for Citizen 2');
    assert(myGrievancesBody2.complaints.length === 1, 'Citizen 2 receives exactly their 1 submitted grievance');
    assert(
      myGrievancesBody2.complaints[0].id === citizen2Doc._id.toString(),
      'Citizen 2 complaint matches their own submission'
    );

    // Route alias check: GET /api/v1/complaints/my
    const aliasRes = await fetch(`${baseUrl}/api/v1/complaints/my`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(aliasRes.status === 200, 'Route alias /api/v1/complaints/my returns HTTP 200 identically');
  } finally {
    await new Promise((resolve) => testServer.close(resolve));
    await teardownIsolatedTestDb(testDbServer);
  }

  console.log(`\n=== Verification Complete: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runGrievanceTests().catch((err) => {
  console.error('[Grievance Tests] Unhandled error:', err);
  process.exit(1);
});
