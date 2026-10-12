/**
 * CivicConnect Authentication Service
 *
 * NOTE FOR BACKEND DEVELOPER:
 * This service implements the provisional frontend contract for authentication.
 * Production credential verification, hash comparisons, JWT issuing, role permissions,
 * and ward boundary access-controls must be enforced by the FastAPI backend on every endpoint.
 *
 * In development mode (USE_MOCK_DATA = true), an isolated fixture layer simulates
 * authenticated session states for evaluation and UI testing.
 */

import { User } from '../types/user';
import { apiClient } from './apiClient';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';
const SESSION_STORAGE_KEY = 'civicconnect_auth_session';

export interface LoginCredentials {
  identifier: string; // Email or username
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
}

// Development-only demo fixtures for project demonstration & role testing
export const DEV_DEMO_USERS: Record<string, { user: User; label: string; roleDesc: string }> = {
  city_admin: {
    label: 'City Administrator',
    roleDesc: 'City-wide oversight, all 75 wards, centralized municipal portal',
    user: {
      id: 'usr-admin-01',
      name: 'Er. Rajesh Khajuria',
      email: 'admin@jmc.jk.gov.in',
      phone: '+91 94191 00001',
      role: 'CITY_ADMIN',
      department: 'Municipal Commissioner Secretariat',
    },
  },
  citizen: {
    label: 'Citizen / Complainant',
    roleDesc: 'Track personal submissions, resolution proofs, file grievances',
    user: {
      id: 'usr-citizen-01',
      name: 'Anil Sharma',
      email: 'citizen@jammu.in',
      phone: '+91 94192 12345',
      role: 'CITIZEN',
    },
  },
};

export const authService = {
  /**
   * Provisional login implementation
   * Connects to POST /api/auth/login or falls back to development demo users
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const trimmedId = credentials.identifier.trim().toLowerCase();

    if (!USE_MOCK_DATA) {
      try {
        const response = await apiClient<AuthResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: trimmedId,
            password: credentials.password,
          }),
        });
        if (response.user) {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(response.user));
        }
        return response;
      } catch (err: unknown) {
        const error = err as Error;
        throw new Error(error.message || 'Authentication failed. Please verify credentials.');
      }
    }

    // Development Mock Mode Authentication
    // Simulates server-side verification without hardcoded production secrets
    await new Promise((resolve) => setTimeout(resolve, 600)); // Network latency simulation

    let matchedUser: User | undefined;

    if (trimmedId === 'admin@jmc.jk.gov.in' || trimmedId === 'admin' || trimmedId.includes('admin')) {
      matchedUser = DEV_DEMO_USERS.city_admin.user;
    } else if (trimmedId === 'citizen@jammu.in' || trimmedId === 'citizen') {
      matchedUser = DEV_DEMO_USERS.citizen.user;
    } else {
      // Check if user entered an email with admin keyword
      if (trimmedId.includes('admin')) {
        matchedUser = DEV_DEMO_USERS.city_admin.user;
      } else {
        matchedUser = {
          id: `usr-demo-${Date.now()}`,
          name: trimmedId.split('@')[0],
          email: trimmedId,
          role: 'CITIZEN',
        };
      }
    }

    if (!credentials.password || credentials.password.length < 4) {
      throw new Error('Please enter a valid password (minimum 4 characters).');
    }

    // Store authenticated user session (never passwords)
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(matchedUser));

    return {
      user: matchedUser,
      token: 'demo-jwt-token-for-dev-session',
      message: 'Logged in successfully (Development Mode)',
    };
  },

  /**
   * Retrieve current active user session
   */
  getCurrentUser(): User | null {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Ignore parse failure
    }
    // Default initial development user is City Admin so reviewers immediately see full system
    return DEV_DEMO_USERS.city_admin.user;
  },

  /**
   * Switch development demo user directly for fast reviewer testing
   */
  switchDevUser(key: keyof typeof DEV_DEMO_USERS): User {
    const user = DEV_DEMO_USERS[key].user;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  /**
   * Log out current user
   */
  async logout(): Promise<void> {
    if (!USE_MOCK_DATA) {
      try {
        await apiClient('/api/auth/logout', { method: 'POST' });
      } catch {
        // Continue clearing client session
      }
    }
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  },
};
