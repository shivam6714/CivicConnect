import React from 'react';
import { Grievance } from '../../types/grievance';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { StatusBadge, PriorityBadge, CategoryBadge } from './GrievanceStatusBadge';
import { ThumbsUp, MapPin, Calendar, Building2, Sparkles } from 'lucide-react';

interface GrievanceCardProps {
  grievance: Grievance;
  onSupport?: (id: string) => void;
  onClick?: (grievance: Grievance) => void;
  showAdminActions?: boolean;
  onStatusChange?: (id: string, newStatus: Grievance['status']) => void;
}

export const GrievanceCard: React.FC<GrievanceCardProps> = ({
  grievance,
  onSupport,
  onClick,
  showAdminActions = false,
  onStatusChange,
}) => {
  const formattedDate = new Date(grievance.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card
      className="p-5 flex flex-col justify-between hover:border-navy-300 transition-all"
      onClick={() => onClick && onClick(grievance)}
    >
      <div>
        {/* Top bar with Tracking ID, Category & Priority */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-navy-900 bg-navy-50 px-2 py-0.5 rounded border border-navy-100">
              {grievance.trackingNumber}
            </span>
            <CategoryBadge category={grievance.category} />
          </div>
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={grievance.priority} />
            <StatusBadge status={grievance.status} />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base text-navy-900 mt-2 line-clamp-1 hover:text-teal-600 transition-colors">
          {grievance.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-civic-secondary mt-1.5 line-clamp-2">
          {grievance.description}
        </p>

        {/* Photo thumbnail if available */}
        {grievance.imageUrl && (
          <div className="mt-3 relative rounded-lg overflow-hidden h-36 bg-gray-100 border border-civic-border">
            <img
              src={grievance.imageUrl}
              alt={grievance.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {grievance.aiTriageMetadata && (
              <div className="absolute bottom-2 left-2 bg-navy-950/80 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-teal-400" />
                AI Confidence {(grievance.aiTriageMetadata.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
        )}

        {/* Location & Ward metadata */}
        <div className="mt-3 pt-3 border-t border-civic-border/70 flex flex-col gap-1.5 text-xs text-civic-secondary">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
            <span className="truncate">{grievance.address}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-civic-secondary">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-navy-400 flex-shrink-0" />
              Ward {grievance.ward.number}: {grievance.ward.name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="mt-4 pt-3 border-t border-civic-border flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSupport) onSupport(grievance.id);
          }}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
            grievance.isSupportedByCurrentUser
              ? 'bg-teal-50 text-teal-700 border-teal-200 font-semibold'
              : 'bg-white text-civic-secondary hover:text-navy-900 border-civic-border hover:bg-gray-50'
          }`}
          title="Support this report so civic authorities see community impact"
        >
          <ThumbsUp
            className={`w-3.5 h-3.5 ${
              grievance.isSupportedByCurrentUser ? 'fill-teal-600 text-teal-600' : ''
            }`}
          />
          <span>{grievance.supportCount} Citizens Supported</span>
        </button>

        {showAdminActions ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {grievance.status !== 'IN_PROGRESS' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange && onStatusChange(grievance.id, 'IN_PROGRESS')}
              >
                Start
              </Button>
            )}
            {grievance.status !== 'RESOLVED' && (
              <Button
                size="sm"
                variant="accent"
                onClick={() => onStatusChange && onStatusChange(grievance.id, 'RESOLVED')}
              >
                Resolve
              </Button>
            )}
          </div>
        ) : (
          <span className="text-xs font-medium text-navy-800 hover:text-teal-600 transition-colors">
            View Details &rarr;
          </span>
        )}
      </div>
    </Card>
  );
};
