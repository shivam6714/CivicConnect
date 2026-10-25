import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { config } from '../../config/index.js';
import type { OtpDeliveryStatus } from './auth.types.js';

export { OtpDeliveryStatus };

export interface IOtpDocument extends Document {
  phoneNumber: string;
  hashedOtp: string;
  status: OtpDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtpDocument>(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    hashedOtp: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING_DELIVERY', 'ACTIVE', 'USED', 'FAILED'],
      required: true,
      default: 'PENDING_DELIVERY',
      index: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      required: true,
      default: () => config.otp.maxAttempts,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index for background MongoDB purge
    },
    isUsed: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for active OTP lookups and lifecycle sorting
otpSchema.index({ phoneNumber: 1, status: 1 });
otpSchema.index({ phoneNumber: 1, createdAt: -1 });

export const OtpModel: Model<IOtpDocument> =
  (mongoose.models.Otp as Model<IOtpDocument>) ||
  mongoose.model<IOtpDocument>('Otp', otpSchema);

let areAuthIndexesReadyFlag = false;

/**
 * Explicitly creates all indexes defined on OtpModel, OtpThrottleModel, and UserModel.
 * Non-destructive: uses createIndexes() to avoid dropping any external or DBA indexes.
 * Throws an Error if index creation fails, allowing startup to fail safely.
 */
export async function initAuthIndexes(): Promise<void> {
  try {
    const { OtpThrottleModel } = await import('./otpThrottle.model.js');
    const { UserModel } = await import('./user.model.js');
    await Promise.all([
      OtpModel.createIndexes(),
      OtpThrottleModel.createIndexes(),
      UserModel.createIndexes(),
    ]);
    areAuthIndexesReadyFlag = true;
    console.log('[Auth] OTP, Throttle, and User MongoDB indexes successfully ensured.');
  } catch (error) {
    areAuthIndexesReadyFlag = false;
    console.error('[Auth] Failed to initialize critical auth MongoDB indexes:', error);

    throw error;
  }
}

export function areAuthIndexesReady(): boolean {
  return areAuthIndexesReadyFlag;
}
