/**
 * CivicConnect Mock Authentication Service
 *
 * PROTOTYPE NOTICE:
 * This service provides local simulated authentication for evaluation and UI testing.
 * Credential verification, session generation, and role checks will later be
 * performed by the FastAPI backend (/api/auth/login, /api/auth/otp, etc.).
 *
 * Passwords and OTPs are verified locally against typed demo accounts in mockUsers.ts
 * and are NEVER stored in browser storage.
 */

import { User } from '../types/user';
import { DEMO_ADMIN_ACCOUNTS, DEMO_CITIZEN_ACCOUNT } from '../data/mockUsers';

const SESSION_STORAGE_KEY = 'civicconnect_auth_session';

export interface OtpRequestResult {
  success: boolean;
  message: string;
  demoOtp: string;
}

export const mockAuthService = {
  /**
   * Validate Admin credentials against registered demo admin accounts
   */
  async adminLogin(adminId: string, password: string): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network latency

    const trimmedId = adminId.trim().toLowerCase();
    const matchedAccount = DEMO_ADMIN_ACCOUNTS.find(
      (acc) => acc.adminId.toLowerCase() === trimmedId
    );

    if (!matchedAccount) {
      throw new Error('Admin ID not recognized. Please check the demo credentials below.');
    }

    if (matchedAccount.password !== password) {
      throw new Error('Invalid password. Please check the demo password listed below.');
    }

    // Persist authenticated user profile (never password) in session storage
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(matchedAccount.user));
    return matchedAccount.user;
  },

  /**
   * Simulate sending a 6-digit OTP to a citizen's mobile number
   */
  async requestCitizenOtp(phone: string): Promise<OtpRequestResult> {
    await new Promise((resolve) => setTimeout(resolve, 400)); // Simulate SMS gateway delay

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    return {
      success: true,
      message: `Demo OTP sent successfully to +91 ${cleanPhone}`,
      demoOtp: DEMO_CITIZEN_ACCOUNT.demoOtp,
    };
  },

  /**
   * Validate 6-digit OTP and complete Citizen login
   */
  async verifyCitizenOtp(phone: string, otp: string): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 450));

    const cleanPhone = phone.replace(/\D/g, '');
    const cleanOtp = otp.trim();

    if (cleanPhone.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    if (cleanOtp !== DEMO_CITIZEN_ACCOUNT.demoOtp && cleanOtp !== '123456') {
      throw new Error(
        `Invalid OTP. Please enter the prototype mock code: ${DEMO_CITIZEN_ACCOUNT.demoOtp}.`
      );
    }

    const citizenUser: User = cleanPhone === DEMO_CITIZEN_ACCOUNT.phone
      ? DEMO_CITIZEN_ACCOUNT.user
      : {
          id: `usr-citizen-${cleanPhone.slice(-4)}`,
          name: `Citizen (+91 ${cleanPhone})`,
          email: `citizen.${cleanPhone}@jammu.in`,
          phone: `+91 ${cleanPhone}`,
          role: 'CITIZEN',
        };

    // Persist authenticated citizen profile in session storage
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(citizenUser));
    return citizenUser;
  },

  /**
   * Retrieve current active demo user session
   */
  getCurrentUser(): User | null {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // In case of parsing failure, clear corrupt state
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return null;
  },

  /**
   * Set session directly for testing convenience
   */
  setDemoSession(user: User): void {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  },

  /**
   * Log out and destroy session
   */
  async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  },
};
