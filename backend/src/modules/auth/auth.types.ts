import { z } from 'zod';
import { isValidIndianMobile, normalizeIndianMobile } from '../../utils/phone.js';

/**
 * Zod schema for initiating citizen mobile signup or login.
 * Validates and normalizes 10-digit Indian mobile numbers.
 */
export const requestOtpSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .trim()
    .refine(isValidIndianMobile, {
      message: 'Please provide a valid 10-digit Indian mobile phone number (starting with 6, 7, 8, or 9)',
    })
    .transform(normalizeIndianMobile),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export interface RequestOtpResponse {
  success: boolean;
  message: string;
  cooldownSeconds: number;
}

/**
 * Zod schema for submitting and verifying an OTP.
 */
export const verifyOtpSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .refine(isValidIndianMobile, {
      message: 'Please provide a valid 10-digit Indian mobile phone number',
    })
    .transform(normalizeIndianMobile),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, {
      message: 'OTP must be exactly 6 digits',
    }),
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must have at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .optional(),
  wardNumber: z
    .number()
    .int()
    .min(1, 'Ward number must be between 1 and 75')
    .max(75, 'Jammu Municipal Corporation consists of 75 wards')
    .optional(),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const adminLoginSchema = z.object({
  adminId: z.string().trim().min(1, 'Admin identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  token: string;
  user: CitizenUser;
}


/**
 * Citizen User representation.
 */
export interface CitizenUser {
  id: string;
  phoneNumber: string;
  fullName?: string;
  wardNumber?: number;
  role: 'citizen' | 'official' | 'admin';
  isPhoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JWT payload structure for authenticated requests.
 */
export interface AuthJwtPayload {
  sub: string; // user ID
  phoneNumber: string;
  role: 'citizen' | 'official' | 'admin';
  iat?: number;
  exp?: number;
}

export type OtpDeliveryStatus = 'PENDING_DELIVERY' | 'ACTIVE' | 'USED' | 'FAILED';

/**
 * Stored OTP verification document structure.
 */
export interface OtpRecord {
  id: string;
  phoneNumber: string;
  hashedOtp: string; // Salted HMAC-SHA256 hash of OTP
  status: OtpDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}