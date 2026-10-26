/**
 * CivicConnect: Evidence Upload & Citizen Identity/Privacy Verification Suite
 *
 * Verifies:
 * 1. Unauthenticated file upload is rejected with HTTP 401.
 * 2. Upload with valid image types (JPEG, PNG, WebP) succeeds with HTTP 201 and returns accessible URL/metadata.
 * 3. Upload with unsupported MIME type (e.g. text/plain, PDF) is rejected with HTTP 400 Bad Request.
 * 4. Upload exceeding 5MB limit is rejected with HTTP 400 Bad Request.
 * 5. Uploaded image file is publicly accessible via HTTP GET /uploads/* route.
 * 6. Submitting grievance with nonexistent or failed image reference is rejected with HTTP 400.
 * 7. Submitting valid grievance with uploaded image metadata persists imageUrl, imageKey, and imageMetadata in MongoDB.
 * 8. Authenticated identity enforcement: client-provided phone or citizen ID cannot override JWT identity.
 * 9. Named grievance persists optional reporterName and authenticated phone number.
 * 10. Anonymous grievance strictly masks reporterName and reporterPhone from public responses.
 * 11. Public map endpoint (GET /api/complaints/map) strictly excludes reporterPhone, reporterName, and citizenId.
 */

import { setupIsolatedTestDb, teardownIsolatedTestDb } from './testDbHelper.js';
import { createApp } from '../dist/app.js';
import { generateAuthToken } from '../dist/modules/auth/jwt.utils.js';
import { UserModel } from '../dist/modules/auth/user.model.js';
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

