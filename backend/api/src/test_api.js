/**
 * Automated Verification Test Suite for CivicConnect Backend Foundation
 * Tests all required endpoints, validation guards, and error responses.
 */

import http from 'http';
import mongoose from 'mongoose';
import app from './server.js';
import { connectDB } from './config/db.js';

const TEST_PORT = 5055;
let server;
let baseUrl = `http://127.0.0.1:${TEST_PORT}`;

const results = [];

function recordTest(name, passed, details = '') {
  results.push({ name, passed, details });
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${mark}: ${name} ${details ? `(${details})` : ''}`);
}

async function apiRequest(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
    ...options,
  });

  let data = null;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data, headers: response.headers };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   CivicConnect Backend Foundation Verification Suite   ');
  console.log('======================================================\n');

  try {
    // 1. Test GET /health
    const health = await apiRequest('/health');
    recordTest(
      'GET /health returns 200 and health metadata',
      health.status === 200 && health.data.status === 'healthy',
      `DB mode: ${health.data.database?.mode}`
    );

    // 2. Test GET / root
    const root = await apiRequest('/');
    recordTest(
      'GET / root route returns welcome metadata',
      root.status === 200 && root.data.service.includes('CivicConnect')
    );

    // 3. Test POST /api/complaints (Valid creation with coordinates)
    const validComplaintPayload = {
      title: 'Severe pothole crater near Gol Market gate 2',
      description: 'Vehicles swerving into oncoming traffic causing immediate road hazard after rainfall.',
      category: 'POTHOLE_ROAD',
      priority: 'HIGH',
      location: {
        latitude: 32.7088,
        longitude: 74.8631,
      },
      address: 'Near Gate 2, Gol Market, Gandhi Nagar, Jammu',
      landmark: 'Opposite State Bank',
      wardId: 20,
      reporterName: 'Anil Sharma',
      reporterPhone: '+91 94191 00001',
      isAnonymous: false,
    };

    const createRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(validComplaintPayload),
    });

    const createdComplaint = createRes.data.data;
    recordTest(
      'POST /api/complaints creates complaint with coordinates (201)',
      createRes.status === 201 &&
        createdComplaint?.trackingNumber?.startsWith('JMC-2026-') &&
        createdComplaint?.status === 'REPORTED',
      `Tracking: ${createdComplaint?.trackingNumber}`
    );

    // 4. Test POST /api/complaints (Valid creation WITHOUT coordinates - optional location)
    const noLocationPayload = {
      title: 'Water pipe leak in lane 4',
      description: 'Underground drinking water pipeline burst wasting clean water across the street.',
      category: 'WATER_SUPPLY',
    };

    const createNoLocRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(noLocationPayload),
    });

    recordTest(
      'POST /api/complaints permits optional location (201)',
      createNoLocRes.status === 201 &&
        createNoLocRes.data.data?.location === null &&
        createNoLocRes.data.data?.category === 'WATER_SUPPLY',
      `Category: ${createNoLocRes.data.data?.category}`
    );

    // 5. Test Validation: Empty Title
    const emptyTitleRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: '',
        description: 'Valid description of at least ten characters',
      }),
    });
    recordTest(
      'POST /api/complaints rejects empty title with 400',
      emptyTitleRes.status === 400 && emptyTitleRes.data.error === 'VALIDATION_ERROR'
    );

    // 6. Test Validation: Description too short (< 10 chars)
    const shortDescRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Valid Title Here',
        description: 'Short',
      }),
    });
    recordTest(
      'POST /api/complaints rejects description < 10 chars with 400',
      shortDescRes.status === 400 && shortDescRes.data.error === 'VALIDATION_ERROR'
    );

    // 7. Test Validation: Invalid Category
    const invalidCatRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Valid Title Here',
        description: 'Valid description that has plenty of length to pass',
        category: 'NOT_A_REAL_CATEGORY',
      }),
    });
    recordTest(
      'POST /api/complaints rejects invalid category with 400',
      invalidCatRes.status === 400 && invalidCatRes.data.message.includes('Allowed categories')
    );

    // 8. Test Validation: Invalid Coordinates (out of bounds)
    const invalidCoordRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Valid Title Here',
        description: 'Valid description that has plenty of length to pass',
        location: {
          latitude: 95.0, // Invalid latitude > 90
          longitude: 74.8,
        },
      }),
    });
    recordTest(
      'POST /api/complaints rejects latitude > 90 with 400',
      invalidCoordRes.status === 400 && invalidCoordRes.data.message.includes('Latitude must be between')
    );

    // 9. Test GET /api/complaints (List & Pagination)
    const listRes = await apiRequest('/api/complaints');
    recordTest(
      'GET /api/complaints lists complaints with total and pagination (200)',
      listRes.status === 200 &&
        Array.isArray(listRes.data.data) &&
        listRes.data.total >= 2,
      `Total count: ${listRes.data.total}`
    );

    // 10. Test GET /api/complaints?category=POTHOLE_ROAD (Filter)
    const filterCatRes = await apiRequest('/api/complaints?category=POTHOLE_ROAD');
    recordTest(
      'GET /api/complaints filters by category (200)',
      filterCatRes.status === 200 &&
        filterCatRes.data.data.every((c) => c.category === 'POTHOLE_ROAD'),
      `Matches: ${filterCatRes.data.count}`
    );

    // 11. Test GET /api/complaints?searchQuery=Gol+Market (Search)
    const searchRes = await apiRequest('/api/complaints?searchQuery=Gol+Market');
    recordTest(
      'GET /api/complaints searches text in title/description (200)',
      searchRes.status === 200 && searchRes.data.count >= 1,
      `Matches: ${searchRes.data.count}`
    );

    // 12. Test GET /api/complaints/:id by ID
    const targetId = createdComplaint.id;
    const getByIdRes = await apiRequest(`/api/complaints/${targetId}`);
    recordTest(
      'GET /api/complaints/:id retrieves complaint by ID (200)',
      getByIdRes.status === 200 && getByIdRes.data.data.id === targetId,
      `Retrieved: ${getByIdRes.data.data.title}`
    );

    // 13. Test GET /api/complaints/:id by tracking number
    const trackingNum = createdComplaint.trackingNumber;
    const getByTrackingRes = await apiRequest(`/api/complaints/${trackingNum}`);
    recordTest(
      'GET /api/complaints/:id retrieves complaint by tracking number (200)',
      getByTrackingRes.status === 200 && getByTrackingRes.data.data.trackingNumber === trackingNum
    );

    // 14. Test GET /api/complaints/:id with missing ID (404)
    const notFoundRes = await apiRequest('/api/complaints/JMC-2026-999999');
    recordTest(
      'GET /api/complaints/:id returns 404 for non-existent complaint',
      notFoundRes.status === 404 && notFoundRes.data.error === 'NOT_FOUND'
    );

    // 15. Test PATCH /api/complaints/:id/status (Valid update)
    const patchRes = await apiRequest(`/api/complaints/${targetId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        note: 'Field engineer assigned to survey pothole',
        actor: 'Municipal Engineer Sharma',
      }),
    });

    const updated = patchRes.data.data;
    const lastTimeline = updated?.timeline?.[updated.timeline.length - 1];

    recordTest(
      'PATCH /api/complaints/:id/status updates status and appends timeline (200)',
      patchRes.status === 200 &&
        updated?.status === 'IN_PROGRESS' &&
        lastTimeline?.status === 'IN_PROGRESS' &&
        lastTimeline?.note === 'Field engineer assigned to survey pothole',
      `New status: ${updated?.status}`
    );

    // 16. Test PATCH /api/complaints/:id/status (Invalid status value)
    const invalidStatusRes = await apiRequest(`/api/complaints/${targetId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'DISCARDED_FOREVER', // Not in allowed statuses
      }),
    });

    recordTest(
      'PATCH /api/complaints/:id/status rejects invalid status with 400',
      invalidStatusRes.status === 400 && invalidStatusRes.data.message.includes('Allowed values')
    );

    // 17. Test 404 handler for unknown route
    const unknownRouteRes = await apiRequest('/api/unknown-endpoint');
    recordTest(
      'Unmatched routes trigger notFoundHandler (404)',
      unknownRouteRes.status === 404 && unknownRouteRes.data.error === 'NOT_FOUND'
    );

    // 18. Test malformed JSON payload handling
    const malformedJsonRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title": "Unclosed string JSON ...',
    });
    const malformedData = await malformedJsonRes.json();
    recordTest(
      'Malformed JSON payload returns 400 with clean error',
      malformedJsonRes.status === 400 && malformedData.error === 'MALFORMED_JSON'
    );

    console.log('\n======================================================');
    const totalPassed = results.filter((r) => r.passed).length;
    console.log(`Summary: ${totalPassed} / ${results.length} tests passed successfully.`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    if (server) {
      server.close();
    }
  }
}

// Start test server and run suite
async function main() {
  await connectDB();
  server = app.listen(TEST_PORT, async () => {
    console.log(`[Test Runner] Started test server on port ${TEST_PORT}`);
    await runTests();
    server.close(async () => {
      console.log('[Test Runner] Test server closed.');
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      process.exit(0);
    });
  });
}

main();
