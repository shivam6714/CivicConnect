export type GrievanceCategory =
  | 'POTHOLE_ROAD'
  | 'STREET_LIGHT'
  | 'GARBAGE_ACCUMULATION'
  | 'DRAINAGE_SEWAGE'
  | 'WATER_SUPPLY'
  | 'ENCROACHMENT'
  | 'OTHER';

export type GrievanceStatus =
  | 'REPORTED'
  | 'AI_TRIAGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'SUPPORTED_EXISTING';

export type GrievancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationSelectionMethod = 'current_location' | 'manual';

export interface SelectedLocationData {
  latitude: number;
  longitude: number;
  address?: string;
  selectionMethod: LocationSelectionMethod;
  accuracyMeters?: number;
  detectedAt?: string;
}

export interface JammuWard {
  id: number;
  number: number;
  name: string;
  zone: 'South Jammu' | 'North Jammu' | 'Old City' | 'Bahu';
  councillor?: string;
  contactNumber?: string;
  centerCoordinates?: Coordinates;
  localityAliases?: string[];
  approxRadiusMeters?: number;
}

export interface GrievanceTimelineEvent {
  id: string;
  status: GrievanceStatus;
  timestamp: string;
  actor: string;
  note?: string;
}

export interface ResolutionEvidence {
  imageUrl?: string;
  notes?: string;
  resolvedAt?: string;
  officerName?: string;
}

export interface Grievance {
  id: string;
  trackingNumber: string;
  title: string;
  description: string;
  category: GrievanceCategory;
  status: GrievanceStatus;
  priority: GrievancePriority;
  location: Coordinates;
  address: string;
  landmark?: string;
  ward: JammuWard;
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
  isSupportedByCurrentUser?: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaDeadline?: string;
  resolutionEvidence?: ResolutionEvidence;
  aiTriageMetadata?: {
    confidence: number;
    detectedCategory: GrievanceCategory;
    severityScore: number;
    potentialDuplicateIds?: string[];
    suggestedDepartment: string;
  };
  timeline: GrievanceTimelineEvent[];
}

export interface DuplicateDetectionResult {
  isPotentialDuplicate: boolean;
  confidence: number;
  nearbyGrievances: Grievance[];
  distanceMeters: number;
}

export interface CreateGrievanceDTO {
  title: string;
  description: string;
  category: GrievanceCategory;
  location: Coordinates;
  selectionMethod?: LocationSelectionMethod;
  address: string;
  landmark?: string;
  wardId: number;
  imageFile?: File;
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
  isAnonymous?: boolean;
}

export interface PublicGrievanceStats {
  total: number;
  reported: number;
  aiTriaged: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  totalSupports: number;
  resolutionRate: string;
}