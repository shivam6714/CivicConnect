import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import {
  GRIEVANCE_CATEGORIES,
  GRIEVANCE_STATUSES,
  GRIEVANCE_PRIORITIES,
  type GrievanceCategory,
  type GrievanceStatus,
  type GrievancePriority,
  type FormattedGrievance,
} from './grievance.types.js';
import { getJammuWard, type BackendJammuWard } from '../../utils/jammuWards.js';

export interface ITimelineEvent {
  id: string;
  status: GrievanceStatus;
  timestamp: Date;
  actor: string;
  note?: string;
}

export interface IGrievanceDocument extends Document {
  citizenId: Types.ObjectId;
  trackingNumber: string;
  title: string;
  description: string;
  category: GrievanceCategory;
  status: GrievanceStatus;
  priority: GrievancePriority;
  location: {
    latitude: number;
    longitude: number;
  };
  geoPoint: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude] for MongoDB 2dsphere indexing
  };
  address: string;
  landmark?: string;
  ward: BackendJammuWard;
  imageUrl?: string;
  reporterName?: string;
  reporterPhone?: string;
  isAnonymous: boolean;
  supportCount: number;
  supportedBy: Types.ObjectId[];
  slaDeadline?: Date;
  resolvedAt?: Date;
  timeline: ITimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const timelineEventSchema = new Schema<ITimelineEvent>(
  {
    id: { type: String, required: true },
    status: { type: String, enum: GRIEVANCE_STATUSES, required: true },
    timestamp: { type: Date, default: Date.now, required: true },
    actor: { type: String, required: true },
    note: { type: String },
  },
  { _id: false }
);

const grievanceSchema = new Schema<IGrievanceDocument>(
  {
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: GRIEVANCE_CATEGORIES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: GRIEVANCE_STATUSES,
      default: 'REPORTED',
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: GRIEVANCE_PRIORITIES,
      default: 'MEDIUM',
      required: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    geoPoint: {
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
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    ward: {
      id: { type: Number, required: true, index: true },
      number: { type: Number, required: true },
      name: { type: String, required: true },
      zone: { type: String, required: true },
    },
    imageUrl: {
      type: String,
    },
    reporterName: {
      type: String,
      trim: true,
    },
    reporterPhone: {
      type: String,
      trim: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    supportCount: {
      type: Number,
      default: 1,
    },
    supportedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    slaDeadline: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    timeline: {
      type: [timelineEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound and geospatial indexes
grievanceSchema.index({ 'geoPoint': '2dsphere' });
grievanceSchema.index({ citizenId: 1, createdAt: -1 });

export const GrievanceModel: Model<IGrievanceDocument> =
  (mongoose.models.Grievance as Model<IGrievanceDocument>) ||
  mongoose.model<IGrievanceDocument>('Grievance', grievanceSchema);

/**
 * Formats a database Grievance document into the clean public representation
 * expected by the frontend Grievance interface.
 */
export function formatGrievance(
  doc: IGrievanceDocument,
  currentUserId?: string
): FormattedGrievance {
  const isSupported = Boolean(
    currentUserId &&
      doc.supportedBy &&
      doc.supportedBy.some((uid) => uid.toString() === currentUserId)
  );

  return {
    id: doc._id.toString(),
    trackingNumber: doc.trackingNumber,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    status: doc.status,
    priority: doc.priority,
    location: {
      latitude: doc.location.latitude,
      longitude: doc.location.longitude,
    },
    address: doc.address,
    landmark: doc.landmark || undefined,
    ward: doc.ward || getJammuWard(1),
    imageUrl: doc.imageUrl || undefined,
    reporterName: doc.isAnonymous ? undefined : doc.reporterName || undefined,
    reporterPhone: doc.isAnonymous ? undefined : doc.reporterPhone || undefined,
    isAnonymous: doc.isAnonymous,
    supportCount: doc.supportCount || 1,
    isSupportedByCurrentUser: isSupported,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    resolvedAt: doc.resolvedAt ? doc.resolvedAt.toISOString() : undefined,
    slaDeadline: doc.slaDeadline ? doc.slaDeadline.toISOString() : undefined,
    timeline: (doc.timeline || []).map((tl) => ({
      id: tl.id,
      status: tl.status,
      timestamp: tl.timestamp.toISOString(),
      actor: tl.actor,
      note: tl.note || undefined,
    })),
  };
}
