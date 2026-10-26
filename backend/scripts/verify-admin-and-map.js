/**
 * CivicConnect Batch 2: Admin Workflow & Real Grievance Map Verification Suite
 *
 * Validates:
 * 1. No token → rejected with HTTP 401.
 * 2. Citizen token → forbidden from admin-only routes with HTTP 403.
 * 3. Admin token → can list grievances with HTTP 200.
 * 4. Admin token → can update a valid grievance with HTTP 200.
 * 5. Invalid status → rejected with HTTP 400.
 * 6. Updated status → persists in MongoDB and updates timeline.
 * 7. Citizen can still retrieve their own grievances with HTTP 200.
 * 8. Citizen cannot retrieve another citizen's private grievances (HTTP 403).
 * 9. Map endpoint (GET /api/complaints/map) retrieves real data with HTTP 200.
 * 10. Map endpoint strictly omits sensitive citizen info (reporterPhone, citizenId, etc.).
 * 11. Records without coordinates are safely handled.
 */

import { setupIsolatedTestDb, teardownIsolatedTestDb } from './testDbHelper.js';
import { createApp } from '../dist/app.js';
import { generateAuthToken } from '../dist/modules/auth/jwt.utils.js';
import { UserModel } from '../dist/modules/auth/user.model.js';
import { GrievanceModel } from '../dist/modules/grievance/grievance.model.js';
import { getJammuWard } from '../dist/utils/jammuWards.js';

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

