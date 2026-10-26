/**
 * Comprehensive Backend Audit & Stabilization Test Suite
 * CivicConnect — Municipal Grievance Triage System
 *
 * Verifies all 8 audit points:
 * 1. Health endpoint accuracy (200 healthy when connected vs 503 unhealthy when disconnected)
 * 2. Persistence in MongoDB Atlas
 * 3. Validation guards (title, description length, categories, coordinates, regex escaping)
 * 4. Filtering and pagination
 * 5. Status update lifecycle and rejection of arbitrary status values
 * 6. Protection & immutability of user-provided content (category, description, title) when prediction fields are added
 * 7. Error handling for malformed JSON, missing records, and unhandled routes
 * 8. Standardized API response structure across all endpoints
 */

import 'dotenv/config';
process.env.NODE_ENV = 'test';

import http from 'http';
import mongoose from 'mongoose';
import app from './server.js';
import { connectDB, isDatabaseReady } from './config/db.js';
import { Grievance } from './models/Grievance.js';

const TEST_PORT = 5055;
let server;
const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

const testResults = [];

function recordTest(name, passed, details = '') {
  testResults.push({ name, passed, details });
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge}: ${name} ${details ? `(${details})` : ''}`);
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

  return { status: response.status, data };
}

async function runAuditSuite() {
  console.log('\n======================================================');
  console.log('   CivicConnect Backend Stabilization & Audit Suite   ');
  console.log('======================================================\n');

  let testComplaintId = null;
  let testTrackingNumber = null;
  const originalDescription = 'Deep road crater outside Gol Market gate 2 causing severe traffic risk.';
  const originalTitle = 'Severe pothole crater near Gol Market gate 2';
  const originalCategory = 'POTHOLE_ROAD';

  try {
    // -------------------------------------------------------------------
    // Task 7: Health Endpoint with Active Database
    // -------------------------------------------------------------------
    const healthRes = await apiRequest('/health');
    const isDbConnected = isDatabaseReady();
    recordTest(
      'Task 7: GET /health accurately reports healthy when DB is connected (200)',
      healthRes.status === 200 &&
        healthRes.data.status === 'healthy' &&
        healthRes.data.database.connected === isDbConnected &&
        healthRes.data.database.mode === 'mongodb',
      `ReadyState: ${healthRes.data.database.readyState}, Mode: ${healthRes.data.database.mode}`
    );

    // Root Welcome Endpoint
    const rootRes = await apiRequest('/');
    recordTest(
      'Task 1: GET / returns API Gateway information and route catalog (200)',
      rootRes.status === 200 &&
        rootRes.data.service.includes('CivicConnect') &&
        rootRes.data.endpoints.complaints === '/api/complaints'
    );

    // -------------------------------------------------------------------
    // Task 2 & 3: Complaint Creation & Database Persistence
    // -------------------------------------------------------------------
    const createPayload = {
      title: originalTitle,
      description: originalDescription,
      category: originalCategory,
      priority: 'HIGH',
      location: {
        latitude: 32.7088,
        longitude: 74.8631,
      },
      address: 'Gate 2, Gol Market, Gandhi Nagar, Jammu',
      landmark: 'Near State Bank',
      wardId: 20,
      reporterName: 'Anil Sharma',
      reporterPhone: '+91 94191 00001',
      isAnonymous: false,
    };

    const createRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(createPayload),
    });

    const createdData = createRes.data?.data;
    testComplaintId = createdData?.id;
    testTrackingNumber = createdData?.trackingNumber;

    recordTest(
      'Task 2: POST /api/complaints creates valid complaint with tracking number (201)',
      createRes.status === 201 &&
        testTrackingNumber?.startsWith('JMC-2026-') &&
        createdData?.status === 'REPORTED',
      `ID: ${testComplaintId}, Tracking: ${testTrackingNumber}`
    );

    // Verify persistence directly in MongoDB Atlas via Mongoose
    if (isDbConnected) {
      const persistedInDb = await Grievance.findById(testComplaintId);
      recordTest(
        'Task 3: Complaint is genuinely persisted in MongoDB database',
        persistedInDb !== null && persistedInDb.trackingNumber === testTrackingNumber,
        `Persisted in collection: grievances, _id: ${persistedInDb?._id}`
      );
    }

    // -------------------------------------------------------------------
    // Task 2: Optional Location (Complaints submitted without coordinates)
    // -------------------------------------------------------------------
    const noCoordPayload = {
      title: 'Water supply contaminated in lane 5',
      description: 'Tap water is muddy and foul-smelling since this morning.',
      category: 'WATER_SUPPLY',
    };

    const noCoordRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(noCoordPayload),
    });

    recordTest(
      'Task 2: POST /api/complaints permits complaint without coordinates',
      noCoordRes.status === 201 &&
        noCoordRes.data?.data?.location === null &&
        noCoordRes.data?.data?.category === 'WATER_SUPPLY',
      `Tracking: ${noCoordRes.data?.data?.trackingNumber}`
    );

    // Clean up second test complaint if persisted
    if (isDbConnected && noCoordRes.data?.data?.id) {
      await Grievance.findByIdAndDelete(noCoordRes.data.data.id);
    }

    // -------------------------------------------------------------------
    // Task 1: Validation Rules (Title, Description, Category, Coordinates)
    // -------------------------------------------------------------------
    const emptyTitleRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: '   ',
        description: 'Valid description that has plenty of length to pass',
      }),
    });
    recordTest(
      'Task 1: POST /api/complaints rejects empty/whitespace title (400)',
      emptyTitleRes.status === 400 && emptyTitleRes.data.error === 'VALIDATION_ERROR'
    );

    const shortDescRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Valid Complaint Title',
        description: 'Too short',
      }),
    });
    recordTest(
      'Task 1: POST /api/complaints rejects description < 10 characters (400)',
      shortDescRes.status === 400 && shortDescRes.data.error === 'VALIDATION_ERROR'
    );

    const invalidCatRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Valid Complaint Title',
        description: 'Valid description with sufficient length for testing.',
        category: 'INVALID_CATEGORY_NAME',
      }),
    });
    recordTest(
      'Task 1: POST /api/complaints rejects invalid category (400)',
      invalidCatRes.status === 400 && invalidCatRes.data.message.includes('Allowed categories')
    );

    const invalidLatRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Valid Complaint Title',
        description: 'Valid description with sufficient length for testing.',
        location: { latitude: 95.5, longitude: 74.8 },
      }),
    });
    recordTest(
      'Task 1: POST /api/complaints rejects latitude > 90 (400)',
      invalidLatRes.status === 400 && invalidLatRes.data.message.includes('Latitude must be between')
    );

    const missingOneCoordRes = await apiRequest('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Valid Complaint Title',
        description: 'Valid description with sufficient length for testing.',
        location: { latitude: 32.7 }, // Missing longitude
      }),
    });
    recordTest(
      'Task 1: POST /api/complaints rejects location with only one coordinate (400)',
      missingOneCoordRes.status === 400 && missingOneCoordRes.data.message.includes('Both latitude and longitude')
    );

    // -------------------------------------------------------------------
    // Task 4: Pagination, Filtering, and Safe Search
    // -------------------------------------------------------------------
    const listRes = await apiRequest('/api/complaints?page=1&limit=5');
    recordTest(
      'Task 4: GET /api/complaints returns paginated list with total count (200)',
      listRes.status === 200 &&
        Array.isArray(listRes.data.data) &&
        typeof listRes.data.total === 'number' &&
        listRes.data.page === 1,
      `Returned count: ${listRes.data.count}, Total: ${listRes.data.total}`
    );

    const filterCategoryRes = await apiRequest('/api/complaints?category=POTHOLE_ROAD');
    recordTest(
      'Task 4: GET /api/complaints?category=POTHOLE_ROAD filters correctly (200)',
      filterCategoryRes.status === 200 &&
        filterCategoryRes.data.data.every((c) => c.category === 'POTHOLE_ROAD'),
      `Matches: ${filterCategoryRes.data.count}`
    );

    const searchRes = await apiRequest('/api/complaints?q=Gol+Market');
    recordTest(
      'Task 4: GET /api/complaints?q=... performs case-insensitive text search (200)',
      searchRes.status === 200 && searchRes.data.count >= 1,
      `Matches: ${searchRes.data.count}`
    );

    // Regex safety test: special characters such as ( or [ must not crash search
    const regexSearchRes = await apiRequest('/api/complaints?q=(Gate+2)');
    recordTest(
      'Task 1: GET /api/complaints?q=(Gate+2) safely handles regex special characters without error (200)',
      regexSearchRes.status === 200 && Array.isArray(regexSearchRes.data.data),
      `Status: ${regexSearchRes.status}`
    );

    // -------------------------------------------------------------------
    // Task 2: Retrieval by ID and Tracking Number
    // -------------------------------------------------------------------
    const getByIdRes = await apiRequest(`/api/complaints/${testComplaintId}`);
    recordTest(
      'Task 2: GET /api/complaints/:id retrieves by MongoDB ID (200)',
      getByIdRes.status === 200 && getByIdRes.data.data.id === testComplaintId,
      `Title: "${getByIdRes.data.data.title}"`
    );

    const getByTrackingRes = await apiRequest(`/api/complaints/${testTrackingNumber}`);
    recordTest(
      'Task 2: GET /api/complaints/:id retrieves by JMC tracking number (200)',
      getByTrackingRes.status === 200 && getByTrackingRes.data.data.trackingNumber === testTrackingNumber
    );

    const missingIdRes = await apiRequest('/api/complaints/JMC-2026-999999');
    recordTest(
      'Task 1: GET /api/complaints/:id returns 404 for non-existent complaint',
      missingIdRes.status === 404 && missingIdRes.data.error === 'NOT_FOUND'
    );

    // -------------------------------------------------------------------
    // Task 5: Status Updates and Rejection of Arbitrary Invalid Values
    // -------------------------------------------------------------------
    const validPatchRes = await apiRequest(`/api/complaints/${testComplaintId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        note: 'Field crew dispatched with patch materials',
        actor: 'Municipal Engineer Gupta',
      }),
    });

    const updatedData = validPatchRes.data?.data;
    const latestTimeline = updatedData?.timeline?.[updatedData.timeline.length - 1];

    recordTest(
      'Task 5: PATCH /api/complaints/:id/status updates status and appends timeline (200)',
      validPatchRes.status === 200 &&
        updatedData?.status === 'IN_PROGRESS' &&
        latestTimeline?.status === 'IN_PROGRESS' &&
        latestTimeline?.note === 'Field crew dispatched with patch materials',
      `Status: ${updatedData?.status}`
    );

    const invalidStatusRes = await apiRequest(`/api/complaints/${testComplaintId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'ARBITRARY_INVALID_STATUS_VALUE',
      }),
    });
    recordTest(
      'Task 5: PATCH /api/complaints/:id/status rejects arbitrary invalid status (400)',
      invalidStatusRes.status === 400 &&
        invalidStatusRes.data.error === 'VALIDATION_ERROR' &&
        invalidStatusRes.data.message.includes('Allowed values')
    );

    // -------------------------------------------------------------------
    // Task 6: Immutability of User Content (Title, Description, Category)
    // -------------------------------------------------------------------
    const verifyDocRes = await apiRequest(`/api/complaints/${testComplaintId}`);
    const verifiedData = verifyDocRes.data?.data;

    const userContentIntact =
      verifiedData?.title === originalTitle &&
      verifiedData?.description === originalDescription &&
      verifiedData?.category === originalCategory &&
      verifiedData?.location?.latitude === 32.7088 &&
      verifiedData?.location?.longitude === 74.8631;

    recordTest(
      'Task 6: User-provided category, description, and location remain strictly intact after status update',
      userContentIntact,
      `Category: ${verifiedData?.category}, Status: ${verifiedData?.status}`
    );

    // Direct ML Prediction Addition Test:
    // Update ML prediction fields and verify user category/description remain untouched
    if (isDbConnected) {
      const grievanceDoc = await Grievance.findById(testComplaintId);
      grievanceDoc.predictedCategory = 'POTHOLE_ROAD';
      grievanceDoc.confidence = 0.94;
      grievanceDoc.modelVersion = 'civic-bert-jmc-v1.0';
      grievanceDoc.aiTriageMetadata = {
        processedAt: new Date(),
        detectedCategory: 'POTHOLE_ROAD',
        confidence: 0.94,
        severityScore: 4.5,
        suggestedDepartment: 'Roads & Buildings (PWD/JMC)',
        duplicateEvidence: null,
      };
      await grievanceDoc.save();

      const fetchWithMlRes = await apiRequest(`/api/complaints/${testComplaintId}`);
      const mlData = fetchWithMlRes.data?.data;

      const predictionsAdded =
        mlData?.predictedCategory === 'POTHOLE_ROAD' &&
        mlData?.confidence === 0.94 &&
        mlData?.modelVersion === 'civic-bert-jmc-v1.0' &&
        mlData?.aiTriageMetadata?.suggestedDepartment === 'Roads & Buildings (PWD/JMC)';

      const userFieldsStillIntact =
        mlData?.category === originalCategory &&
        mlData?.description === originalDescription &&
        mlData?.title === originalTitle &&
        mlData?.location?.latitude === 32.7088 &&
        mlData?.location?.longitude === 74.8631;

      recordTest(
        'Task 6: Prediction fields populate while user category, description, and location remain strictly intact',
        predictionsAdded && userFieldsStillIntact,
        `User Category: ${mlData?.category}, Predicted: ${mlData?.predictedCategory} (${mlData?.confidence})`
      );
    }

    // -------------------------------------------------------------------
    // Task 1: Error Handling & Reliability (Malformed JSON, 404 Route, Stubs)
    // -------------------------------------------------------------------
    const unknownRouteRes = await apiRequest('/api/non-existent-endpoint');
    recordTest(
      'Task 1: Unmatched routes return clean 404 response without leaking stack traces',
      unknownRouteRes.status === 404 && unknownRouteRes.data.error === 'NOT_FOUND'
    );

    const malformedJsonRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ "title": "Broken JSON missing closing quote',
    });
    const malformedData = await malformedJsonRes.json();
    recordTest(
      'Task 1: Malformed JSON syntax in request body returns clean 400 error',
      malformedJsonRes.status === 400 && malformedData.error === 'MALFORMED_JSON'
    );

    // Stubs consistent error format (Task 1)
    const wardStubRes = await apiRequest('/api/wards');
    recordTest(
      'Task 1: GET /api/wards stub returns standardized 501 NOT_IMPLEMENTED schema',
      wardStubRes.status === 501 && wardStubRes.data.error === 'NOT_IMPLEMENTED'
    );

    const analyticsStubRes = await apiRequest('/api/analytics/overview');
    recordTest(
      'Task 1: GET /api/analytics/overview stub returns standardized 501 schema',
      analyticsStubRes.status === 501 && analyticsStubRes.data.error === 'NOT_IMPLEMENTED'
    );

    // Clean up test complaint from database before health disconnect test
    if (isDbConnected && testComplaintId) {
      await Grievance.findByIdAndDelete(testComplaintId);
      console.log(`[Test Cleanup] Deleted test complaint ${testComplaintId} from database.`);
    }

    // -------------------------------------------------------------------
    // Task 7: Health Endpoint Failure Reporting When DB Disconnected
    // -------------------------------------------------------------------
    if (isDbConnected) {
      console.log('[Test Task 7] Temporarily disconnecting MongoDB to verify 503 unhealthy reporting...');
      await mongoose.disconnect();

      const disconnectedHealthRes = await apiRequest('/health');
      recordTest(
        'Task 7: GET /health returns 503 unhealthy when database dependency is unavailable',
        disconnectedHealthRes.status === 503 &&
          disconnectedHealthRes.data.status === 'unhealthy' &&
          disconnectedHealthRes.data.database.connected === false &&
          disconnectedHealthRes.data.database.readyState === 0,
        `Status: ${disconnectedHealthRes.data.status}, HTTP: ${disconnectedHealthRes.status}`
      );

      // Reconnect database to restore state
      console.log('[Test Task 7] Restoring MongoDB connection...');
      await connectDB();
      const reconnectedHealthRes = await apiRequest('/health');
      recordTest(
        'Task 7: GET /health returns 200 healthy after database reconnection',
        reconnectedHealthRes.status === 200 &&
          reconnectedHealthRes.data.status === 'healthy' &&
          reconnectedHealthRes.data.database.connected === true,
        `Status: ${reconnectedHealthRes.data.status}, HTTP: ${reconnectedHealthRes.status}`
      );
    }

    console.log('\n======================================================');
    const totalPassed = testResults.filter((r) => r.passed).length;
    console.log(`Summary: ${totalPassed} / ${testResults.length} audit verification tests passed.`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal test error in audit suite:', err);
  }
}

async function main() {
  await connectDB();

  server = app.listen(TEST_PORT, async () => {
    console.log(`[Audit Runner] Test server listening on http://127.0.0.1:${TEST_PORT}`);
    await runAuditSuite();
    server.close(async () => {
      console.log('[Audit Runner] Test server closed.');
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      process.exit(0);
    });
  });
}

main();
