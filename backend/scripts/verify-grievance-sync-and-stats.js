/**
 * CivicConnect: Grievance Synchronization & Public Stats Verification Suite
 *
 * Verifies that a grievance appears consistently across:
 * 1. Citizen's private list (GET /api/complaints/my)
 * 2. Administrator triage queue (GET /api/complaints)
 * 3. Public aggregate statistics (GET /api/complaints/stats)
 *
 * Security & Isolation Guarantees:
 * - Runs strictly against isolated in-memory MongoMemoryServer (never Atlas).
 * - Enforces role-based authorization (citizens forbidden from admin queue).
 * - Enforces zero private data leakage in public statistics.
 * - Proves status "Under Review" (REPORTED) contributes to public totals and admin queues.
 */

import { setupIsolatedTestDb, teardownIsolatedTestDb } from './testDbHelper.js';
import { createApp } from '../dist/app.js';
import { generateAuthToken } from '../dist/modules/auth/jwt.utils.js';
import { UserModel } from '../dist/modules/auth/user.model.js';
import mongoose from 'mongoose';

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

async function runGrievanceSyncAndStatsTests() {
  console.log('===============================================================');
  console.log('CivicConnect: Grievance Sync, Admin Queue & Stats Verification');
  console.log('===============================================================\n');

  await setupIsolatedTestDb();
  const app = createApp();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------------------
    // Step 1: Provision Isolated Test Users
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Provisioning Isolated Test Users ---');
    const citizen1 = await UserModel.create({
      phoneNumber: '9111111111',
      fullName: 'Aarav Gupta',
      wardNumber: 10,
      role: 'citizen',
      isPhoneVerified: true,
    });

    const citizen2 = await UserModel.create({
      phoneNumber: '9222222222',
      fullName: 'Pooja Sharma',
      wardNumber: 20,
      role: 'citizen',
      isPhoneVerified: true,
    });

    const adminUser = await UserModel.create({
      phoneNumber: '9419100001',
      fullName: 'JMC City Administrator',
      wardNumber: 1,
      role: 'admin',
      isPhoneVerified: true,
    });

    const citizen1Token = generateAuthToken(citizen1);
    const citizen2Token = generateAuthToken(citizen2);
    const adminToken = generateAuthToken(adminUser);

    assert(Boolean(citizen1Token), 'Citizen 1 token generated');
    assert(Boolean(citizen2Token), 'Citizen 2 token generated');
    assert(Boolean(adminToken), 'Administrator token generated');

    // -------------------------------------------------------------------------
    // Step 2: Administrator Password Login Endpoint Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Administrator Sign-In Endpoint (POST /api/auth/admin-login) ---');
    const invalidAdminLogin = await fetch(`${baseUrl}/api/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: 'cityadmin@civicconnect.demo', password: 'WrongPassword!' }),
    });
    assert(invalidAdminLogin.status === 401, 'Invalid admin password rejected with HTTP 401 Unauthorized');

    const validAdminLogin = await fetch(`${baseUrl}/api/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: 'cityadmin@civicconnect.demo', password: 'CityAdmin123!' }),
    });
    assert(validAdminLogin.status === 200, 'Valid admin login succeeds with HTTP 200 OK');
    const adminLoginData = await validAdminLogin.json();
    assert(adminLoginData.success === true, 'Admin login response has success: true');
    assert(typeof adminLoginData.token === 'string', 'Admin login returns signed JWT token');
    assert(adminLoginData.user.role === 'admin', 'Admin login user has role: "admin"');
    assert(mongoose.isValidObjectId(adminLoginData.user.id), `Admin login user ID is a valid 24-char ObjectId (${adminLoginData.user.id})`);

    // -------------------------------------------------------------------------
    // Step 3: Initial Empty State for Public Stats
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Public Statistics Endpoint Initial State (GET /api/complaints/stats) ---');
    const initialStatsRes = await fetch(`${baseUrl}/api/complaints/stats`);
    assert(initialStatsRes.status === 200, 'GET /api/complaints/stats returns HTTP 200 without authentication');
    const initialStatsData = await initialStatsRes.json();
    assert(initialStatsData.success === true, 'Public stats response has success: true');
    assert(initialStatsData.stats.total === 0, 'Initial total grievances is 0');
    assert(initialStatsData.stats.reported === 0, 'Initial reported count is 0');
    assert(initialStatsData.stats.inProgress === 0, 'Initial in-progress count is 0');
    assert(initialStatsData.stats.resolved === 0, 'Initial resolved count is 0');
    assert(initialStatsData.stats.totalSupports === 0, 'Initial total supports is 0');
    assert(initialStatsData.stats.resolutionRate === '0%', 'Initial resolution rate is 0%');

    // -------------------------------------------------------------------------
    // Step 4: Citizen 1 Submits Grievance (Canonical Storage)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Citizen 1 Submits Grievance (Status: REPORTED / Under Review) ---');
    const submitRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${citizen1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Burst water pipeline near Canal Road',
        description: 'Clean drinking water leaking on main road causing low pressure in ward 10.',
        category: 'WATER_SUPPLY',
        location: { latitude: 32.7266, longitude: 74.857 },
        address: 'Canal Road near Science College',
        wardId: 10,
        reporterName: 'Aarav Gupta',
      }),
    });

    assert(submitRes.status === 201, 'Grievance submission returns HTTP 201 Created');
    const submitData = await submitRes.json();
    const createdGrievance = submitData.grievance;
    assert(Boolean(createdGrievance.id), 'Grievance has valid id');
    assert(Boolean(createdGrievance.trackingNumber), `Assigned tracking number: ${createdGrievance.trackingNumber}`);
    assert(createdGrievance.status === 'REPORTED', 'Canonical status is initialized to REPORTED (Under Review)');
    assert(createdGrievance.supportCount === 1, 'Initial support count is 1');

    // -------------------------------------------------------------------------
    // Step 5: Citizen 1 Dashboard Isolation (GET /api/complaints/my)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Citizen Dashboard Data Consistency ---');
    const citizen1MyRes = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(citizen1MyRes.status === 200, 'Citizen 1 GET /api/complaints/my returns HTTP 200 OK');
    const citizen1MyData = await citizen1MyRes.json();
    assert(citizen1MyData.complaints.length === 1, 'Citizen 1 receives exactly 1 complaint');
    assert(
      citizen1MyData.complaints[0].trackingNumber === createdGrievance.trackingNumber,
      'Citizen 1 complaint matches submitted tracking number'
    );
    assert(
      citizen1MyData.complaints[0].status === 'REPORTED',
      'Citizen 1 complaint status is REPORTED (Under Review)'
    );

    // Citizen 2 sees 0 complaints (Strict Citizen Isolation)
    const citizen2MyRes = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${citizen2Token}` },
    });
    const citizen2MyData = await citizen2MyRes.json();
    assert(citizen2MyData.complaints.length === 0, 'Citizen 2 sees 0 complaints (strict isolation verified)');

    // -------------------------------------------------------------------------
    // Step 6: Administrator Triage Queue (GET /api/complaints)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Admin Queue Sees Same Canonical Submission ---');
    const adminQueueRes = await fetch(`${baseUrl}/api/complaints`, {
      headers: { Authorization: `Bearer ${adminLoginData.token}` },
    });
    assert(adminQueueRes.status === 200, 'Admin token GET /api/complaints returns HTTP 200 OK');
    const adminQueueData = await adminQueueRes.json();
    assert(adminQueueData.complaints.length === 1, 'Admin queue contains 1 ticket from canonical collection');
    assert(
      adminQueueData.complaints[0].trackingNumber === createdGrievance.trackingNumber,
      'Admin ticket matches citizen submission tracking number'
    );
    assert(
      adminQueueData.complaints[0].status === 'REPORTED',
      'Admin ticket status is REPORTED (Under Review)'
    );

    // -------------------------------------------------------------------------
    // Step 7: Public Aggregate Statistics (GET /api/complaints/stats)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Public Homepage Aggregate Statistics Reflection ---');
    const publicStatsRes = await fetch(`${baseUrl}/api/complaints/stats`);
    assert(publicStatsRes.status === 200, 'Public GET /api/complaints/stats returns HTTP 200');
    const publicStatsData = await publicStatsRes.json();
    const stats = publicStatsData.stats;

    assert(stats.total === 1, 'Public Total Grievances reflected accurately as 1');
    assert(stats.reported === 1, 'Under Review (REPORTED) properly counted in reported stats: 1');
    assert(stats.inProgress === 0, 'In Field Resolution count is 0');
    assert(stats.resolved === 0, 'Resolved count is 0');
    assert(stats.totalSupports === 1, 'Community Upvotes count is 1');
    assert(stats.resolutionRate === '0%', 'Resolution rate is 0%');

    // CRITICAL PRIVACY CHECKS: No private citizen data exposed
    assert(publicStatsData.complaints === undefined, 'Public stats strictly omits complaints array');
    assert(stats.reporterPhone === undefined, 'CRITICAL PRIVACY: reporterPhone is not exposed in public stats');
    assert(stats.reporterName === undefined, 'CRITICAL PRIVACY: reporterName is not exposed in public stats');
    assert(stats.citizenId === undefined, 'CRITICAL PRIVACY: citizenId is not exposed in public stats');

    // -------------------------------------------------------------------------
    // Step 8: Status Progression to IN_PROGRESS Updates All Three Surfaces
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Status Transition to IN_PROGRESS Updates All Views ---');
    const updateInProgressRes = await fetch(`${baseUrl}/api/complaints/${createdGrievance.id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminLoginData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        note: 'Jal Shakti engineering team dispatched to Canal Road site',
      }),
    });
    assert(updateInProgressRes.status === 200, 'Admin PATCH status returns HTTP 200 OK');

    // Check Citizen Dashboard
    const citizenAfterUpdate = await (
      await fetch(`${baseUrl}/api/complaints/my`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      })
    ).json();
    assert(
      citizenAfterUpdate.complaints[0].status === 'IN_PROGRESS',
      'Citizen Dashboard immediately reflects IN_PROGRESS (Crew Dispatched)'
    );

    // Check Admin Queue
    const adminAfterUpdate = await (
      await fetch(`${baseUrl}/api/complaints`, {
        headers: { Authorization: `Bearer ${adminLoginData.token}` },
      })
    ).json();
    assert(
      adminAfterUpdate.complaints[0].status === 'IN_PROGRESS',
      'Admin Triage Queue immediately reflects IN_PROGRESS'
    );

    // Check Public Homepage Statistics
    const statsAfterInProgress = await (await fetch(`${baseUrl}/api/complaints/stats`)).json();
    assert(statsAfterInProgress.stats.total === 1, 'Public stats total remains 1');
    assert(statsAfterInProgress.stats.reported === 0, 'Public stats reported is now 0');
    assert(statsAfterInProgress.stats.inProgress === 1, 'Public In Field Resolution is now 1');
    assert(statsAfterInProgress.stats.resolved === 0, 'Public Resolved count remains 0');

    // -------------------------------------------------------------------------
    // Step 9: Status Progression to RESOLVED Updates Resolution Stats
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Status Transition to RESOLVED ---');
    const updateResolvedRes = await fetch(`${baseUrl}/api/complaints/${createdGrievance.id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminLoginData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        note: 'Pipeline replaced and pressure tested successfully.',
      }),
    });
    assert(updateResolvedRes.status === 200, 'Admin PATCH status to RESOLVED returns HTTP 200 OK');

    const statsAfterResolved = await (await fetch(`${baseUrl}/api/complaints/stats`)).json();
    assert(statsAfterResolved.stats.total === 1, 'Public stats total remains 1');
    assert(statsAfterResolved.stats.inProgress === 0, 'Public In Field Resolution is now 0');
    assert(statsAfterResolved.stats.resolved === 1, 'Public Successfully Resolved is now 1');
    assert(statsAfterResolved.stats.resolutionRate === '100%', 'Public Resolution Rate is now 100%');

    // -------------------------------------------------------------------------
    // Step 10: Authorization Guard Verification (Preserve Security)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 10: Authorization Guard Verification ---');
    const citizenBlockedList = await fetch(`${baseUrl}/api/complaints`, {
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(citizenBlockedList.status === 403, 'Citizen token blocked from admin queue (HTTP 403)');

    const unauthBlockedList = await fetch(`${baseUrl}/api/complaints`);
    assert(unauthBlockedList.status === 401, 'Unauthenticated request blocked from admin queue (HTTP 401)');

    const citizenBlockedPatch = await fetch(`${baseUrl}/api/complaints/${createdGrievance.id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${citizen1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'REPORTED' }),
    });
    assert(citizenBlockedPatch.status === 403, 'Citizen blocked from modifying grievance status (HTTP 403)');

    // -------------------------------------------------------------------------
    // Step 11: Regression Test: Invalid User ID in Token (Non-ObjectId string)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 11: Regression Test - Invalid User ID Scenario ---');
    const legacyInvalidToken = generateAuthToken({
      id: 'usr-city-admin-01',
      phoneNumber: '+919419100001',
      role: 'admin',
    });

    const invalidIdListRes = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${legacyInvalidToken}` },
    });
    assert(invalidIdListRes.status === 400, 'Invalid user ID in token rejected with HTTP 400 Bad Request (no unhandled 500 BSONError)');
    const invalidIdListData = await invalidIdListRes.json();
    assert(
      invalidIdListData.error && invalidIdListData.error.message.includes('Invalid citizen user identifier'),
      'Provides structured error message for invalid user ID format'
    );

    const invalidIdPostRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${legacyInvalidToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Broken streetlight',
        description: 'Lamp post not functioning',
        category: 'STREET_LIGHTING',
        location: { latitude: 32.7266, longitude: 74.857 },
        address: 'Ward 1',
        wardId: 1,
      }),
    });
    assert(invalidIdPostRes.status === 400, 'Invalid user ID in POST /api/complaints rejected with HTTP 400 Bad Request');
  } catch (err) {
    console.error('[Error] Test execution error:', err);
    failed++;
  } finally {
    server.close();
    await teardownIsolatedTestDb();
  }

  console.log('\n===============================================================');
  console.log(`Verification Complete: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGrievanceSyncAndStatsTests();
