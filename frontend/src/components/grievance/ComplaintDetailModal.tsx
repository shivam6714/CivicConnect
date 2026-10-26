import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Camera,
  Layers,
  Tag,
  AlertCircle,
  ImageOff,
} from 'lucide-react';
import { Grievance, GrievanceStatus } from '../../types/grievance';
import { useAuth } from '../../context/AuthContext';
import { grievanceService } from '../../services/grievanceService';
import { getAccessibleImageUrl } from '../../utils/imageUtils';

interface ComplaintDetailModalProps {
  grievance: Grievance | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updated: Grievance) => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  grievance,
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'CITY_ADMIN' || user?.role === 'MUNICIPAL_OFFICER';

  const [selectedStatus, setSelectedStatus] = useState<GrievanceStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [grievance?.id]);

  if (!isOpen || !grievance) return null;

  const currentGrievance = grievance;
  const accessibleUrl = getAccessibleImageUrl(currentGrievance.imageUrl);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus || selectedStatus === currentGrievance.status) return;

    setIsUpdating(true);
    setUpdateError(null);
    try {
      const updated = await grievanceService.updateGrievanceStatus(
        currentGrievance.id,
        selectedStatus,
        statusNote.trim() || undefined
      );
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      setSelectedStatus('');
      setStatusNote('');
      if (onStatusUpdated) {
        onStatusUpdated(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status on server.';
      setUpdateError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case 'REPORTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Reported</span>;
      case 'AI_TRIAGED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500" /> AI Triaged</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">In Progress</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-teal-600" /> Resolved</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-red-100 text-red-800">Critical Priority</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">High Priority</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">Medium Priority</span>;
      case 'LOW':
        return <span className="px-2.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">Low Priority</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-civic-border max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-civic-border flex items-center justify-between gap-2 bg-gray-50/70">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="font-mono text-xs font-bold text-navy-900 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs">
              {currentGrievance.trackingNumber}
            </span>
            {getStatusBadge(currentGrievance.status)}
            {getPriorityBadge(currentGrievance.priority)}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-civic-secondary hover:text-navy-900 hover:bg-gray-200/60 transition-colors flex-shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Title & Category */}
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-teal-700 mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span>{currentGrievance.category.replace(/_/g, ' ')}</span>
              <span>•</span>
              <span className="text-civic-secondary">Ward {currentGrievance.ward.number}: {currentGrievance.ward.name}</span>
            </div>
            <h2 className="text-xl font-bold text-navy-900 leading-snug">
              {currentGrievance.title}
            </h2>
            <p className="mt-2 text-sm text-civic-primary leading-relaxed bg-gray-50/50 p-3.5 rounded-lg border border-gray-100">
              {currentGrievance.description}
            </p>
          </div>

          {/* Grid Information: Location, Metadata, Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Incident Location Card */}
            <div className="p-4 rounded-xl border border-civic-border bg-white shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-navy-900 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-teal-600" />
                Verified Incident Location
              </div>
              <p className="text-xs text-navy-900 font-medium leading-relaxed">
                {currentGrievance.address}
              </p>
              {currentGrievance.landmark && (
                <p className="text-xs text-civic-secondary">
                  <strong>Landmark:</strong> {currentGrievance.landmark}
                </p>
              )}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                <span>Lat: {currentGrievance.location.latitude.toFixed(5)}</span>
                <span>Lng: {currentGrievance.location.longitude.toFixed(5)}</span>
              </div>
            </div>

            {/* Ward & Submitter Info */}
            <div className="p-4 rounded-xl border border-civic-border bg-white shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-navy-900 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-teal-600" />
                Administrative Ward & Complainant
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-civic-secondary">Assigned Ward:</span>
                  <span className="font-semibold text-navy-900">
                    Ward {currentGrievance.ward.number} ({currentGrievance.ward.zone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-civic-secondary">Complainant:</span>
                  <span className="font-medium text-navy-900">
                    {currentGrievance.isAnonymous ? 'Anonymous' : currentGrievance.reporterName || 'Citizen'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-civic-secondary">Filed Date:</span>
                  <span className="font-medium text-navy-900">
                    {new Date(currentGrievance.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {currentGrievance.slaDeadline && (
                  <div className="flex justify-between">
                    <span className="text-civic-secondary">SLA Target:</span>
                    <span className="font-medium text-amber-700">
                      {new Date(currentGrievance.slaDeadline).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Incident Photograph */}
          <div>
            <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-teal-600" />
              Submitted Incident Photograph
            </h3>
            {accessibleUrl && !imageError ? (
              <div className="rounded-xl overflow-hidden border border-civic-border max-h-64 bg-gray-100 flex items-center justify-center">
                <img
                  src={accessibleUrl}
                  alt={currentGrievance.title || 'Incident photograph'}
                  onError={() => setImageError(true)}
                  className="w-full h-64 object-cover"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-6 flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                  <ImageOff className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-gray-700">Photo Unavailable</p>
                <p className="text-[11px] text-gray-400 max-w-xs leading-relaxed">
                  {currentGrievance.imageUrl && currentGrievance.imageUrl !== 'undefined'
                    ? 'The photographic evidence attached to this report could not be loaded from storage.'
                    : 'No photographic evidence was attached to this grievance.'}
                </p>
              </div>
            )}
          </div>

          {/* RESOLUTION EVIDENCE SECTION */}
          {currentGrievance.status === 'RESOLVED' && currentGrievance.resolutionEvidence && (
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Verified Resolution Evidence
              </div>
              <p className="text-xs text-teal-900 leading-relaxed font-medium">
                {currentGrievance.resolutionEvidence.notes || 'Civic works completed by municipal division.'}
              </p>
              {currentGrievance.resolutionEvidence.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-teal-300 max-h-60 bg-white">
                  <img
                    src={currentGrievance.resolutionEvidence.imageUrl}
                    alt="Resolution evidence photo"
                    className="w-full h-56 object-cover"
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-teal-700 pt-1">
                <span>
                  <strong>Inspecting Officer:</strong> {currentGrievance.resolutionEvidence.officerName || 'JMC Municipal Engineer'}
                </span>
                <span>
                  <strong>Resolved At:</strong>{' '}
                  {currentGrievance.resolutionEvidence.resolvedAt
                    ? new Date(currentGrievance.resolutionEvidence.resolvedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Verified'}
                </span>
              </div>
            </div>
          )}

          {/* STATUS PROGRESSION TIMELINE */}
          <div>
            <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-600" />
              Grievance Lifecycle & Status Progression
            </h3>
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-gray-200">
              {currentGrievance.timeline.map((event, idx) => (
                <div key={event.id || idx} className="relative flex items-start gap-3 pl-1">
                  <div className="w-5 h-5 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center flex-shrink-0 z-10">
                    <div className="w-2 h-2 rounded-full bg-teal-600" />
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex-1 text-xs">
                    <div className="flex items-center justify-between font-semibold text-navy-900">
                      <span>{event.status.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-gray-500 font-normal">
                        {new Date(event.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-civic-secondary mt-0.5">
                      <span className="font-medium text-navy-900">{event.actor}</span>
                      {event.note && `: ${event.note}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ADMIN STATUS UPDATE CONTROL (Visible only to authorized admin roles) */}
          {isAdmin && (
            <div className="p-4 rounded-xl border border-civic-border bg-navy-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Administrative Status Action
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">
                  Provisional UI Control
                </span>
              </div>
              <p className="text-xs text-civic-secondary">
                Updates will be validated against FastAPI backend permission scopes.
              </p>

              {updateSuccess && (
                <div className="p-2.5 rounded-lg bg-teal-50 text-teal-800 text-xs flex items-center gap-2 border border-teal-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Status updated successfully.
                </div>
              )}

              {updateError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-800 text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  {updateError}
                </div>
              )}

              <form onSubmit={handleStatusChange} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-navy-900 uppercase mb-1">
                      New Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as GrievanceStatus)}
                      className="w-full text-xs py-2 px-3 bg-white border border-civic-border rounded-lg text-navy-900 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Select status...</option>
                      <option value="REPORTED">REPORTED</option>
                      <option value="AI_TRIAGED">AI_TRIAGED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-navy-900 uppercase mb-1">
                      Triage Remarks / Dispatch Note
                    </label>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g., Crew dispatched with bitumen roller"
                      className="w-full text-xs py-2 px-3 bg-white border border-civic-border rounded-lg text-navy-900 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!selectedStatus || isUpdating || selectedStatus === currentGrievance.status}
                    className="px-4 py-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    {isUpdating ? 'Saving...' : 'Apply Status Change'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-civic-border bg-gray-50 flex items-center justify-between text-xs text-civic-secondary">
          <span>CivicConnect Central Database</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-gray-300 text-navy-900 hover:bg-gray-100 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
