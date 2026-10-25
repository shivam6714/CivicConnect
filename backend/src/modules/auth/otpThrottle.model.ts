import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { TooManyRequestsError } from '../../errors/appError.js';
import { config } from '../../config/index.js';

export const MAX_OTP_REQUESTS_PER_WINDOW = 5;
export const THROTTLE_WINDOW_HOURS = 24;
export const THROTTLE_WINDOW_MS = THROTTLE_WINDOW_HOURS * 60 * 60 * 1000;

export interface IOtpThrottleDocument extends Document {
  phoneNumber: string;
  lastRequestedAt: Date;
  requestCount: number;
  windowStartTime: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcquiredThrottleSnapshot {
  phoneNumber: string;
  acquiredAt: Date;
}

const otpThrottleSchema = new Schema<IOtpThrottleDocument>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastRequestedAt: {
      type: Date,
      required: true,
    },
    requestCount: {
      type: Number,
      required: true,
      default: 1,
    },
    windowStartTime: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL cleanup after throttle window expires
    },
  },
  {
    timestamps: true,
  }
);

export const OtpThrottleModel: Model<IOtpThrottleDocument> =
  (mongoose.models.OtpThrottle as Model<IOtpThrottleDocument>) ||
  mongoose.model<IOtpThrottleDocument>('OtpThrottle', otpThrottleSchema);

/**
 * Concurrency-aware persistent check-and-acquire for OTP resend cooldown and rate limits.
 * Uses MongoDB atomic operations and unique indexes to protect multi-instance deployments.
 * Returns an AcquiredThrottleSnapshot with the exact timestamp recorded in the database.
 */
export async function checkAndAcquireOtpThrottle(
  phoneNumber: string,
  cooldownSeconds: number = config.otp.resendCooldownSeconds
): Promise<AcquiredThrottleSnapshot> {
  const now = new Date();
  const cooldownPeriodMs = cooldownSeconds * 1000;
  const windowThreshold = new Date(now.getTime() - THROTTLE_WINDOW_MS);

  // Retrieve existing throttle state
  const existing = await OtpThrottleModel.findOne({ phoneNumber });

  if (existing) {
    // 1. Check Resend Cooldown
    const timeSinceLast = now.getTime() - existing.lastRequestedAt.getTime();
    if (timeSinceLast < cooldownPeriodMs) {
      const remainingSeconds = Math.max(1, Math.ceil((cooldownPeriodMs - timeSinceLast) / 1000));
      throw new TooManyRequestsError(
        `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        { retryAfter: remainingSeconds, reason: 'COOLDOWN_ACTIVE' }
      );
    }

    // 2. Check Per-Phone Window Rate Limit
    const isWindowActive = existing.windowStartTime.getTime() > windowThreshold.getTime();
    if (isWindowActive && existing.requestCount >= MAX_OTP_REQUESTS_PER_WINDOW) {
      const resetInSeconds = Math.max(
        1,
        Math.ceil((existing.windowStartTime.getTime() + THROTTLE_WINDOW_MS - now.getTime()) / 1000)
      );
      throw new TooManyRequestsError(
        'Maximum OTP request limit reached for this phone number. Please try again later.',
        { retryAfter: resetInSeconds, reason: 'RATE_LIMIT_EXCEEDED' }
      );
    }

    // 3. Concurrency-safe atomic update
    // Guarded by matching the exact lastRequestedAt that we inspected
    const newRequestCount = isWindowActive ? existing.requestCount + 1 : 1;
    const newWindowStartTime = isWindowActive ? existing.windowStartTime : now;

    const updateResult = await OtpThrottleModel.findOneAndUpdate(
      {
        phoneNumber,
        lastRequestedAt: existing.lastRequestedAt, // Optimistic concurrency check
      },
      {
        $set: {
          lastRequestedAt: now,
          requestCount: newRequestCount,
          windowStartTime: newWindowStartTime,
          expiresAt: new Date(now.getTime() + THROTTLE_WINDOW_MS),
        },
      },
      { returnDocument: 'after' }
    );


    if (!updateResult) {
      // Another concurrent worker updated this record during processing
      throw new TooManyRequestsError(
        'Concurrent OTP request detected. Please wait before retrying.',
        { retryAfter: cooldownSeconds, reason: 'CONCURRENT_REQUEST' }
      );
    }

    return { phoneNumber, acquiredAt: now };
  } else {
    // No record exists yet: attempt atomic insert.
    // The unique index on phoneNumber guarantees that if concurrent requests arrive,
    // only one will succeed, and others will throw E11000.
    try {
      await OtpThrottleModel.create({
        phoneNumber,
        lastRequestedAt: now,
        requestCount: 1,
        windowStartTime: now,
        expiresAt: new Date(now.getTime() + THROTTLE_WINDOW_MS),
      });
      return { phoneNumber, acquiredAt: now };
    } catch (err: unknown) {
      const isMongoDuplicate =
        err !== null &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000;

      if (isMongoDuplicate) {
        throw new TooManyRequestsError(
          'Please wait before requesting another OTP.',
          { retryAfter: cooldownSeconds, reason: 'COOLDOWN_ACTIVE' }
        );
      }
      throw err;
    }
  }
}

/**
 * Reverts rate limit throttle counters if downstream operations or delivery fail.
 * Guards against overwriting a newer concurrent request's throttle state by
 * verifying the acquired timestamp.
 */
export async function rollbackOtpThrottle(
  phoneNumber: string,
  acquiredAt?: Date
): Promise<void> {
  try {
    const filter: Record<string, unknown> = { phoneNumber };
    if (acquiredAt) {
      filter.lastRequestedAt = acquiredAt;
    }

    const existing = await OtpThrottleModel.findOne(filter);
    if (!existing) {
      // Either record was already removed or a newer concurrent request has updated lastRequestedAt.
      // Do not overwrite newer state.
      return;
    }

    if (existing.requestCount <= 1) {
      await OtpThrottleModel.deleteOne(filter);
    } else {
      await OtpThrottleModel.updateOne(
        filter,
        {
          $inc: { requestCount: -1 },
          $set: { lastRequestedAt: new Date(0) }, // Reset cooldown so immediate retry is possible
        }
      );
    }
  } catch (err) {
    console.error('[OtpThrottle] Failed to rollback throttle state:', err instanceof Error ? err.message : err);
  }
}
