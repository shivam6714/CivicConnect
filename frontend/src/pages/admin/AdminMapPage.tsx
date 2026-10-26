import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Building2,
  Eye,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { grievanceService } from '../../services/grievanceService';
import { Grievance, Coordinates, GrievanceStatus } from '../../types/grievance';
import { JAMMU_MAP_CENTER, JAMMU_WARDS } from '../../data/jammuWards';
import { InteractiveMap } from '../../components/map/InteractiveMap';
import { ComplaintDetailModal } from '../../components/grievance/ComplaintDetailModal';
import { getAccessibleImageUrl } from '../../utils/imageUtils';

export const AdminMapPage: React.FC = () => {
  const [allGrievances, setAllGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [detailModalGrievance, setDetailModalGrievance] = useState<Grievance | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Map viewport center & zoom (Defaults to City Center)
  const [mapCenter, setMapCenter] = useState<Coordinates>(JAMMU_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(13);

  const loadAdminMapData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await grievanceService.getGrievances();
      setAllGrievances(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to grievance server.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAdminMapData();
  }, [loadAdminMapData]);

  // Filter grievances according to filter selections across the entire city
  const displayGrievances = useMemo(() => {
    return allGrievances.filter((g) => {
      // Status filter
      if (statusFilter !== 'ALL' && g.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'ALL' && g.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [allGrievances, statusFilter, priorityFilter]);

  const focusWard = (wardId: number) => {
    const ward = JAMMU_WARDS.find((w) => w.id === wardId);
    if (ward?.centerCoordinates) {
      setMapCenter(ward.centerCoordinates);
      setMapZoom(15);
    }
  };

  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case 'REPORTED':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">Reported</span>;
      case 'AI_TRIAGED':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">AI Triaged</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">In Progress</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-teal-50 text-teal-700 border border-teal-200">Resolved</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Map Control Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-civic-border shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Scope Info */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-navy-50 text-navy-900">
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-navy-900">
                City-Wide Geospatial Grievance Grid
              </span>
              <span className="text-[10px] font-mono bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                {displayGrievances.length} Map Pins
              </span>
              <button
                onClick={() => loadAdminMapData(true)}
                disabled={isLoading || isRefreshing}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-navy-50 text-navy-900 border border-navy-100 hover:bg-navy-100 disabled:opacity-50 transition-colors ml-1"
                title="Refresh map pins from backend"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : 'text-navy-900'}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>
            </div>
            <p className="text-[11px] text-civic-secondary">
              {displayGrievances.length === 0
                ? 'No complaint locations to display. Reported civic issues will pin automatically.'
                : 'Displaying incident coordinates across Jammu municipal limits.'}
            </p>
          </div>
        </div>

        {/* Status & Priority Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1 px-2.5 bg-gray-50 border border-civic-border rounded-lg text-navy-900 text-xs focus:ring-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="AI_TRIAGED">AI Triaged</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Priority selector */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="py-1 px-2.5 bg-gray-50 border border-civic-border rounded-lg text-navy-900 text-xs focus:ring-teal-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* City Admin Ward Zoom Jumps */}
          <div className="hidden lg:flex items-center gap-1 border-l border-gray-200 pl-2">
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Focus:</span>
            <button
              onClick={() => focusWard(67)}
              className="px-2 py-0.5 rounded bg-navy-50 hover:bg-navy-100 text-navy-900 text-[11px] font-medium"
            >
              Ward 67 (Muthi)
            </button>
            <button
              onClick={() => focusWard(38)}
              className="px-2 py-0.5 rounded bg-navy-50 hover:bg-navy-100 text-navy-900 text-[11px] font-medium"
            >
              Ward 38 (Paloura)
            </button>
            <button
              onClick={() => focusWard(20)}
              className="px-2 py-0.5 rounded bg-navy-50 hover:bg-navy-100 text-navy-900 text-[11px] font-medium"
            >
              Ward 20 (Gandhi Ngr)
            </button>
            <button
              onClick={() => {
                setMapCenter(JAMMU_MAP_CENTER);
                setMapZoom(13);
              }}
              className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium"
            >
              City Reset
            </button>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-3 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>
              <strong>Map Error:</strong> Could not retrieve live coordinates ({error})
            </span>
          </div>
          <button
            onClick={() => loadAdminMapData(true)}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Map Box & Lateral Detail Drawer */}
      <div className="flex-1 bg-white rounded-xl border border-civic-border shadow-2xs overflow-hidden relative flex">
        {displayGrievances.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none px-4 w-full max-w-md text-center">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 px-4 py-2.5 rounded-full shadow-md inline-flex items-center gap-2 text-xs font-medium text-navy-900 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>No complaint locations to display</span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-500 hidden sm:inline">Active ward pins will appear when reported</span>
            </div>
          </div>
        )}

        {/* Leaflet Map */}
        <div className="flex-1 w-full h-full relative">
          <InteractiveMap
            height="100%"
            zoom={mapZoom}
            center={mapCenter}
            grievances={displayGrievances}
            onGrievanceClick={(g: Grievance) => setSelectedGrievance(g)}
          />
        </div>

        {/* Selected Grievance Sidebar Drawer */}
        {selectedGrievance && (
          <div className="absolute inset-y-0 right-0 w-full sm:relative sm:w-80 md:w-96 bg-white border-l border-civic-border p-4 flex flex-col justify-between shadow-lg z-20 overflow-y-auto animate-fadeIn">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-mono text-xs font-bold text-navy-900 bg-gray-100 px-2 py-0.5 rounded">
                  {selectedGrievance.trackingNumber}
                </span>
                <button
                  onClick={() => setSelectedGrievance(null)}
                  className="text-gray-400 hover:text-navy-900 text-xs font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {getStatusBadge(selectedGrievance.status)}
                  <span className="text-[10px] font-bold uppercase text-navy-900 bg-navy-50 px-1.5 py-0.5 rounded">
                    {selectedGrievance.priority}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-navy-900 leading-snug">
                  {selectedGrievance.title}
                </h4>
                <p className="text-xs text-civic-secondary mt-1 line-clamp-3">
                  {selectedGrievance.description}
                </p>
              </div>

              {/* Location & Ward info */}
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1.5 text-xs">
                <div className="flex items-start gap-1.5 text-navy-900 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span>{selectedGrievance.address}</span>
                </div>
                <div className="text-[11px] text-civic-secondary flex justify-between pt-1 border-t border-gray-200/60">
                  <span>Assigned:</span>
                  <span className="font-semibold text-navy-900">
                    Ward {selectedGrievance.ward.number} ({selectedGrievance.ward.name.split('&')[0]})
                  </span>
                </div>
              </div>

              {/* Photo preview if present */}
              {(() => {
                const safeImgUrl = getAccessibleImageUrl(selectedGrievance.imageUrl);
                if (!safeImgUrl) return null;
                return (
                  <div className="rounded-lg overflow-hidden border border-gray-200 h-32 bg-gray-100">
                    <img
                      src={safeImgUrl}
                      alt={selectedGrievance.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={() => setDetailModalGrievance(selectedGrievance)}
                className="w-full py-2 px-3 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Full Complaint Dossier</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Complaint Detail Modal */}
      <ComplaintDetailModal
        grievance={detailModalGrievance}
        isOpen={!!detailModalGrievance}
        onClose={() => setDetailModalGrievance(null)}
        onStatusUpdated={(updated) => {
          setDetailModalGrievance(updated);
          setSelectedGrievance(updated);
          setAllGrievances((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
          loadAdminMapData(true);
        }}
      />
    </div>
  );
};