async function runUploadAndIdentityTests() {
  console.log('===============================================================');
  console.log('CivicConnect: Evidence Upload & Identity Privacy Verification');
  console.log('===============================================================\n');

  await setupIsolatedTestDb();
  const app = createApp();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Provisioning Test Citizen Users ---');
    const citizen = await UserModel.create({
      phoneNumber: '9876543210',
      fullName: 'Vikram Jamwal',
      wardNumber: 12,
      role: 'citizen',
      isPhoneVerified: true,
    });

    const citizenWithoutName = await UserModel.create({
      phoneNumber: '9419123456',
      role: 'citizen',
      isPhoneVerified: true,
    });

    const citizenToken = generateAuthToken(citizen);
    const citizenNoNameToken = generateAuthToken(citizenWithoutName);
    assert(Boolean(citizenToken), 'Citizen 1 JWT generated');
    assert(Boolean(citizenNoNameToken), 'Citizen 2 (no name) JWT generated');

    // -------------------------------------------------------------------------
    // Test 1: Upload Without Authentication -> 401 Unauthorized
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Unauthenticated Upload Rejection ---');
    const unauthForm = new FormData();
    unauthForm.append('image', new Blob([Buffer.from('fake-jpeg-bytes')], { type: 'image/jpeg' }), 'evidence.jpg');

    const unauthRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: unauthForm,
    });
    assert(unauthRes.status === 401, 'POST /api/upload without token rejected with HTTP 401 Unauthorized');

    // -------------------------------------------------------------------------
    // Test 2: Upload Allowed Image Types (JPEG, PNG, WebP) -> 201 Created
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Allowed Image Formats Upload (JPEG, PNG, WebP) ---');
    // 2a: JPEG upload
    const jpegForm = new FormData();
    jpegForm.append('image', new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], { type: 'image/jpeg' }), 'pothole.jpg');
    const jpegRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: jpegForm,
    });
    assert(jpegRes.status === 201, 'POST /api/upload with image/jpeg returns HTTP 201 Created');
    const jpegData = await jpegRes.json();
    assert(jpegData.success === true, 'Upload response has success: true');
    assert(Boolean(jpegData.url), `Uploaded image URL is returned: ${jpegData.url}`);
    assert(Boolean(jpegData.key), `Uploaded image key is returned: ${jpegData.key}`);
    assert(jpegData.metadata?.mimeType === 'image/jpeg', 'MIME type is recorded as image/jpeg');
    const uploadedJpegUrl = jpegData.url;
    const uploadedJpegKey = jpegData.key;

    // 2b: PNG upload
    const pngForm = new FormData();
    pngForm.append('image', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }), 'streetlight.png');
    const pngRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: pngForm,
    });
    assert(pngRes.status === 201, 'POST /api/upload with image/png returns HTTP 201 Created');

    // 2c: WebP upload via route alias /api/complaints/upload
    const webpForm = new FormData();
    webpForm.append('file', new Blob([Buffer.from('RIFF....WEBP')], { type: 'image/webp' }), 'drainage.webp');
    const webpRes = await fetch(`${baseUrl}/api/complaints/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: webpForm,
    });
    assert(webpRes.status === 201, 'POST /api/complaints/upload with image/webp returns HTTP 201 Created');

    // -------------------------------------------------------------------------
    // Test 3: Unsupported MIME Types (PDF, text/plain) -> 400 Bad Request
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Unsupported MIME Types Rejection ---');
    const pdfForm = new FormData();
    pdfForm.append('image', new Blob([Buffer.from('%PDF-1.4 file content')], { type: 'application/pdf' }), 'document.pdf');
    const pdfRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: pdfForm,
    });
    assert(pdfRes.status === 400, 'POST /api/upload with application/pdf rejected with HTTP 400 Bad Request');
    const pdfData = await pdfRes.json();
    assert(
      pdfData.error?.message?.includes('Only JPEG, PNG, and WebP') || pdfData.error?.message?.includes('Invalid file'),
      'Descriptive error message returned for invalid file type'
    );

    const textForm = new FormData();
    textForm.append('image', new Blob([Buffer.from('hello world')], { type: 'text/plain' }), 'note.txt');
    const textRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: textForm,
    });
    assert(textRes.status === 400, 'POST /api/upload with text/plain rejected with HTTP 400 Bad Request');

    // -------------------------------------------------------------------------
    // Test 4: Oversized File Upload (>5MB) -> 400 Bad Request
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Oversized File (>5MB) Rejection ---');
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB
    const oversizedForm = new FormData();
    oversizedForm.append('image', new Blob([oversizedBuffer], { type: 'image/jpeg' }), 'large-photo.jpg');
    const oversizedRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: oversizedForm,
    });
    assert(oversizedRes.status === 400, 'POST /api/upload with >5MB file rejected with HTTP 400 Bad Request');

    // -------------------------------------------------------------------------
    // Test 5: Static Accessibility of Uploaded File
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Static File Accessibility ---');
    const fileFetchRes = await fetch(`${baseUrl}${uploadedJpegUrl}`);
    assert(fileFetchRes.status === 200, `GET ${uploadedJpegUrl} returns HTTP 200 OK`);
    assert(
      fileFetchRes.headers.get('content-type')?.includes('image/jpeg'),
      'Content-Type header correctly returned as image/jpeg'
    );

    // -------------------------------------------------------------------------
    // Test 6: Nonexistent or Failed Image Reference Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Nonexistent Image Reference Rejection ---');
    const invalidImagePayload = {
      title: 'Pothole near Residency Road',
      description: 'Severe road surface damage causing vehicle traffic congestion',
      category: 'POTHOLE_ROAD',
      location: { latitude: 32.7266, longitude: 74.857 },
      address: 'Residency Road, Ward 12, Jammu',
      wardId: 12,
      imageUrl: '/uploads/nonexistent-failed-upload-99999.jpg',
      imageKey: 'nonexistent-failed-upload-99999.jpg',
    };

    const invalidImageRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify(invalidImagePayload),
    });
    assert(
      invalidImageRes.status === 400,
      'POST /api/complaints referencing nonexistent upload rejected with HTTP 400 Bad Request'
    );

    // -------------------------------------------------------------------------
    // Test 7: Successful Upload Metadata Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Grievance Creation with Real Upload Metadata ---');
    const validUploadGrievancePayload = {
      title: 'Deep pothole outside Gol Market',
      description: 'Dangerous pothole damaging two wheelers near bakery',
      category: 'POTHOLE_ROAD',
      location: { latitude: 32.7088, longitude: 74.8624 },
      address: 'Gol Market, Gandhi Nagar, Ward 12',
      wardId: 12,
      imageUrl: uploadedJpegUrl,
      imageKey: uploadedJpegKey,
      imageMetadata: {
        filename: uploadedJpegKey,
        size: 16,
        mimeType: 'image/jpeg',
        originalName: 'pothole.jpg',
      },
    };

    const validCreateRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify(validUploadGrievancePayload),
    });
    assert(validCreateRes.status === 201, 'POST /api/complaints with valid uploaded image returns HTTP 201 Created');
    const validCreateData = await validCreateRes.json();
    assert(validCreateData.complaint?.imageUrl === uploadedJpegUrl, 'Created complaint preserves imageUrl');
    assert(validCreateData.complaint?.imageKey === uploadedJpegKey, 'Created complaint preserves imageKey');
    assert(validCreateData.complaint?.imageMetadata?.mimeType === 'image/jpeg', 'Created complaint preserves imageMetadata');

    // Verify in MongoDB directly
    const dbDoc = await GrievanceModel.findOne({ trackingNumber: validCreateData.complaint.trackingNumber });
    assert(Boolean(dbDoc), 'Grievance document found in MongoDB');
    assert(dbDoc.imageUrl === uploadedJpegUrl, 'MongoDB persists imageUrl');
    assert(dbDoc.imageKey === uploadedJpegKey, 'MongoDB persists imageKey');
    assert(dbDoc.imageMetadata?.originalName === 'pothole.jpg', 'MongoDB persists original file metadata');

    // -------------------------------------------------------------------------
    // Test 8: Authenticated Identity Enforcement (Spoofing Prevention)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Authenticated Identity Enforcement (Anti-Spoofing) ---');
    const spoofAttemptPayload = {
      title: 'Water pipe leakage on Canal Road',
      description: 'Continuous drinking water leakage on main road',
      category: 'WATER_SUPPLY',
      location: { latitude: 32.731, longitude: 74.841 },
      address: 'Canal Road, Ward 12',
      wardId: 12,
      // Attempting to spoof identity:
      citizenId: '60c72b2f9b1d8b2bad000001',
      reporterPhone: '9999999999',
    };

    const spoofRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify(spoofAttemptPayload),
    });
    assert(spoofRes.status === 201, 'Complaint submitted successfully');
    const spoofData = await spoofRes.json();
    assert(
      spoofData.complaint.reporterPhone === '9876543210',
      'CRITICAL: reporterPhone is strictly derived from JWT session (9876543210), spoofed 9999999999 ignored'
    );
    const spoofDbDoc = await GrievanceModel.findOne({ trackingNumber: spoofData.complaint.trackingNumber });
    assert(
      spoofDbDoc.citizenId.toString() === citizen._id.toString(),
      'CRITICAL: citizenId in MongoDB is strictly derived from JWT sub, spoofed citizenId ignored'
    );

    // -------------------------------------------------------------------------
    // Test 9: Optional Citizen Display Name Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- Step 10: Optional Citizen Display Name Persistence ---');
    const customNamePayload = {
      title: 'Broken street lamp post in New Plot',
      description: 'Street light out of order since last week',
      category: 'STREET_LIGHT',
      location: { latitude: 32.742, longitude: 74.861 },
      address: 'New Plot, Ward 12',
      wardId: 12,
      reporterName: 'Sunil Choudhary',
      isAnonymous: false,
    };

    const customNameRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenNoNameToken}`,
      },
      body: JSON.stringify(customNamePayload),
    });
    assert(customNameRes.status === 201, 'Named grievance returns HTTP 201 Created');
    const customNameData = await customNameRes.json();
    assert(
      customNameData.complaint.reporterName === 'Sunil Choudhary',
      'Optional reporterName "Sunil Choudhary" persisted and returned'
    );
    assert(
      customNameData.complaint.timeline[0].actor === 'Sunil Choudhary',
      'Timeline actor records provided reporterName'
    );

    // -------------------------------------------------------------------------
    // Test 10: Anonymous Grievance Privacy Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- Step 11: Anonymous Grievance Privacy Enforcement ---');
    const anonymousPayload = {
      title: 'Garbage dump near residential area',
      description: 'Illegal waste disposal creating unsanitary odor',
      category: 'GARBAGE_ACCUMULATION',
      location: { latitude: 32.721, longitude: 74.855 },
      address: 'Bahu Plaza Market, Ward 12',
      wardId: 12,
      reporterName: 'Should Be Hidden',
      isAnonymous: true,
    };

    const anonRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify(anonymousPayload),
    });
    assert(anonRes.status === 201, 'Anonymous grievance returns HTTP 201 Created');
    const anonData = await anonRes.json();
    assert(anonData.complaint.isAnonymous === true, 'isAnonymous is true');
    assert(anonData.complaint.reporterName === undefined, 'CRITICAL PRIVACY: reporterName is undefined in response');
    assert(anonData.complaint.reporterPhone === undefined, 'CRITICAL PRIVACY: reporterPhone is undefined in response');
    assert(
      anonData.complaint.timeline[0].actor === 'Citizen (Anonymous)',
      'Timeline actor records "Citizen (Anonymous)"'
    );

    // -------------------------------------------------------------------------
    // Test 11: Public Map Response Privacy Check
    // -------------------------------------------------------------------------
    console.log('\n--- Step 12: Public Map Endpoint Privacy Check ---');
    const mapRes = await fetch(`${baseUrl}/api/complaints/map`);
    assert(mapRes.status === 200, 'GET /api/complaints/map returns HTTP 200');
    const mapData = await mapRes.json();
    assert(Array.isArray(mapData.complaints), 'Map complaints returned as array');
    assert(mapData.complaints.length > 0, 'Map contains seeded complaints');

    for (const item of mapData.complaints) {
      assert(item.reporterPhone === undefined, `Map item ${item.trackingNumber} strictly omits reporterPhone`);
      assert(item.reporterName === undefined, `Map item ${item.trackingNumber} strictly omits reporterName`);
      assert(item.citizenId === undefined, `Map item ${item.trackingNumber} strictly omits citizenId`);
      assert(item._id === undefined, `Map item ${item.trackingNumber} strictly omits internal MongoDB _id`);
    }

    // -------------------------------------------------------------------------
    // Test 12: Omitted Reporter Name Remains Undefined
    // -------------------------------------------------------------------------
    console.log('\n--- Step 13: Omitted Reporter Name Verification ---');
    const freshCitizenWithoutName = await UserModel.create({
      phoneNumber: '9419999888',
      role: 'citizen',
      isPhoneVerified: true,
    });
    const freshNoNameToken = generateAuthToken(freshCitizenWithoutName);

    const unnamedPayload = {
      title: 'Pothole on Main Road Jammu',
      description: 'Deep road cavity causing hazard',
      category: 'POTHOLE_ROAD',
      location: { latitude: 32.726, longitude: 74.857 },
      address: 'Main Chowk, Ward 12',
      wardId: 12,
      isAnonymous: false,
    };

    const unnamedRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freshNoNameToken}`,
      },
      body: JSON.stringify(unnamedPayload),
    });
    assert(unnamedRes.status === 201, 'Grievance without reporterName returns HTTP 201 Created');
    const unnamedData = await unnamedRes.json();
    assert(
      unnamedData.complaint.reporterName === undefined,
      'Omitted reporterName remains undefined (no dummy fallback name)'
    );

    // -------------------------------------------------------------------------
    // Test 13: Blob Image URL Sanitization
    // -------------------------------------------------------------------------
    console.log('\n--- Step 14: Blob Image URL Sanitization ---');
    const blobPayload = {
      title: 'Broken curb with local blob URL',
      description: 'Curb broken on side street',
      category: 'POTHOLE_ROAD',
      location: { latitude: 32.727, longitude: 74.858 },
      address: 'Side Street, Ward 12',
      wardId: 12,
      imageUrl: 'blob:http://localhost:3000/12345-67890',
      isAnonymous: false,
    };

    const blobRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenNoNameToken}`,
      },
      body: JSON.stringify(blobPayload),
    });
    assert(blobRes.status === 201, 'Grievance with blob URL accepted without error');
    const blobData = await blobRes.json();
    assert(
      blobData.complaint.imageUrl === undefined,
      'CRITICAL: blob: URL was sanitized and stripped, not persisted as real image'
    );

    // -------------------------------------------------------------------------
    // Test 15: Clean Optional Name Persistence and Profile Sync
    // -------------------------------------------------------------------------
    console.log('\n--- Step 15: Clean Optional Name Persistence and Profile Sync ---');
    const syncUser = await UserModel.create({
      phoneNumber: '9419554433',
      role: 'citizen',
      isPhoneVerified: true,
    });
    const syncToken = generateAuthToken(syncUser);

    const optionalNameRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${syncToken}`,
      },
      body: JSON.stringify({
        title: 'Grievance with newly provided optional name',
        description: 'Citizen provides their real optional name upon submitting',
        category: 'POTHOLE_ROAD',
        location: { latitude: 32.726, longitude: 74.857 },
        address: 'Main Chowk, Ward 12',
        wardId: 12,
        reporterName: 'Anil Jamwal',
        isAnonymous: false,
      }),
    });
    assert(optionalNameRes.status === 201, 'POST complaint with optional name returns HTTP 201');
    const optionalNameData = await optionalNameRes.json();
    assert(
      optionalNameData.complaint.reporterName === 'Anil Jamwal',
      'Optional reporterName "Anil Jamwal" successfully persisted with grievance'
    );

    // Verify user profile in MongoDB was cleanly updated from undefined to the entered name
    const updatedUser = await UserModel.findById(syncUser._id);
    assert(
      updatedUser.fullName === 'Anil Jamwal',
      'Citizen user profile fullName cleanly synced from grievance submission without placeholder identity'
    );


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

runUploadAndIdentityTests().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
