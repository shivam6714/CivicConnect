import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Grievance } from '../../types/grievance';
import { AlertTriangle, ThumbsUp, PlusCircle, MapPin } from 'lucide-react';
import { CategoryBadge, StatusBadge } from './GrievanceStatusBadge';

interface DuplicateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  nearbyGrievances: Grievance[];
  distanceMeters: number;
  onSupportExisting: (grievanceId: string) => void;
  onProceedWithNew: () => void;
  isSubmitting?: boolean;
}

export const DuplicateAlertModal: React.FC<DuplicateAlertModalProps> = ({
  isOpen,
  onClose,
  nearbyGrievances,
  distanceMeters,
  onSupportExisting,
  onProceedWithNew,
  isSubmitting = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nearby Similar Grievance Detected"
      description="CivicConnect spatial triage identified active complaints within your vicinity in Jammu."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Warning notification banner */}
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Help prevent duplicate administrative queue overload!</span>{' '}
            An active complaint exists approximately <strong>{distanceMeters} meters</strong> away from your selected pin. If this describes the same problem, supporting it boosts municipal priority without delaying resolution.
          </div>
        </div>

        {/* Existing nearby complaints list */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {nearbyGrievances.map((grievance) => (
            <div
              key={grievance.id}
              className="p-3.5 bg-gray-50 hover:bg-white rounded-lg border border-civic-border transition-colors text-left flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-navy-900 bg-white px-2 py-0.5 rounded border border-civic-border">
                    {grievance.trackingNumber}
                  </span>
                  <CategoryBadge category={grievance.category} />
                </div>
                <StatusBadge status={grievance.status} />
              </div>

              <h4 className="text-sm font-semibold text-navy-900 line-clamp-1">
                {grievance.title}
              </h4>
              <p className="text-xs text-civic-secondary line-clamp-2">
                {grievance.description}
              </p>

              <div className="flex items-center justify-between text-xs text-civic-secondary pt-1 border-t border-gray-200/60">
                <span className="flex items-center gap-1 truncate max-w-[220px]">
                  <MapPin className="w-3 h-3 text-teal-600 flex-shrink-0" />
                  {grievance.address}
                </span>
                <span className="font-medium text-navy-800">
                  {grievance.supportCount} supporters
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="accent"
                  leftIcon={<ThumbsUp className="w-3.5 h-3.5" />}
                  onClick={() => onSupportExisting(grievance.id)}
                  isLoading={isSubmitting}
                >
                  This is my issue — Support Existing Report
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Distinct Issue Option */}
        <div className="pt-3 border-t border-civic-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-civic-secondary text-left">
            Is your problem distinct from the one above (e.g. separate pothole or street light)?
          </p>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<PlusCircle className="w-4 h-4 text-navy-700" />}
            onClick={onProceedWithNew}
            isLoading={isSubmitting}
          >
            Submit as New Report
          </Button>
        </div>
      </div>
    </Modal>
  );
};