async function runAdminAndMapTests() {
  console.log('===============================================================');
  console.log('CivicConnect Batch 2: Admin Workflow & Real Map Verification');
  console.log('===============================================================\n');

  await setupIsolatedTestDb();
  const app = createApp();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------------------
    // Setup Test Users: Citizen 1, Citizen 2, and Admin
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

    assert(Boolean(citizen1Token), 'Citizen 1 JWT generated');
    assert(Boolean(citizen2Token), 'Citizen 2 JWT generated');
    assert(Boolean(adminToken), 'Administrator JWT generated');

    // -------------------------------------------------------------------------
    // Seed Complaints
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Seeding Grievance Records in MongoDB ---');
    const ward10 = getJammuWard(10);
    const ward20 = getJammuWard(20);

    const grievance1 = await GrievanceModel.create({
      citizenId: citizen1._id,
      trackingNumber: 'JMC-2026-1001',
      title: 'Deep pothole on Circular Road',
      description: 'Dangerous pothole near Panjtirthi Chowk causing traffic slowdown.',
      category: 'POTHOLE_ROAD',
      status: 'REPORTED',
      priority: 'HIGH',
      location: { latitude: 32.735, longitude: 74.87 },
      geoPoint: { type: 'Point', coordinates: [74.87, 32.735] },
      address: 'Near Panjtirthi Chowk, Circular Road',
      ward: ward10,
      reporterName: 'Aarav Gupta',
      reporterPhone: '9111111111',
      isAnonymous: false,
      supportCount: 4,
      supportedBy: [citizen1._id],
      timeline: [
        {
          id: 'tl-1001-init',
          status: 'REPORTED',
          timestamp: new Date(),
          actor: 'Aarav Gupta',
          note: 'Initial report submitted via web',
        },
      ],
    });

    const grievance2 = await GrievanceModel.create({
      citizenId: citizen2._id,
      trackingNumber: 'JMC-2026-2002',
      title: 'Broken streetlight in Gandhi Nagar',
      description: 'Streetlight pole 44 not functioning for over a week.',
      category: 'STREET_LIGHT',
      status: 'REPORTED',
      priority: 'MEDIUM',
      location: { latitude: 32.7088, longitude: 74.8631 },
      geoPoint: { type: 'Point', coordinates: [74.8631, 32.7088] },
      address: 'Main Road Gandhi Nagar near Gole Market',
      ward: ward20,
      reporterName: 'Pooja Sharma',
      reporterPhone: '9222222222',
      isAnonymous: false,
      supportCount: 2,
      supportedBy: [citizen2._id],
      timeline: [
        {
          id: 'tl-2002-init',
          status: 'REPORTED',
          timestamp: new Date(),
          actor: 'Pooja Sharma',
          note: 'Initial report submitted via web',
        },
      ],
    });

    assert(Boolean(grievance1._id), 'Citizen 1 grievance seeded');
    assert(Boolean(grievance2._id), 'Citizen 2 grievance seeded');

    // -------------------------------------------------------------------------
    // Test 1: No Token → Rejected (HTTP 401)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Unauthenticated Request Rejection ---');
    const noTokenListRes = await fetch(`${baseUrl}/api/complaints`);
    assert(noTokenListRes.status === 401, 'GET /api/complaints without token rejected with HTTP 401');

    const noTokenPatchRes = await fetch(`${baseUrl}/api/complaints/${grievance1._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    assert(noTokenPatchRes.status === 401, 'PATCH /api/complaints/:id/status without token rejected with HTTP 401');

    // -------------------------------------------------------------------------
    // Test 2: Citizen Token → Forbidden from Admin Routes (HTTP 403)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Role-Based Authorization Enforcement (Citizen Forbidden) ---');
    const citizenListRes = await fetch(`${baseUrl}/api/complaints`, {
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(citizenListRes.status === 403, 'Citizen token requesting GET /api/complaints rejected with HTTP 403 Forbidden');
    const citizenListJson = await citizenListRes.json();
    assert(
      citizenListJson.error?.message?.includes('privileges'),
      'HTTP 403 response includes descriptive authorization error message'
    );

    const citizenPatchRes = await fetch(`${baseUrl}/api/complaints/${grievance1._id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${citizen1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    assert(citizenPatchRes.status === 403, 'Citizen token attempting PATCH /api/complaints/:id/status rejected with HTTP 403 Forbidden');

    // -------------------------------------------------------------------------
    // Test 3: Admin Token → Can List Grievances (HTTP 200)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Administrator Grievance Listing & Filtering ---');
    const adminListRes = await fetch(`${baseUrl}/api/complaints`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminListRes.status === 200, 'Admin token requesting GET /api/complaints returns HTTP 200 OK');
    const adminListJson = await adminListRes.json();
    assert(adminListJson.success === true, 'Response has success: true');
    assert(Array.isArray(adminListJson.complaints), 'Response complaints is an array');
    assert(adminListJson.complaints.length === 2, 'Admin receives all 2 city-wide grievances');

    // Test Admin Filtering by Category
    const adminFilterRes = await fetch(`${baseUrl}/api/complaints?category=POTHOLE_ROAD`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminFilterJson = await adminFilterRes.json();
    assert(adminFilterJson.complaints.length === 1, 'Filter by category=POTHOLE_ROAD returns exactly 1 match');
    assert(adminFilterJson.complaints[0].category === 'POTHOLE_ROAD', 'Filtered item category is POTHOLE_ROAD');

    // Test Admin Search Query
    const adminSearchRes = await fetch(`${baseUrl}/api/complaints?searchQuery=JMC-2026-2002`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminSearchJson = await adminSearchRes.json();
    assert(adminSearchJson.complaints.length === 1, 'Search by trackingNumber returns exact match');
    assert(adminSearchJson.complaints[0].trackingNumber === 'JMC-2026-2002', 'Found record matches trackingNumber');

    // -------------------------------------------------------------------------
    // Test 4 & 5: Admin Status Update Validation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Grievance Status Updates & Transition Validation ---');

    // 5A. Invalid Status Rejection (HTTP 400)
    const invalidStatusRes = await fetch(`${baseUrl}/api/complaints/${grievance1._id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'NON_EXISTENT_STATUS' }),
    });
    assert(invalidStatusRes.status === 400, 'Invalid status string rejected with HTTP 400 Bad Request');

    // 5B. Valid Transition: REPORTED -> IN_PROGRESS
    const updateInProgressRes = await fetch(`${baseUrl}/api/complaints/${grievance1._id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        note: 'Field crew dispatched with bitumen patcher',
      }),
    });
    assert(updateInProgressRes.status === 200, 'Admin update to IN_PROGRESS returns HTTP 200 OK');
    const inProgressJson = await updateInProgressRes.json();
    assert(inProgressJson.complaint.status === 'IN_PROGRESS', 'Returned complaint status is IN_PROGRESS');

    // -------------------------------------------------------------------------
    // Test 6: Status Persistence in MongoDB
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: MongoDB Persistence & Audit Timeline Verification ---');
    const updatedDbDoc = await GrievanceModel.findById(grievance1._id);
    assert(updatedDbDoc.status === 'IN_PROGRESS', 'MongoDB status is persisted as IN_PROGRESS');
    assert(updatedDbDoc.timeline.length === 2, 'Timeline length incremented to 2');
    const latestEvent = updatedDbDoc.timeline[updatedDbDoc.timeline.length - 1];
    assert(latestEvent.status === 'IN_PROGRESS', 'Latest timeline event status is IN_PROGRESS');
    assert(latestEvent.actor === 'City Administrator', 'Timeline actor correctly recorded as City Administrator');
    assert(latestEvent.note === 'Field crew dispatched with bitumen patcher', 'Timeline note matches input');

    // Transition to RESOLVED
    const updateResolvedRes = await fetch(`${baseUrl}/api/complaints/${grievance1._id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        note: 'Pothole filled and steamrolled. Works inspected and signed off.',
      }),
    });
    assert(updateResolvedRes.status === 200, 'Admin update to RESOLVED returns HTTP 200 OK');
    const resolvedDbDoc = await GrievanceModel.findById(grievance1._id);
    assert(resolvedDbDoc.status === 'RESOLVED', 'MongoDB status is persisted as RESOLVED');
    assert(Boolean(resolvedDbDoc.resolvedAt), 'resolvedAt timestamp is set upon resolution');

    // -------------------------------------------------------------------------
    // Test 7 & 8: Citizen Isolation & Own Complaint Visibility
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Citizen Isolation & Status Visibility ---');
    // Citizen 1 fetches their own complaints
    const citizen1MyRes = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(citizen1MyRes.status === 200, 'Citizen 1 GET /api/complaints/my returns HTTP 200');
    const citizen1MyJson = await citizen1MyRes.json();
    const citizen1Complaints = citizen1MyJson.complaints;
    assert(citizen1Complaints.length === 1, 'Citizen 1 receives exactly their 1 complaint');
    assert(
      citizen1Complaints[0].status === 'RESOLVED',
      'Citizen 1 immediately sees updated RESOLVED status on their dashboard'
    );

    // Citizen 1 tries to access Citizen 2 private complaint by ID
    const citizenAccessOtherRes = await fetch(`${baseUrl}/api/complaints/${grievance2._id}`, {
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(
      citizenAccessOtherRes.status === 403,
      'Citizen 1 accessing Citizen 2 complaint detail directly rejected with HTTP 403 Forbidden'
    );

    // Citizen 1 accesses their own complaint by ID
    const citizenAccessOwnRes = await fetch(`${baseUrl}/api/complaints/${grievance1._id}`, {
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(
      citizenAccessOwnRes.status === 200,
      'Citizen 1 accessing their own complaint detail succeeds with HTTP 200 OK'
    );

    // -------------------------------------------------------------------------
    // Test 9 & 10: Real Grievance Map Endpoint
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Real Grievance Map Endpoint Verification ---');
    const mapRes = await fetch(`${baseUrl}/api/complaints/map`);
    assert(mapRes.status === 200, 'GET /api/complaints/map is publicly accessible with HTTP 200');
    const mapJson = await mapRes.json();
    assert(mapJson.success === true, 'Map response success is true');
    assert(Array.isArray(mapJson.complaints), 'Map complaints is an array');
    assert(mapJson.complaints.length === 2, 'Map returns both real seeded complaints');

    const mapItem = mapJson.complaints[0];
    assert(Boolean(mapItem.id), 'Map item includes public ID');
    assert(Boolean(mapItem.trackingNumber), 'Map item includes tracking number');
    assert(Boolean(mapItem.location?.latitude), 'Map item has valid latitude');
    assert(Boolean(mapItem.location?.longitude), 'Map item has valid longitude');
    assert(Boolean(mapItem.category), 'Map item includes category');
    assert(Boolean(mapItem.status), 'Map item includes status');

    // Verify sensitive data privacy
    assert(mapItem.reporterPhone === undefined, 'CRITICAL PRIVACY: reporterPhone is strictly omitted');
    assert(mapItem.reporterName === undefined, 'CRITICAL PRIVACY: reporterName is strictly omitted');
    assert(mapItem.citizenId === undefined, 'CRITICAL PRIVACY: citizenId is strictly omitted');
    assert(mapItem.supportedBy === undefined, 'CRITICAL PRIVACY: supportedBy is strictly omitted');

    // -------------------------------------------------------------------------
    // Test 11: Records Without Coordinates Handled Safely
    // -------------------------------------------------------------------------
    console.log('\n--- Step 10: Handling Missing/Zero Coordinates Gracefully ---');
    const zeroCoordGrievance = await GrievanceModel.create({
      citizenId: citizen1._id,
      trackingNumber: 'JMC-2026-0000',
      title: 'General Civic Inquiry without pin',
      description: 'Complaint with zero coordinates',
      category: 'OTHER',
      status: 'REPORTED',
      priority: 'LOW',
      location: { latitude: 0, longitude: 0 },
      geoPoint: { type: 'Point', coordinates: [0, 0] },
      address: 'Jammu Municipal Corporation Head Office',
      ward: ward10,
      reporterName: 'Aarav Gupta',
      isAnonymous: false,
    });

    const refreshedMapRes = await fetch(`${baseUrl}/api/complaints/map`);
    const refreshedMapJson = await refreshedMapRes.json();
    const hasZeroCoord = refreshedMapJson.complaints.some(
      (c) => c.location.latitude === 0 && c.location.longitude === 0
    );
    assert(!hasZeroCoord, 'Map endpoint filters out 0,0 coordinates so Leaflet map is not cluttered or distorted');
  } finally {
    server.close();
    await teardownIsolatedTestDb();
  }

  console.log('\n===============================================================');
  console.log(`Verification Complete: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminAndMapTests().catch((err) => {
  console.error('[Error] Unexpected verification failure:', err);
  process.exit(1);
});
