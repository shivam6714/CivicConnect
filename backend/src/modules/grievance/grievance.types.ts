import { z } from 'zod';
import type { BackendJammuWard } from '../../utils/jammuWards.js';

export const GRIEVANCE_CATEGORIES = [
  'POTHOLE_ROAD',
  'STREET_LIGHT',
  'GARBAGE_ACCUMULATION',
  'DRAINAGE_SEWAGE',
  'WATER_SUPPLY',
  'ENCROACHMENT',
  'OTHER',
] as const;

export type GrievanceCategory = (typeof GRIEVANCE_CATEGORIES)[number];

export const GRIEVANCE_STATUSES = [
  'REPORTED',
  'AI_TRIAGED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
  'SUPPORTED_EXISTING',
] as const;

export type GrievanceStatus = (typeof GRIEVANCE_STATUSES)[number];

export const GRIEVANCE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type GrievancePriority = (typeof GRIEVANCE_PRIORITIES)[number];

export const createGrievanceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters long')
    .max(2000, 'Description cannot exceed 2000 characters'),
  category: z.enum([
    'POTHOLE_ROAD',
    'STREET_LIGHT',
    'GARBAGE_ACCUMULATION',
    'DRAINAGE_SEWAGE',
    'WATER_SUPPLY',
    'ENCROACHMENT',
    'OTHER',
  ]),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  address: z
    .string()
    .trim()
    .min(3, 'Address must be at least 3 characters long')
    .max(300, 'Address cannot exceed 300 characters'),
  landmark: z.string().trim().max(200).optional(),
  wardId: z
    .number()
    .int()
    .min(1, 'Ward number must be between 1 and 75')
    .max(75, 'Jammu Municipal Corporation consists of 75 wards'),
  imageUrl: z.string().trim().optional(),
  imageKey: z.string().trim().optional(),
  imageMetadata: z
    .object({
      filename: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
      originalName: z.string().optional(),
    })
    .optional(),
  reporterName: z.string().trim().max(100).optional(),
  isAnonymous: z.boolean().optional().default(false),
});

export type CreateGrievanceInput = z.infer<typeof createGrievanceSchema>;

export const updateGrievanceStatusSchema = z.object({
  status: z.enum(GRIEVANCE_STATUSES, {
    message: `Invalid status. Must be one of: ${GRIEVANCE_STATUSES.join(', ')}`,
  }),
  note: z.string().trim().max(1000, 'Note must not exceed 1000 characters').optional(),
});

export type UpdateGrievanceStatusInput = z.infer<typeof updateGrievanceStatusSchema>;

export interface GrievanceFilterOptions {
  status?: GrievanceStatus;
  category?: GrievanceCategory;
  wardId?: number;
  priority?: GrievancePriority;
  searchQuery?: string;
}

export interface GrievanceTimelineItem {
  id: string;
  status: GrievanceStatus;
  timestamp: string;
  actor: string;
  note?: string;
}

export interface FormattedGrievance {
  id: string;
  trackingNumber: string;
  title: string;
  description: string;
  category: GrievanceCategory;
  status: GrievanceStatus;
  priority: GrievancePriority;
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  landmark?: string;
  ward: BackendJammuWard;
  imageUrl?: string;
  imageKey?: string;
  imageMetadata?: {
    filename?: string;
    size?: number;
    mimeType?: string;
    originalName?: string;
  };
  reporterName?: string;
  reporterPhone?: string;
  isAnonymous: boolean;
  supportCount: number;
  isSupportedByCurrentUser: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaDeadline?: string;
  timeline: GrievanceTimelineItem[];
}

/**
 * Stripped public representation for the Jammu grievance map.
 * Strictly omits reporterPhone, reporterName, citizenId, confidential notes, and internal metadata.
 */
export interface PublicMapGrievance {
  id: string;
  trackingNumber: string;
  title: string;
  category: GrievanceCategory;
  status: GrievanceStatus;
  priority: GrievancePriority;
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  ward: BackendJammuWard;
  supportCount: number;
  createdAt: string;
}
