export type UserRole =
  | 'CITY_ADMIN'
  | 'CITIZEN'
  | 'MUNICIPAL_OFFICER'
  | 'ADMIN'
  | 'FIELD_ENGINEER'
  | 'citizen'
  | 'official'
  | 'admin';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  role: UserRole;
  wardAssigned?: number;
  wardNumber?: number;
  wardName?: string;
  department?: string;
  isPhoneVerified?: boolean;
}