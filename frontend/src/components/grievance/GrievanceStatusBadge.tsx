import React from 'react';
import { GrievanceStatus, GrievancePriority, GrievanceCategory } from '../../types/grievance';
import { Badge } from '../common/Badge';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  HelpCircle,
  Lightbulb,
  Trash2,
  Waves,
  Zap,
} from 'lucide-react';

interface StatusBadgeProps {
  status: GrievanceStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'REPORTED':
      return (
        <Badge variant="warning" icon={<Clock className="w-3 h-3" />}>
          Reported
        </Badge>
      );
    case 'AI_TRIAGED':
      return (
        <Badge variant="primary" icon={<Zap className="w-3 h-3" />}>
          AI Triaged
        </Badge>
      );
    case 'IN_PROGRESS':
      return (
        <Badge variant="accent" icon={<Clock className="w-3 h-3" />}>
          In Progress
        </Badge>
      );
    case 'RESOLVED':
      return (
        <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
          Resolved
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="danger" icon={<AlertCircle className="w-3 h-3" />}>
          Rejected
        </Badge>
      );
    case 'SUPPORTED_EXISTING':
      return (
        <Badge variant="neutral" icon={<CheckCircle2 className="w-3 h-3" />}>
          Linked to Existing
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
};

interface PriorityBadgeProps {
  priority: GrievancePriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  switch (priority) {
    case 'CRITICAL':
      return (
        <Badge variant="danger" icon={<Flame className="w-3 h-3 text-rose-600" />}>
          Critical
        </Badge>
      );
    case 'HIGH':
      return (
        <Badge variant="warning" icon={<AlertCircle className="w-3 h-3 text-amber-600" />}>
          High
        </Badge>
      );
    case 'MEDIUM':
      return (
        <Badge variant="neutral">
          Medium
        </Badge>
      );
    case 'LOW':
      return (
        <Badge variant="default">
          Low
        </Badge>
      );
  }
};

interface CategoryBadgeProps {
  category: GrievanceCategory;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  switch (category) {
    case 'POTHOLE_ROAD':
      return (
        <Badge variant="neutral" icon={<AlertCircle className="w-3 h-3" />}>
          Roads & Potholes
        </Badge>
      );
    case 'STREET_LIGHT':
      return (
        <Badge variant="primary" icon={<Lightbulb className="w-3 h-3 text-navy-800" />}>
          Street Lighting
        </Badge>
      );
    case 'GARBAGE_ACCUMULATION':
      return (
        <Badge variant="warning" icon={<Trash2 className="w-3 h-3" />}>
          Sanitation & Waste
        </Badge>
      );
    case 'DRAINAGE_SEWAGE':
      return (
        <Badge variant="accent" icon={<Waves className="w-3 h-3 text-teal-600" />}>
          Drainage & Sewage
        </Badge>
      );
    case 'WATER_SUPPLY':
      return (
        <Badge variant="accent" icon={<Waves className="w-3 h-3 text-blue-600" />}>
          Drinking Water (PHE)
        </Badge>
      );
    default:
      return (
        <Badge variant="default" icon={<HelpCircle className="w-3 h-3" />}>
          General Civic
        </Badge>
      );
  }
};
