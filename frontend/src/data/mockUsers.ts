/**
 * CivicConnect Mock Users & Demo Credentials
 *
 * NOTE: This is a frontend prototype data store for demonstration and evaluation only.
 * No real user accounts, secrets, or plaintext passwords should ever be stored here.
 * Real authentication will be verified securely by the FastAPI backend.
 */

import { User } from '../types/user';

export interface DemoAdminAccount {
  id: string;
  adminId: string;
  password: string;
  roleName: 'City Admin';
  description: string;
  user: User;
}

export interface DemoCitizenAccount {
  id: string;
  phone: string;
  countryCode: string;
  demoOtp: string;
  user: User;
}

// Demo Centralized City Admin Account (Single demo admin)
export const DEMO_ADMIN_ACCOUNTS: DemoAdminAccount[] = [
  {
    id: 'demo-city-admin-1',
    adminId: 'cityadmin@civicconnect.demo',
    password: 'CityAdmin123!',
    roleName: 'City Admin',
    description: 'Centralized city-wide administration across all 75 Jammu municipal wards.',
    user: {
      id: '6ad48d2f740e000000000001',
      name: 'Er. Rajesh Khajuria',
      email: 'cityadmin@civicconnect.demo',
      phone: '+91 94191 00001',
      role: 'CITY_ADMIN',
      department: 'Central Municipal Commissioner Secretariat',
    },
  },
];

// Demo Citizen Account
export const DEMO_CITIZEN_ACCOUNT: DemoCitizenAccount = {
  id: 'demo-citizen-01',
  phone: '9876543210',
  countryCode: '+91',
  demoOtp: '123456',
  user: {
    id: '6ad48d2f740e000000000002',
    name: 'Anil Sharma',
    email: 'anil.sharma@jammu.in',
    phone: '+91 9876543210',
    role: 'CITIZEN',
  },
};
