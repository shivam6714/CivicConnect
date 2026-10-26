import {
  Grievance,
  CreateGrievanceDTO,
  Coordinates,
  GrievanceCategory,
  DuplicateDetectionResult,
  GrievanceStatus,
} from '../types/grievance';
import { FilterOptions } from '../types/common';
import { apiClient } from './apiClient';
import { authService } from './authService';
import { MOCK_GRIEVANCES } from '../data/mockGrievances';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

// Helper: Haversine distance in meters
export function calculateDistanceMeters(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth radius in meters
  const radLat1 = (coord1.latitude * Math.PI) / 180;
  const radLat2 = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// In-memory store for user-submitted complaints during session (seeded with mock data)
let localGrievances: Grievance[] = [...MOCK_GRIEVANCES];

export const grievanceService = {
  /**
   * Fetch all city grievances with optional filters (Admin authorized)
   */
  async getGrievances(filters?: FilterOptions): Promise<Grievance[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.status && filters.status !== 'ALL') params.status = filters.status;
    if (filters?.category && filters.category !== 'ALL') params.category = filters.category;
    if (filters?.wardId && filters.wardId !== undefined) params.wardId = filters.wardId;
    if (filters?.priority && filters.priority !== 'ALL') params.priority = filters.priority;
    if (filters?.searchQuery && filters.searchQuery.trim().length > 0) params.searchQuery = filters.searchQuery.trim();

    const response = await apiClient<
      { success?: boolean; count?: number; complaints?: Grievance[]; data?: Grievance[] } | Grievance[]
    >('/api/complaints', { params });

    if (Array.isArray(response)) {
      return response;
    }
    return response.complaints || response.data || [];
  },

  /**
   * Fetch real public map grievances from backend GET /api/complaints/map
   * Returns geo-anchored complaints with private citizen data omitted.
   */
  async getPublicMapGrievances(): Promise<Grievance[]> {
    const response = await apiClient<{ success?: boolean; count?: number; complaints?: Grievance[]; data?: Grievance[] } | Grievance[]>(
      '/api/complaints/map'
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.complaints || response.data || [];
  },

  /**
   * Fetch single grievance by ID or tracking number
   */
  async getGrievanceById(id: string): Promise<Grievance | null> {
    const response = await apiClient<
      { success: boolean; complaint?: Grievance; data?: Grievance } | Grievance
    >(`/api/complaints/${id}`);

    if ('complaint' in response && response.complaint) {
      return response.complaint;
    }
    if ('data' in response && response.data) {
      return response.data;
    }
    return response as Grievance;
  },

  /**
   * Check for potential duplicates within geospatial radius
   * Implements the core CivicConnect duplicate mitigation logic
   */
  async checkNearbyDuplicates(
    location: Coordinates,
    category: GrievanceCategory,
    radiusMeters = 75
  ): Promise<DuplicateDetectionResult> {
    if (!USE_MOCK_DATA) {
      try {
        return await apiClient<DuplicateDetectionResult>('/api/complaints/check-duplicate', {
          method: 'POST',
          body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude,
            category,
            radius_meters: radiusMeters,
          }),
        });
      } catch (err) {
        console.warn('Backend check-duplicate unavailable, computing locally.', err);
      }
    }

    // Client-side geospatial check
    const nearby = localGrievances
      .map((g) => ({
        grievance: g,
        distance: calculateDistanceMeters(location, g.location),
      }))
      .filter((item) => item.distance <= radiusMeters && item.grievance.status !== 'RESOLVED');

    // Prioritize exact same category matches
    const exactCategoryMatches = nearby.filter((item) => item.grievance.category === category);

    if (exactCategoryMatches.length > 0) {
      const minDistance = Math.min(...exactCategoryMatches.map((m) => m.distance));
      return {
        isPotentialDuplicate: true,
        confidence: minDistance <= 30 ? 0.92 : 0.78,
        distanceMeters: minDistance,
        nearbyGrievances: exactCategoryMatches.map((m) => m.grievance),
      };
    }

    if (nearby.length > 0) {
      // Nearby complaints but different category (e.g. pothole next to broken streetlight)
      const minDistance = Math.min(...nearby.map((m) => m.distance));
      return {
        isPotentialDuplicate: false,
        confidence: 0.35,
        distanceMeters: minDistance,
        nearbyGrievances: nearby.map((m) => m.grievance),
      };
    }

    return {
      isPotentialDuplicate: false,
      confidence: 0.05,
      distanceMeters: 9999,
      nearbyGrievances: [],
    };
  },

  /**
   * Retrieve only the authenticated citizen's grievances from real backend.
   * Enforces server-side citizen isolation.
   */
  async getMyGrievances(): Promise<Grievance[]> {
    const response = await apiClient<{ success: boolean; complaints: Grievance[] }>(
      '/api/complaints/my'
    );
    return response.complaints || [];
  },

  /**
   * Upload photographic evidence via real backend POST /api/upload.
   * Performs client-side MIME validation and file size check (5MB).
   */
  async uploadEvidence(file: File): Promise<{
    url: string;
    key?: string;
    metadata?: {
      filename?: string;
      size?: number;
      mimeType?: string;
      originalName?: string;
    };
  }> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Invalid file format '${file.type || 'unknown'}'. Only JPEG, PNG, and WebP images are supported.`);
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed limit of 5MB.`);
    }

    const formData = new FormData();
    formData.append('image', file);

    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      const errorMsg = data?.error?.message || data?.message || 'Failed to upload photographic evidence.';
      throw new Error(errorMsg);
    }

    return {
      url: data.url || data.file?.url,
      key: data.key || data.file?.key,
      metadata: data.metadata || {
        filename: data.file?.filename,
        size: data.file?.size,
        mimeType: data.file?.mimetype,
        originalName: file.name,
      },
    };
  },

  /**
   * Create a new grievance via real backend POST /api/complaints.
   * Derives ownership strictly from the authenticated JWT session.
   */
  async createGrievance(dto: CreateGrievanceDTO): Promise<Grievance> {
    const payload = {
      title: dto.title.trim(),
      description: dto.description.trim(),
      category: dto.category,
      location: {
        latitude: dto.location.latitude,
        longitude: dto.location.longitude,
      },
      address: dto.address.trim(),
      landmark: dto.landmark?.trim() || undefined,
      wardId: dto.wardId,
      imageUrl: dto.imageUrl || undefined,
      imageKey: dto.imageKey || undefined,
      imageMetadata: dto.imageMetadata || undefined,
      reporterName: dto.reporterName?.trim() || undefined,
      isAnonymous: dto.isAnonymous ?? false,
    };

    const response = await apiClient<{
      success: boolean;
      grievance: Grievance;
      complaint: Grievance;
    }>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const created = response.grievance || response.complaint;
    if (!created) {
      throw new Error('Server did not return the created grievance.');
    }

    // Keep local cache up-to-date for backward-compatible views
    localGrievances = [created, ...localGrievances];
    return created;
  },

  /**
   * Support an existing complaint instead of duplicate submission
   */
  async supportGrievance(id: string): Promise<{ success: boolean; newSupportCount: number }> {
    if (!USE_MOCK_DATA) {
      try {
        return await apiClient<{ success: boolean; newSupportCount: number }>(`/api/complaints/${id}/support`, {
          method: 'POST',
        });
      } catch (err) {
        console.warn('Backend support failed, updating local state.', err);
      }
    }

    const index = localGrievances.findIndex((g) => g.id === id);
    if (index !== -1) {
      const g = localGrievances[index];
      const updatedCount = g.isSupportedByCurrentUser ? g.supportCount - 1 : g.supportCount + 1;
      localGrievances[index] = {
        ...g,
        supportCount: updatedCount,
        isSupportedByCurrentUser: !g.isSupportedByCurrentUser,
      };
      return { success: true, newSupportCount: updatedCount };
    }

    return { success: false, newSupportCount: 0 };
  },

  /**
   * Update status via real backend PATCH /api/complaints/${id}/status
   */
  async updateGrievanceStatus(id: string, status: GrievanceStatus, note?: string): Promise<Grievance> {
    const response = await apiClient<{
      success: boolean;
      complaint?: Grievance;
      grievance?: Grievance;
      data?: Grievance;
    }>(`/api/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });

    const updated = response.complaint || response.grievance || response.data;
    if (!updated) {
      throw new Error('Server did not return updated grievance.');
    }

    return updated;
  },
};
