import mongoose from 'mongoose';

export const ALLOWED_CATEGORIES = [
  'POTHOLE_ROAD',
  'STREET_LIGHT',
  'GARBAGE_ACCUMULATION',
  'DRAINAGE_SEWAGE',
  'WATER_SUPPLY',
  'ENCROACHMENT',
  'OTHER',
];

export const ALLOWED_STATUSES = [
  'REPORTED',
  'AI_TRIAGED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
];

export const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const timelineEventSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => `tl-${Date.now()}-${Math.floor(Math.random() * 1000)}` },
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { type: String, default: 'Citizen' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const resolutionEvidenceSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, default: null },
    notes: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    officerName: { type: String, default: null },
  },
  { _id: false }
);

const duplicateCandidateSchema = new mongoose.Schema(
  {
    complaintId: { type: String, required: true },
    similarityScore: { type: Number, required: true },
    distanceMeters: { type: Number, default: null },
    status: { type: String, default: null },
  },
  { _id: false }
);

const aiTriageMetadataSchema = new mongoose.Schema(
  {
    processedAt: { type: Date, default: null },
    detectedCategory: { type: String, default: null },
    confidence: { type: Number, default: null },
    severityScore: { type: Number, default: null },
    suggestedDepartment: { type: String, default: null },
    duplicateEvidence: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const grievanceSchema = new mongoose.Schema(
  {
    // Tracking & Identification
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // User-provided Content (Preserved, never silently overwritten by ML)
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2500, 'Description cannot exceed 2500 characters'],
    },
    category: {
      type: String,
      enum: ALLOWED_CATEGORIES,
      default: 'OTHER',
    },

    // User-provided Location (Optional)
    location: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
        default: null,
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
        default: null,
      },
    },
    locationPoint: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
    },
    ward: {
      id: { type: Number, default: null },
      number: { type: Number, default: null },
      name: { type: String, default: '' },
      zone: { type: String, default: '' },
    },

    // Reporter Metadata
    reporterName: {
      type: String,
      trim: true,
      default: '',
    },
    reporterPhone: {
      type: String,
      trim: true,
      default: '',
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    imageUrl: {
      type: String,
      default: null,
    },

    // ML Predictions (Explicitly Separated from User Input)
    predictedCategory: {
      type: String,
      default: null,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    modelVersion: {
      type: String,
      default: null,
    },
    potentialDuplicates: {
      type: [duplicateCandidateSchema],
      default: [],
    },
    aiTriageMetadata: {
      type: aiTriageMetadataSchema,
      default: () => ({}),
    },

    // Complaint Lifecycle & Status
    status: {
      type: String,
      enum: ALLOWED_STATUSES,
      default: 'REPORTED',
      index: true,
    },
    priority: {
      type: String,
      enum: ALLOWED_PRIORITIES,
      default: 'MEDIUM',
    },
    supportCount: {
      type: Number,
      default: 1,
    },
    supporters: {
      type: [String],
      default: [],
    },
    slaDeadline: {
      type: Date,
      default: null,
    },
    resolutionEvidence: {
      type: resolutionEvidenceSchema,
      default: null,
    },
    timeline: {
      type: [timelineEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Sparse 2dsphere index so complaints without coordinates can still be indexed cleanly
grievanceSchema.index({ locationPoint: '2dsphere' }, { sparse: true });
grievanceSchema.index({ status: 1, category: 1 });
grievanceSchema.index({ 'ward.id': 1 });

// Normalize JSON output format matching existing frontend contracts
grievanceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();

  // Ensure location matches { latitude, longitude } shape
  if (!obj.location || obj.location.latitude === null) {
    if (obj.locationPoint && Array.isArray(obj.locationPoint.coordinates) && obj.locationPoint.coordinates.length === 2) {
      obj.location = {
        longitude: obj.locationPoint.coordinates[0],
        latitude: obj.locationPoint.coordinates[1],
      };
    } else {
      obj.location = null;
    }
  }

  delete obj._id;
  delete obj.__v;
  delete obj.locationPoint;
  return obj;
};

export const Grievance = mongoose.model('Grievance', grievanceSchema);
