import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Eye,
  MapPin,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { grievanceService } from '../../services/grievanceService';
import { Grievance, GrievanceStatus, GrievancePriority } from '../../types/grievance';
import { JAMMU_WARDS } from '../../data/jammuWards';
import { ComplaintDetailModal } from '../../components/grievance/ComplaintDetailModal';

export const AdminGrievancesPage: React.FC = () => {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  // Ward filter: 'ALL' or a specific ward id across all 75 municipal wards
  const [selectedWardId, setSelectedWardId] = useState<string>('ALL');

  const loadGrievances = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await grievanceService.getGrievances();
      setGrievances(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to municipal database.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGrievances();
  }, [loadGrievances]);

  // Filter complaints based on user role and filters
  const filteredGrievances = useMemo(() => {
    return grievances.filter((item) => {
      // 1. Ward filter
      if (selectedWardId !== 'ALL') {
        if (item.ward.id !== Number(selectedWardId)) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      // 3. Priority filter
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) {
        return false;
      }

      // 4. Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }

      // 5. Text search query (ref number, title, address, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = item.trackingNumber.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchAddress = item.address.toLowerCase().includes(q);
        const matchWard = item.ward.name.toLowerCase().includes(q);
        if (!matchRef && !matchTitle && !matchAddress && !matchWard) return false;
      }

      return true;
    });
  }, [grievances, selectedWardId, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setSelectedWardId('ALL');
  };

  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case 'REPORTED':
        return <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Reported</span>;
      case 'AI_TRIAGED':
        return <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500" /> AI Triaged</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">In Progress</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-teal-600" /> Resolved</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: GrievancePriority) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-800">Critical</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800">High</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-800">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700">Low</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Scope Header */}
      <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-navy-900">Grievance Central Repository</h2>
            <span className="text-[10px] font-mono bg-navy-50 text-navy-900 px-2 py-0.5 rounded border border-navy-100">
              {filteredGrievances.length} Records
            </span>
            <button
              onClick={() => loadGrievances(true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-navy-50 text-navy-900 border border-navy-100 hover:bg-navy-100 disabled:opacity-50 transition-colors ml-1"
              title="Refresh grievance database from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : 'text-navy-900'}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
          <p className="text-xs text-civic-secondary mt-1">
            City-wide complaint database across all Jammu Municipal Corporation wards.
          </p>
        </div>

        {/* Security / Backend disclaimer */}
        <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200 max-w-sm">
          <strong>Note:</strong> Centralized municipal administrative view with city-wide ward filtering.
        </div>
      </div>

      {/* ERROR ALERT BANNER */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Failed to load real database records: </span>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={() => loadGrievances(true)}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex-shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-xl border border-civic-border shadow-2xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference number (e.g. JMC-2026-0671), title, or location..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50/50 border border-civic-border rounded-lg text-navy-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-navy-900 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 bg-white border border-civic-border rounded-lg text-navy-900 focus:ring-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="AI_TRIAGED">AI Triaged</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[10px] font-bold text-navy-900 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 bg-white border border-civic-border rounded-lg text-navy-900 focus:ring-teal-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-navy-900 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 bg-white border border-civic-border rounded-lg text-navy-900 focus:ring-teal-500"
            >
              <option value="ALL">All Categories</option>
              <option value="POTHOLE_ROAD">Pothole / Road</option>
              <option value="STREET_LIGHT">Streetlight</option>
              <option value="GARBAGE_ACCUMULATION">Garbage Dump</option>
              <option value="DRAINAGE_SEWAGE">Drainage / Sewage</option>
              <option value="WATER_SUPPLY">Water Supply</option>
              <option value="ENCROACHMENT">Encroachment</option>
            </select>
          </div>

          {/* Ward Filter */}
          <div>
            <label className="block text-[10px] font-bold text-navy-900 uppercase tracking-wider mb-1">
              Ward Filter
            </label>
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 bg-white border border-civic-border rounded-lg text-navy-900 focus:ring-teal-500"
            >
              <option value="ALL">All Municipal Wards (75)</option>
              {JAMMU_WARDS.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward {w.number}: {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-navy-900 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* GRIEVANCES DATA TABLE */}
      <div className="bg-white rounded-xl border border-civic-border shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2 text-xs text-civic-secondary">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading grievance records...</span>
          </div>
        ) : grievances.length === 0 ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3 border border-gray-100">
              <Filter className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-navy-900">No complaints found</h3>
            <p className="text-xs sm:text-sm text-civic-secondary mt-1 max-w-sm mx-auto">
              No municipal complaints have been registered yet. Newly submitted tickets will appear here.
            </p>
          </div>
        ) : filteredGrievances.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-navy-900">No grievances match criteria</h3>
            <p className="text-xs text-civic-secondary mt-1 max-w-sm mx-auto">
              Try adjusting your search keywords, clearing status filters, or switching wards.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 px-3 py-1.5 rounded-lg bg-navy-900 text-white text-xs font-semibold min-h-[44px]"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-civic-border text-navy-900 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Tracking ID</th>
                  <th className="py-3.5 px-4">Title & Location</th>
                  <th className="py-3.5 px-4">Ward</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGrievances.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-navy-900 whitespace-nowrap">
                      {g.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="font-semibold text-navy-900 truncate">{g.title}</p>
                      <p className="text-[11px] text-civic-secondary truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span>{g.address}</span>
                      </p>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-navy-900">
                      <span className="font-semibold">Ward {g.ward.number}</span>
                      <span className="text-[11px] text-gray-500 block">{g.ward.name.split('&')[0]}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-civic-secondary">
                      {g.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getPriorityBadge(g.priority)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(g.status)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-500">
                      {new Date(g.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedGrievance(g)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-900 hover:text-white text-navy-900 font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complaint Detail Modal */}
      <ComplaintDetailModal
        grievance={selectedGrievance}
        isOpen={!!selectedGrievance}
        onClose={() => setSelectedGrievance(null)}
        onStatusUpdated={(updated) => {
          setSelectedGrievance(updated);
          setGrievances((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        }}
      />
    </div>
  );
};
