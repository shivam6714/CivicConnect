import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/user';
import { authService, RequestOtpResponse } from '../services/authService';

export interface OtpRequestResult extends RequestOtpResponse {}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAdmin: (adminId: string, password: string) => Promise<User>;
  requestCitizenOtp: (phone: string) => Promise<OtpRequestResult>;
  verifyCitizenOtp: (
    phone: string,
    otp: string,
    fullName?: string,
    wardNumber?: number
  ) => Promise<User>;
  logout: () => Promise<void>;
  switchDevRole: (roleKey: 'city_admin' | 'citizen') => Promise<void>;
  switchToCitizen: () => User;
  isCityAdmin: boolean;
  isCitizen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount if a cryptographically valid token and session exist
    try {
      const activeUser = authService.getCurrentUser();
      setUser(activeUser);
    } catch (err) {
      console.warn('Failed to restore user session:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }

    // Listen for session expiration events dispatched by apiClient or logout
    const handleSessionExpired = () => {
      setUser(null);
    };

    window.addEventListener('civic:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('civic:session-expired', handleSessionExpired);
    };
  }, []);

  const loginAdmin = async (adminId: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const authenticatedUser = await authService.adminLogin(adminId, password);
      setUser(authenticatedUser);
      return authenticatedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const requestCitizenOtp = async (phone: string): Promise<OtpRequestResult> => {
    return await authService.requestOtp(phone);
  };

  const verifyCitizenOtp = async (
    phone: string,
    otp: string,
    fullName?: string,
    wardNumber?: number
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const result = await authService.verifyOtp({
        phoneNumber: phone,
        otp,
        fullName,
        wardNumber,
      });
      setUser(result.user);
      return result.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToCitizen = (): User => {
    const citizenUser = authService.switchToCitizenSession();
    setUser(citizenUser);
    return citizenUser;
  };

  /**
   * Safe role-switching handler:
   * Enforces that switching roles updates authentication state safely and persists it consistently.
   * Completely destroys stale admin tokens before transitioning to citizen mode to prevent token leakage.
   */
  const switchDevRole = async (roleKey: 'city_admin' | 'citizen'): Promise<void> => {
    setIsLoading(true);
    try {
      if (roleKey === 'city_admin') {
        const adminUser = await authService.adminLogin('cityadmin@civicconnect.demo', 'CityAdmin123!');
        setUser(adminUser);
      } else {
        switchToCitizen();
      }
    } catch (err) {
      console.warn('switchDevRole failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isCityAdmin = user?.role === 'CITY_ADMIN';
  const isCitizen = user?.role === 'CITIZEN';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginAdmin,
        requestCitizenOtp,
        verifyCitizenOtp,
        logout,
        switchDevRole,
        switchToCitizen,
        isCityAdmin,
        isCitizen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
