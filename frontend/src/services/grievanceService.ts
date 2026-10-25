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
   * Fetch all grievances with optional filters
   */
  async getGrievances(filters?: FilterOptions): Promise<Grievance[]> {
    if (!USE_MOCK_DATA) {
      try {
        return await apiClient<Grievance[]>('/api/complaints', {
          params: filters as Record<string, string | number | boolean | undefined>,
        });
      } catch (err) {
        console.warn('Backend endpoint unavailable. Falling back to mock data.', err);
      }
    }

    // Local filter emulation
    let results = [...localGrievances];
    if (filters?.status) {
      results = results.filter((g) => g.status === filters.status);
    }
    if (filters?.category) {
      results = results.filter((g) => g.category === filters.category);
    }
    if (filters?.wardId) {
      results = results.filter((g) => g.ward.id === filters.wardId);
    }
    if (filters?.priority) {
      results = results.filter((g) => g.priority === filters.priority);
    }
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      results = results.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.address.toLowerCase().includes(q) ||
          g.trackingNumber.toLowerCase().includes(q)
      );
    }

    return results;
  },

  /**
   * Fetch single grievance by ID
   */
  async getGrievanceById(id: string): Promise<Grievance | null> {
    if (!USE_MOCK_DATA) {
      try {
        return await apiClient<Grievance>(`/api/complaints/${id}`);
      } catch (err) {
        console.warn('Backend unavailable, falling back to mock.', err);
      }
    }

    const found = localGrievances.find((g) => g.id === id);
    return found || null;
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
   * Update status (for municipal officer triage)
   */
  async updateGrievanceStatus(id: string, status: GrievanceStatus, note?: string): Promise<Grievance> {
    if (!USE_MOCK_DATA) {
      try {
        return await apiClient<Grievance>(`/api/complaints/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, note }),
        });
      } catch (err) {
        console.warn('Backend status update failed, updating local state.', err);
      }
    }

    const index = localGrievances.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new Error('Grievance not found');
    }

    const current = localGrievances[index];
    const updated: Grievance = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : current.resolvedAt,
      timeline: [
        ...current.timeline,
        {
          id: `tl-${Date.now()}`,
          status,
          timestamp: new Date().toISOString(),
          actor: 'Municipal Officer',
          note,
        },
      ],
    };

    localGrievances[index] = updated;
    return updated;
  },
};
