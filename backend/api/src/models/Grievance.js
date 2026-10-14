import mongoose from 'mongoose';

const timelineEventSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => `tl-${Date.now()}-${Math.floor(Math.random() * 1000)}` },
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { type: String, default: 'Citizen' },
    note: { type: String },
  },
  { _id: false }
);

const resolutionEvidenceSchema = new mongoose.Schema(
  {
    imageUrl: { type: String },
    notes: { type: String },
    resolvedAt: { type: Date },
    officerName: { type: String },
  },
  { _id: false }
);

const aiTriageMetadataSchema = new mongoose.Schema(
  {
    confidence: { type: Number, default: 0.85 },
    detectedCategory: { type: String },
    severityScore: { type: Number, default: 5.0 },
    potentialDuplicateIds: { type: [String], default: [] },
    suggestedDepartment: { type: String },
    duplicateEvidence: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const grievanceSchema = new mongoose.Schema(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'POTHOLE_ROAD',
        'STREET_LIGHT',
        'GARBAGE_ACCUMULATION',
        'DRAINAGE_SEWAGE',
        'WATER_SUPPLY',
        'ENCROACHMENT',
        'OTHER',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'REPORTED',
        'AI_TRIAGED',
        'IN_PROGRESS',
        'RESOLVED',
        'REJECTED',
        'SUPPORTED_EXISTING',
      ],
      default: 'REPORTED',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    // MongoDB 2dsphere GeoJSON Point: coordinates format [longitude, latitude]
    locationPoint: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      type: String,
      required: true,
    },
    landmark: {
      type: String,
    },
    ward: {
      id: { type: Number, required: true },
      number: { type: Number, required: true },
      name: { type: String, required: true },
      zone: { type: String, required: true },
    },
    imageUrl: {
      type: String,
    },
    reporterName: {
      type: String,
    },
    reporterPhone: {
      type: String,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
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
    },
    aiTriageMetadata: {
      type: aiTriageMetadataSchema,
      default: () => ({}),
    },
    resolutionEvidence: {
      type: resolutionEvidenceSchema,
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

// Geospatial index for radius and proximity queries
grievanceSchema.index({ locationPoint: '2dsphere' });
grievanceSchema.index({ status: 1, category: 1 });
grievanceSchema.index({ 'ward.id': 1 });

// Transform output for frontend compatibility ({ latitude, longitude }, and string id)
grievanceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  
  if (obj.locationPoint && Array.isArray(obj.locationPoint.coordinates)) {
    obj.location = {
      longitude: obj.locationPoint.coordinates[0],
      latitude: obj.locationPoint.coordinates[1],
    };
  }
  
  delete obj._id;
  delete obj.__v;
  return obj;
};

export const Grievance = mongoose.model('Grievance', grievanceSchema);
