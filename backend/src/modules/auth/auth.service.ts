import { OtpModel, areAuthIndexesReady, initAuthIndexes, type IOtpDocument } from './otp.model.js';
import {
  checkAndAcquireOtpThrottle,
  rollbackOtpThrottle,
} from './otpThrottle.model.js';
import {
  generateSecureOtp,
  hashOtp,
  verifyOtpHash,
} from './otp.utils.js';
import { UserModel, formatCitizenUser } from './user.model.js';
import { generateAuthToken } from './jwt.utils.js';
import type { RequestOtpResponse, VerifyOtpInput, VerifyOtpResponse } from './auth.types.js';
import { getOtpProvider, MockOtpProvider } from '../../providers/otp/index.js';
import { config } from '../../config/index.js';
import { isDbConnected } from '../../config/db.js';
import {
  BadRequestError,
  BadGatewayError,
  ServiceUnavailableError,
} from '../../errors/appError.js';
import { normalizeIndianMobile, maskPhoneNumber } from '../../utils/phone.js';

export class AuthService {
  /**
   * Initiates OTP generation, persistence, and dispatch for a mobile number.
   *
   * Architectural Guarantees:
   * 1. Phone Normalization: Canonical E.164 (+91XXXXXXXXXX) enforced prior to database access.
   * 2. Cryptographic Entropy: Node.js crypto.randomInt (never Math.random).
   * 3. Two-Tier Cryptographic Defense: Server-side OTP_SECRET pepper combined with per-record random salt.
   * 4. State Machine Delivery Isolation:
   *    - Record instantiated in PENDING_DELIVERY state.
   *    - Transitioned to ACTIVE strictly after provider acknowledges successful transmission.
   *    - Transitioned to FAILED if dispatch fails; records in PENDING_DELIVERY or FAILED states
   *      are never eligible for verification, preserving a safe state even if physical deletion fails.
   * 5. Resilient Throttle Lifecycle:
   *    - Full post-acquisition sequence wrapped in try/catch.
   *    - Rollback captures acquiredAt timestamp, preventing overwriting newer concurrent requests.
   * 6. Distributed Systems SMS Ambiguity:
   *    If an SMS gateway accepts a dispatch request, transmits the SMS over telecom networks, but the HTTP
   *    connection times out or returns a gateway error, the system cannot distinguish between dropped delivery
   *    and dropped acknowledgement. In CivicConnect, this ambiguous session is marked FAILED and never ACTIVE,
   *    ensuring the session cannot be verified. The citizen can immediately retry via throttle rollback.
   * 7. Zero Information Leakage: Plaintext OTPs are never stored, logged, or returned in HTTP responses.
   */
  async requestOtp(phoneNumberInput: string): Promise<RequestOtpResponse> {
    // 1. Normalize phone number
    const normalizedPhone = normalizeIndianMobile(phoneNumberInput);

    // 2. Ensure database connectivity and index readiness if database mode is enabled
    if (config.enableDb) {
      if (!isDbConnected()) {
        throw new ServiceUnavailableError('Database service is temporarily unavailable');
      }

      // Ensure critical TTL and uniqueness indexes exist
      if (!areAuthIndexesReady()) {
        try {
          await initAuthIndexes();
        } catch {
          throw new ServiceUnavailableError('Database service is not ready (index initialization failed)');
        }
      }
    }

    // 3. Persistent, concurrency-aware cooldown and throttling check
    const { acquiredAt } = await checkAndAcquireOtpThrottle(
      normalizedPhone,
      config.otp.resendCooldownSeconds
    );

    let createdOtpDoc: IOtpDocument | null = null;

    try {
      // 4. Resolve delivery provider and generate OTP (cryptographic random in production)
      const otpProvider = getOtpProvider();
      let plainOtp = generateSecureOtp();
      if (otpProvider instanceof MockOtpProvider && otpProvider.getPredictableOtpForTest()) {
        plainOtp = otpProvider.getPredictableOtpForTest()!;
      }

      // 5. Compute cryptographic peppered, salted hash (never store plaintext OTP)
      const hashedOtp = hashOtp(plainOtp);

      // 6. Invalidate any existing active or pending unconsumed OTPs for this number
      await OtpModel.updateMany(
        {
          phoneNumber: normalizedPhone,
          status: { $in: ['PENDING_DELIVERY', 'ACTIVE'] },
          isUsed: false,
        },
        { $set: { status: 'USED', isUsed: true } }
      );

      // 7. Calculate expiration time
      const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

      // 8. Persist new OTP record in PENDING_DELIVERY state (not yet eligible for verification)
      createdOtpDoc = await OtpModel.create({
        phoneNumber: normalizedPhone,
        hashedOtp,
        status: 'PENDING_DELIVERY',
        attempts: 0,
        maxAttempts: config.otp.maxAttempts,
        expiresAt,
        isUsed: false,
      });

      // 9. Dispatch OTP via the configured provider
      let sendResult;
      try {
        sendResult = await otpProvider.sendOtp({
          recipient: normalizedPhone,
          otp: plainOtp, // Transmitted only via provider interface; never logged or returned
          expiryMinutes: config.otp.expiryMinutes,
        });
      } catch (providerError) {
        throw new BadGatewayError(
          'Failed to send verification code. Please try again.',
          providerError instanceof Error ? providerError.message : undefined
        );
      }

      if (!sendResult || !sendResult.success) {
        throw new BadGatewayError('Failed to send verification code. Please try again.');
      }

      // 10. Activate the OTP record strictly upon successful delivery confirmation
      await OtpModel.updateOne(
        { _id: createdOtpDoc._id, status: 'PENDING_DELIVERY' },
        { $set: { status: 'ACTIVE' } }
      );

      // 11. Return generic success response without exposing OTP or registration status
      return {
        success: true,
        message: 'If the phone number is valid, a verification code has been sent.',
        cooldownSeconds: config.otp.resendCooldownSeconds,
      };
    } catch (error) {
      const masked = maskPhoneNumber(normalizedPhone);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AuthService] Request OTP sequence failed for ${masked}: ${errorMessage}`);

      // Safe Failure Strategy: Invalidate created OTP document so it is never usable
      if (createdOtpDoc) {
        try {
          // A. Mark as FAILED and used immediately so even if deletion fails, it cannot be verified
          await OtpModel.updateOne(
            { _id: createdOtpDoc._id },
            { $set: { status: 'FAILED', isUsed: true } }
          );
          // B. Attempt physical deletion
          await OtpModel.deleteOne({ _id: createdOtpDoc._id });
        } catch (cleanupErr) {
          console.error(
            `[AuthService] Failed to clean up unusable OTP document for ${masked}:`,
            cleanupErr instanceof Error ? cleanupErr.message : cleanupErr
          );
        }
      }

      // Roll back throttle lock so citizen is not penalized by internal or provider failure.
      // Guards against overwriting a newer concurrent request's state via acquiredAt.
      try {
        await rollbackOtpThrottle(normalizedPhone, acquiredAt);
      } catch (rollbackErr) {
        console.error(
          `[AuthService] Failed to rollback throttle lock for ${masked}:`,
          rollbackErr instanceof Error ? rollbackErr.message : rollbackErr
        );
      }

      // Preserve the original error
      throw error;
    }
  }

  /**
   * Verifies an OTP, consumes the session atomically, provisions or updates the Citizen user,
   * and issues a signed JWT token.
   *
   * Security Guarantees:
   * 1. Status Filter: Finds only records with status 'ACTIVE', isUsed false, and unexpired.
   * 2. Atomic Attempt Enforcement: Incorrect attempts are atomically incremented. Exhausted
   *    records are marked FAILED and rejected.
   * 3. Atomic Single-Use Consumption: findOneAndUpdate atomically marks the session as USED,
   *    guaranteeing that race conditions / simultaneous verification requests cannot both succeed.
   * 4. Safe Citizen Account Provisioning: Handles existing vs new citizens without overwriting
   *    pre-existing non-empty profile fields with undefined/empty values.
   * 5. Sanitized Token Response: Signs JWT with config.jwtSecret and returns safe CitizenUser
   *    data without hashes, salts, or internal Mongoose fields.
   */
  async verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResponse> {
    // 1. Normalize phone number to canonical E.164 (+91XXXXXXXXXX)
    const normalizedPhone = normalizeIndianMobile(input.phoneNumber);

    // 2. Ensure database connectivity and index readiness
    if (config.enableDb) {
      if (!isDbConnected()) {
        throw new ServiceUnavailableError('Database service is temporarily unavailable');
      }

      if (!areAuthIndexesReady()) {
        try {
          await initAuthIndexes();
        } catch {
          throw new ServiceUnavailableError('Database service is not ready (index initialization failed)');
        }
      }
    }

    const now = new Date();

    // 3. Locate the latest active, unexpired, unconsumed OTP session
    const activeOtp = await OtpModel.findOne({
      phoneNumber: normalizedPhone,
      status: 'ACTIVE',
      isUsed: false,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    if (!activeOtp) {
      throw new BadRequestError('Invalid or expired verification code. Please request a new OTP.');
    }

    // 4. Verify maximum attempts limit
    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await OtpModel.updateOne(
        { _id: activeOtp._id },
        { $set: { status: 'FAILED', isUsed: true } }
      );
      throw new BadRequestError('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    // 5. Verify the submitted OTP against the peppered HMAC-SHA256 hash
    const isOtpValid = verifyOtpHash(input.otp, activeOtp.hashedOtp, config.otpSecret);

    if (!isOtpValid) {
      // Atomically increment attempts
      const updatedOtp = await OtpModel.findOneAndUpdate(
        {
          _id: activeOtp._id,
          status: 'ACTIVE',
          isUsed: false,
          attempts: { $lt: activeOtp.maxAttempts },
          expiresAt: { $gt: new Date() },
        },
        {
          $inc: { attempts: 1 },
        },
        { returnDocument: 'after' }
      );


      if (!updatedOtp) {
        throw new BadRequestError('Invalid or expired verification code.');
      }

      // Check if attempts are now exhausted
      if (updatedOtp.attempts >= updatedOtp.maxAttempts) {
        await OtpModel.updateOne(
          { _id: activeOtp._id },
          { $set: { status: 'FAILED', isUsed: true } }
        );
        throw new BadRequestError(
          'Maximum verification attempts exceeded. This OTP has been invalidated. Please request a new code.'
        );
      }

      const remainingAttempts = updatedOtp.maxAttempts - updatedOtp.attempts;
      throw new BadRequestError(
        `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
        { remainingAttempts }
      );
    }

    // 6. OTP is valid: Atomically consume the OTP session so it cannot be reused
    const consumedOtp = await OtpModel.findOneAndUpdate(
      {
        _id: activeOtp._id,
        status: 'ACTIVE',
        isUsed: false,
        attempts: { $lt: activeOtp.maxAttempts },
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: 'USED',
          isUsed: true,
        },
        $inc: { attempts: 1 },
      },
      { returnDocument: 'after' }
    );


    if (!consumedOtp) {
      // Race condition protection: another concurrent request already consumed this OTP
      throw new BadRequestError('This verification code has already been used or has expired.');
    }

    // 7. Find or provision the Citizen user account
    let user = await UserModel.findOne({ phoneNumber: normalizedPhone });
    const loginTime = new Date();

    if (!user) {
      // New citizen signup
      try {
        user = await UserModel.create({
          phoneNumber: normalizedPhone,
          fullName: input.fullName?.trim() || undefined,
          wardNumber: input.wardNumber ?? undefined,
          role: 'citizen',
          isPhoneVerified: true,
          lastLoginAt: loginTime,
        });
      } catch (err: unknown) {
        // Handle concurrent initial signup race
        const isDuplicate =
          err !== null &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: number }).code === 11000;

        if (isDuplicate) {
          user = await UserModel.findOne({ phoneNumber: normalizedPhone });
          if (!user) throw err;
          user.isPhoneVerified = true;
          user.lastLoginAt = loginTime;
          if (input.fullName && input.fullName.trim().length > 0) {
            user.fullName = input.fullName.trim();
          }
          if (typeof input.wardNumber === 'number') {
            user.wardNumber = input.wardNumber;
          }
          await user.save();
        } else {
          throw err;
        }
      }
    } else {
      // Existing citizen login:
      // Only update optional profile fields if new non-empty values were provided;
      // never overwrite existing data with missing/empty values.
      const updateFields: Record<string, unknown> = {
        isPhoneVerified: true,
        lastLoginAt: loginTime,
      };

      if (input.fullName && input.fullName.trim().length > 0) {
        updateFields.fullName = input.fullName.trim();
      }
      if (typeof input.wardNumber === 'number') {
        updateFields.wardNumber = input.wardNumber;
      }

      user = await UserModel.findByIdAndUpdate(
        user._id,
        { $set: updateFields },
        { returnDocument: 'after' }
      );


      if (!user) {
        throw new ServiceUnavailableError('Failed to retrieve citizen account.');
      }
    }

    // 8. Generate standard signed JWT token
    const token = generateAuthToken(user);

    // 9. Return safe response containing token and citizen profile
    return {
      success: true,
      message: 'OTP verified successfully.',
      token,
      user: formatCitizenUser(user),
    };
  }
}

export const authService = new AuthService();
