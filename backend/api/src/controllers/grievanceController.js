import mongoose from 'mongoose';
import { Grievance, ALLOWED_CATEGORIES, ALLOWED_STATUSES, ALLOWED_PRIORITIES } from '../models/Grievance.js';
import { isDatabaseReady } from '../config/db.js';

// In-memory fallback repository when database is not connected
const memoryComplaintsStore = [];

/**
 * Helper to generate standardized JMC tracking numbers
 */
function generateTrackingNumber() {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `JMC-2026-${randomSuffix}`;
}

/**
 * Helper to escape special characters in user search string for regex safety
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate coordinates helper
 */
function validateCoordinates(location) {
  if (!location) return null;

  const { latitude, longitude } = location;

  // Both empty/null -> valid (no location provided)
  const isLatEmpty = latitude === undefined || latitude === null || latitude === '';
  const isLngEmpty = longitude === undefined || longitude === null || longitude === '';

  if (isLatEmpty && isLngEmpty) {
    return null;
  }

  // Provided only one coordinate -> invalid
  if (isLatEmpty || isLngEmpty) {
    return 'Both latitude and longitude must be provided together.';
  }

  const lat = typeof latitude === 'number' ? latitude : Number(latitude);
  const lng = typeof longitude === 'number' ? longitude : Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return 'Coordinates must be valid numbers.';
  }

  if (lat < -90 || lat > 90) {
    return 'Latitude must be between -90 and 90 degrees.';
  }

  if (lng < -180 || lng > 180) {
    return 'Longitude must be between -180 and 180 degrees.';
  }

  return null;
}

/**
 * POST /api/complaints
 * Create and persist a new complaint
 */
