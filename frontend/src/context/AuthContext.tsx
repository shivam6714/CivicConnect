import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/user';
import { authService, RequestOtpResponse } from '../services/authService';
import { DEMO_ADMIN_ACCOUNTS, DEMO_CITIZEN_ACCOUNT } from '../data/mockUsers';

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
  switchDevRole: (roleKey: 'city_admin' | 'citizen') => void;
  isCityAdmin: boolean;
  isCitizen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount if a valid session exists
    try {
      const activeUser = authService.getCurrentUser();
      setUser(activeUser);
    } catch (err) {
      console.warn('Failed to restore user session:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
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

  const switchDevRole = (roleKey: 'city_admin' | 'citizen') => {
    let targetUser: User;
    if (roleKey === 'city_admin') {
      targetUser = DEMO_ADMIN_ACCOUNTS[0].user;
    } else {
      targetUser = DEMO_CITIZEN_ACCOUNT.user;
    }
    authService.setDemoSession(targetUser);
    setUser({ ...targetUser });
  };

  const isCityAdmin = user?.role === 'CITY_ADMIN' || user?.role === 'admin';
  const isCitizen = user?.role === 'CITIZEN' || user?.role === 'citizen';

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
