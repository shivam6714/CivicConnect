import crypto from 'node:crypto';
import { config } from '../../config/index.js';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * Uses Node.js crypto.randomInt which guarantees cryptographic entropy.
 * Strictly avoids Math.random() for security compliance.
 */
export function generateSecureOtp(): string {
  // Returns integer in [100000, 999999] inclusive
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a cryptographic peppered, salted HMAC-SHA256 hash of the OTP.
 * Output format: `<hex-salt>:<hex-hmac>`
 *
 * Security architecture:
 * - Uses the server-side environment `OTP_SECRET` (pepper) as the HMAC key.
 * - Combines a unique per-record 16-byte random salt with the OTP as payload.
 * - Guarantees that even if the database is compromised, an attacker cannot
 *   brute-force the 6-digit OTP ($10^6$ space) without the server-side secret.
 * - Fails safely if OTP_SECRET is missing.
 */
export function hashOtp(
  otp: string,
  customSalt?: string,
  pepper: string = config.otpSecret
): string {
  if (!pepper || pepper.trim().length === 0) {
    throw new Error('Cryptographic configuration error: OTP_SECRET is missing or empty.');
  }

  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', pepper).update(`${salt}:${otp}`).digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a candidate OTP against a stored salted, peppered hash using constant-time comparison
 * to eliminate timing-attack vulnerabilities.
 */
export function verifyOtpHash(
  candidateOtp: string,
  storedHashedOtp: string,
  pepper: string = config.otpSecret
): boolean {
  if (!pepper || !storedHashedOtp || !storedHashedOtp.includes(':')) {
    return false;
  }

  const [salt, expectedHash] = storedHashedOtp.split(':');
  if (!salt || !expectedHash) {
    return false;
  }

  const candidateHash = crypto.createHmac('sha256', pepper).update(`${salt}:${candidateOtp}`).digest('hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  const candidateBuf = Buffer.from(candidateHash, 'hex');

  if (expectedBuf.length !== candidateBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuf, expectedBuf);
}

/**
 * Explicit application-level check for OTP expiration.
 * Essential because MongoDB TTL index deletion is asynchronous (scheduled ~60s).
 */
export function isOtpExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}
