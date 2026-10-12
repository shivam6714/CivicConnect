export type UserRole =
  | 'CITY_ADMIN'
  | 'CITIZEN'
  | 'MUNICIPAL_OFFICER'
  | 'ADMIN'
  | 'FIELD_ENGINEER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  wardAssigned?: number;
  wardName?: string;
  department?: string;
}