export async function createComplaint(req, res, next) {
  try {
    const {
      title,
      description,
      category,
      priority,
      location,
      address,
      landmark,
      ward,
      wardId,
      imageUrl,
      reporterName,
      reporterPhone,
      isAnonymous,
    } = req.body;

    // 1. Validate required fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Complaint title is required and cannot be empty.',
      });
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Title must be between 3 and 200 characters long.',
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Complaint description is required and cannot be empty.',
      });
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 10 || trimmedDesc.length > 2500) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Description must be between 10 and 2500 characters long.',
      });
    }

    // 2. Validate category if provided
    let finalCategory = 'OTHER';
    if (category) {
      const upperCat = String(category).trim().toUpperCase();
      if (!ALLOWED_CATEGORIES.includes(upperCat)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid category "${category}". Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}`,
        });
      }
      finalCategory = upperCat;
    }

    // 3. Validate priority if provided
    let finalPriority = 'MEDIUM';
    if (priority) {
      const upperPri = String(priority).trim().toUpperCase();
      if (!ALLOWED_PRIORITIES.includes(upperPri)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid priority "${priority}". Allowed priorities: ${ALLOWED_PRIORITIES.join(', ')}`,
        });
      }
      finalPriority = upperPri;
    }

    // 4. Validate coordinates (optional field)
    let finalLocation = null;
    let locationPoint = undefined;

    if (location) {
      const coordError = validateCoordinates(location);
      if (coordError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: coordError,
        });
      }

      const isLatEmpty = location.latitude === undefined || location.latitude === null || location.latitude === '';
      const isLngEmpty = location.longitude === undefined || location.longitude === null || location.longitude === '';

      if (!isLatEmpty && !isLngEmpty) {
        finalLocation = {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
        };
        locationPoint = {
          type: 'Point',
          coordinates: [finalLocation.longitude, finalLocation.latitude],
        };
      }
    }

    // 5. Structure ward data
    let finalWard = null;
    if (ward && typeof ward === 'object') {
      finalWard = ward;
    } else if (wardId !== undefined && wardId !== null) {
      const wid = parseInt(wardId, 10);
      if (!Number.isNaN(wid)) {
        finalWard = { id: wid, number: wid, name: `Ward ${wid}`, zone: 'Jammu' };
      }
    }

    const trackingNumber = generateTrackingNumber();
    const timeline = [
      {
        id: `tl-${Date.now()}`,
        status: 'REPORTED',
        timestamp: new Date(),
        actor: isAnonymous ? 'Citizen (Anonymous)' : reporterName?.trim() || 'Citizen',
        note: 'Complaint submitted via CivicConnect portal',
      },
    ];

    const complaintData = {
      trackingNumber,
      title: trimmedTitle,
      description: trimmedDesc,
      category: finalCategory,
      priority: finalPriority,
      status: 'REPORTED',
      location: finalLocation,
      ...(locationPoint ? { locationPoint } : {}),
      address: address?.trim() || '',
      landmark: landmark?.trim() || '',
      ward: finalWard,
      imageUrl: imageUrl || null,
      reporterName: isAnonymous ? '' : reporterName?.trim() || '',
      reporterPhone: isAnonymous ? '' : reporterPhone?.trim() || '',
      isAnonymous: Boolean(isAnonymous),
      supportCount: 1,
      supporters: [],
      slaDeadline: new Date(Date.now() + 72 * 3600 * 1000), // Default 72h SLA
      predictedCategory: null,
      confidence: null,
      modelVersion: null,
      potentialDuplicates: [],
      aiTriageMetadata: {
        processedAt: null,
        detectedCategory: null,
        confidence: null,
        severityScore: null,
        suggestedDepartment: null,
        duplicateEvidence: null,
      },
      timeline,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 6. Persist to MongoDB if connected, else fallback store
    if (isDatabaseReady()) {
      const doc = await Grievance.create(complaintData);
      return res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully.',
        data: doc.toJSON(),
      });
    }

    // In-memory persistence fallback
    const memoryRecord = {
      ...complaintData,
      id: `grv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    memoryComplaintsStore.unshift(memoryRecord);

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully (persisted to test store).',
      data: memoryRecord,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/complaints
 * Retrieve complaints with optional status, category, ward, search, and pagination
 */
export async function getComplaints(req, res, next) {
  try {
    const {
      status,
      category,
      wardId,
      priority,
      searchQuery,
      q,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const searchText = (searchQuery || q || '').trim().toLowerCase();

    // 1. Live MongoDB Query
    if (isDatabaseReady()) {
      const filter = {};

      if (status) {
        filter.status = String(status).toUpperCase();
      }
      if (category) {
        filter.category = String(category).toUpperCase();
      }
      if (priority) {
        filter.priority = String(priority).toUpperCase();
      }
      if (wardId) {
        const wid = parseInt(wardId, 10);
        if (!Number.isNaN(wid)) {
          filter['ward.id'] = wid;
        }
      }
      if (searchText) {
        const escapedSearch = escapeRegex(searchText);
        filter.$or = [
          { title: { $regex: escapedSearch, $options: 'i' } },
          { description: { $regex: escapedSearch, $options: 'i' } },
          { trackingNumber: { $regex: escapedSearch, $options: 'i' } },
          { address: { $regex: escapedSearch, $options: 'i' } },
        ];
      }

      const total = await Grievance.countDocuments(filter);
      const docs = await Grievance.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        count: docs.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        data: docs.map((d) => d.toJSON()),
      });
    }

    // 2. In-memory fallback query
    let filtered = [...memoryComplaintsStore];

    if (status) {
      const s = String(status).toUpperCase();
      filtered = filtered.filter((c) => c.status === s);
    }
    if (category) {
      const c = String(category).toUpperCase();
      filtered = filtered.filter((item) => item.category === c);
    }
    if (priority) {
      const p = String(priority).toUpperCase();
      filtered = filtered.filter((item) => item.priority === p);
    }
    if (wardId) {
      const wid = Number(wardId);
      filtered = filtered.filter((item) => item.ward && item.ward.id === wid);
    }
    if (searchText) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchText) ||
          c.description.toLowerCase().includes(searchText) ||
          c.trackingNumber.toLowerCase().includes(searchText) ||
          (c.address && c.address.toLowerCase().includes(searchText))
      );
    }

    const total = filtered.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      count: paginated.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: paginated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/complaints/:id
 * Retrieve single complaint by ID or tracking number
 */
export async function getComplaintById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Complaint ID is required.',
      });
    }

    const trimmedId = id.trim();

    // 1. Live MongoDB lookup
    if (isDatabaseReady()) {
      let doc = null;

      if (trimmedId.startsWith('JMC-')) {
        doc = await Grievance.findOne({ trackingNumber: trimmedId });
      } else if (mongoose.Types.ObjectId.isValid(trimmedId)) {
        doc = await Grievance.findById(trimmedId);
      } else {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: `Malformed complaint ID: "${trimmedId}". Must be a valid 24-char ObjectId or JMC tracking number.`,
        });
      }

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: `No complaint found with ID or tracking number: "${trimmedId}"`,
        });
      }

      return res.status(200).json({
        success: true,
        data: doc.toJSON(),
      });
    }

    // 2. In-memory lookup
    const found = memoryComplaintsStore.find(
      (c) => c.id === trimmedId || c.trackingNumber === trimmedId
    );

    if (!found) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `No complaint found with ID or tracking number: "${trimmedId}"`,
      });
    }

    return res.status(200).json({
      success: true,
      data: found,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/complaints/:id/status
 * Update complaint status with audit timeline entry
 * CRITICAL: User-provided title, description, category, and location are protected and never mutated here.
 */
export async function updateComplaintStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note, actor, resolutionEvidence } = req.body;

    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Complaint ID is required.',
      });
    }

    const trimmedId = id.trim();

    // 1. Validate status value
    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Status is required. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    const upperStatus = status.trim().toUpperCase();
    if (!ALLOWED_STATUSES.includes(upperStatus)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Invalid status "${status}". Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    if (note && typeof note === 'string' && note.trim().length > 500) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Triage note cannot exceed 500 characters.',
      });
    }

    const timelineEvent = {
      id: `tl-${Date.now()}`,
      status: upperStatus,
      timestamp: new Date(),
      actor: actor?.trim() || 'Municipal Officer',
      note: note?.trim() || `Status updated to ${upperStatus}`,
    };

    // 2. Live MongoDB Update
    if (isDatabaseReady()) {
      const query = trimmedId.startsWith('JMC-')
        ? { trackingNumber: trimmedId }
        : mongoose.Types.ObjectId.isValid(trimmedId)
        ? { _id: trimmedId }
        : null;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: `Malformed complaint ID: "${trimmedId}".`,
        });
      }

      const doc = await Grievance.findOne(query);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: `No complaint found with ID or tracking number: "${trimmedId}"`,
        });
      }

      // Update ONLY status and lifecycle properties (preserve user title, description, category, location)
      doc.status = upperStatus;
      doc.timeline.push(timelineEvent);

      if (upperStatus === 'RESOLVED') {
        const evidence = typeof resolutionEvidence === 'object' && resolutionEvidence !== null ? resolutionEvidence : {};
        doc.resolutionEvidence = {
          imageUrl: evidence.imageUrl || null,
          notes: evidence.notes || note || 'Resolved by municipal team',
          resolvedAt: new Date(),
          officerName: evidence.officerName || actor || 'Municipal Officer',
        };
      }

      await doc.save();

      return res.status(200).json({
        success: true,
        message: `Complaint status updated to ${upperStatus}.`,
        data: doc.toJSON(),
      });
    }

    // 3. In-memory update
    const index = memoryComplaintsStore.findIndex(
      (c) => c.id === trimmedId || c.trackingNumber === trimmedId
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `No complaint found with ID or tracking number: "${trimmedId}"`,
      });
    }

    const current = memoryComplaintsStore[index];
    const updated = {
      ...current,
      status: upperStatus,
      updatedAt: new Date(),
      timeline: [...current.timeline, timelineEvent],
      resolutionEvidence:
        upperStatus === 'RESOLVED'
          ? {
              imageUrl: (typeof resolutionEvidence === 'object' && resolutionEvidence?.imageUrl) || null,
              notes: (typeof resolutionEvidence === 'object' && resolutionEvidence?.notes) || note || 'Resolved by municipal team',
              resolvedAt: new Date(),
              officerName: (typeof resolutionEvidence === 'object' && resolutionEvidence?.officerName) || actor || 'Municipal Officer',
            }
          : current.resolutionEvidence,
    };

    memoryComplaintsStore[index] = updated;

    return res.status(200).json({
      success: true,
      message: `Complaint status updated to ${upperStatus}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
