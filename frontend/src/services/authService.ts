/**
 * CivicConnect Authentication Service
 *
 * Implements real backend OTP authentication integration:
 * - POST /api/auth/request-otp
 * - POST /api/auth/verify-otp
 *
 * Security & Token Storage Architecture:
 * - JWT verification tokens are securely stored in browser localStorage under 'civic_auth_token'.
 *   This enables the apiClient to automatically attach 'Authorization: Bearer <token>' to subsequent
 *   authenticated API requests across route transitions and page refreshes.
 * - Security Trade-off Documentation: Storing JWT in localStorage is subject to XSS exposure
 *   if unmitigated malicious scripts run in the origin. Because the current backend returns the JWT
 *   in the response body rather than an HttpOnly cookie, localStorage is the required storage mechanism.
 *   Mitigations: Tokens are never logged to console, never displayed in UI templates, and are
 *   cleared immediately on logout.
 * - User session profiles are stored in sessionStorage ('civicconnect_auth_session').
 * - Logout explicitly clears both client-side token and session state.
 */

import { User } from '../types/user';
import { apiClient, TOKEN_STORAGE_KEY } from './apiClient';
import { mockAuthService } from './mockAuthService';

export const SESSION_STORAGE_KEY = 'civicconnect_auth_session';

export const INDIAN_MOBILE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;

export function isValidIndianMobile(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return INDIAN_MOBILE_REGEX.test(cleaned);
}

export function extractTenDigitMobile(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.slice(-10);
}

export interface RequestOtpPayload {
  phoneNumber: string;
}

export interface RequestOtpResponse {
  success: boolean;
  message: string;
  cooldownSeconds: number;
}

export interface VerifyOtpPayload {
  phoneNumber: string;
  otp: string;
  fullName?: string;
  wardNumber?: number;
}

export interface BackendCitizenUser {
  id: string;
  phoneNumber: string;
  fullName?: string;
  wardNumber?: number;
  role: 'citizen' | 'official' | 'admin';
  isPhoneVerified: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  token: string;
  user: BackendCitizenUser;
}

export interface VerifyResult {
  user: User;
  token: string;
  message: string;
}

/**
 * Maps the backend's CitizenUser entity to the frontend User interface.
 */
export function mapBackendCitizenToUser(citizenUser: BackendCitizenUser): User {
  return {
    id: citizenUser.id,
    name: citizenUser.fullName?.trim() || `Citizen (${citizenUser.phoneNumber})`,
    email: `${citizenUser.phoneNumber.replace('+', '')}@citizen.civicconnect.in`,
    phone: citizenUser.phoneNumber,
    phoneNumber: citizenUser.phoneNumber,
    role: 'CITIZEN',
    wardAssigned: citizenUser.wardNumber,
    wardNumber: citizenUser.wardNumber,
    isPhoneVerified: citizenUser.isPhoneVerified,
  };
}

export const authService = {
  /**
   * Request a 6-digit OTP code from backend via POST /api/auth/request-otp
   */
  async requestOtp(phoneNumber: string): Promise<RequestOtpResponse> {
    const tenDigits = extractTenDigitMobile(phoneNumber);
    if (!tenDigits || tenDigits.length !== 10) {
      throw new Error('Please provide a valid 10-digit Indian mobile number.');
    }

    const response = await apiClient<RequestOtpResponse>('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: tenDigits }),
    });

    return {
      success: response.success,
      message: response.message,
      cooldownSeconds: response.cooldownSeconds || 60,
    };
  },

  /**
   * Verify 6-digit OTP code via POST /api/auth/verify-otp
   */
  async verifyOtp(payload: VerifyOtpPayload): Promise<VerifyResult> {
    const tenDigits = extractTenDigitMobile(payload.phoneNumber);
    const cleanOtp = payload.otp.trim();

    if (!tenDigits || tenDigits.length !== 10) {
      throw new Error('Please provide a valid 10-digit Indian mobile number.');
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new Error('Verification code must be exactly 6 digits.');
    }

    const requestBody: Record<string, unknown> = {
      phoneNumber: tenDigits,
      otp: cleanOtp,
    };

    if (payload.fullName && payload.fullName.trim().length >= 2) {
      requestBody.fullName = payload.fullName.trim();
    }

    if (typeof payload.wardNumber === 'number' && payload.wardNumber >= 1 && payload.wardNumber <= 75) {
      requestBody.wardNumber = payload.wardNumber;
    }

    const response = await apiClient<VerifyOtpResponse>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response.token || !response.user) {
      throw new Error('Invalid response format received from verification server.');
    }

    // Persist JWT token in localStorage for apiClient requests
    localStorage.setItem(TOKEN_STORAGE_KEY, response.token);

    // Map and persist active session
    const frontendUser = mapBackendCitizenToUser(response.user);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(frontendUser));

    return {
      user: frontendUser,
      token: response.token,
      message: response.message,
    };
  },

  /**
   * Delegate admin login to mockAuthService or dedicated admin endpoint
   */
  async adminLogin(adminId: string, password: string): Promise<User> {
    const user = await mockAuthService.adminLogin(adminId, password);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  /**
   * Retrieve current authenticated user from storage
   */
  getCurrentUser(): User | null {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as User;

      // If user is a citizen, ensure their authentication token is present
      if (user.role === 'CITIZEN') {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          return null;
        }
      }

      return user;
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  },

  /**
   * Get currently active JWT token
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  /**
   * Sets demo session directly (used for quick role toggle in dev UI)
   */
  setDemoSession(user: User): void {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  },

  /**
   * Clear all client-side authentication states on logout
   */
  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  },
};
