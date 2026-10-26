import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FilePlus,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Search,
  Eye,
  Camera,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { grievanceService } from '../../services/grievanceService';
import { ApiError } from '../../services/apiClient';
import { Grievance, GrievanceStatus } from '../../types/grievance';
import { ComplaintDetailModal } from '../../components/grievance/ComplaintDetailModal';

export const CitizenDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [allGrievances, setAllGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchGrievances = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await grievanceService.getMyGrievances();
      setAllGrievances(data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setErrorMessage('Your session has expired. Please log in again.');
        navigate('/login/citizen', { state: { from: { pathname: '/citizen' } } });
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to retrieve your grievances from the server. Please check your connection.';
      setErrorMessage(msg);
      setAllGrievances([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, []);

  // Filter complaints belonging strictly to this authenticated citizen
  const filteredGrievances = useMemo(() => {
    return allGrievances.filter((g) => {
      if (statusFilter !== 'ALL' && g.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = g.trackingNumber?.toLowerCase().includes(q);
        const matchTitle = g.title?.toLowerCase().includes(q);
        const matchAddress = g.address?.toLowerCase().includes(q);
        if (!matchRef && !matchTitle && !matchAddress) return false;
      }

      return true;
    });
  }, [allGrievances, statusFilter, searchQuery]);

  // Derived counts computed directly from authenticated citizen's persisted records
  const totalMyGrievances = allGrievances.length;
  const pendingCount = allGrievances.filter(
    (g) => g.status === 'REPORTED' || g.status === 'AI_TRIAGED'
  ).length;
  const inProgressCount = allGrievances.filter((g) => g.status === 'IN_PROGRESS').length;
  const resolvedCount = allGrievances.filter((g) => g.status === 'RESOLVED').length;

  const handleLogout = async () => {
    await logout();
    navigate('/login/citizen');
  };

  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case 'REPORTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Under Review</span>;
      case 'AI_TRIAGED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500" /> AI Triaged</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">Crew Dispatched</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-teal-600" /> Work Resolved</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome & Action Banner */}
      <div className="bg-white rounded-2xl border border-civic-border p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Citizen Portal
            </span>
            {user?.phone && (
              <span className="text-[11px] text-navy-900 font-mono font-semibold bg-gray-100 px-2 py-0.5 rounded">
                {user.phone}
              </span>
            )}
            {user?.wardNumber && user.wardNumber >= 1 && user.wardNumber <= 75 ? (
              <span className="text-[11px] text-teal-800 font-semibold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                Ward {user.wardNumber}
              </span>
            ) : null}
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">Jammu Municipal Corporation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-900">
            Welcome to CivicConnect
          </h1>
          <p className="text-xs text-civic-secondary max-w-xl">
            Track your submitted municipal grievances, view official photographic resolution evidence, and report new issues in your ward.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs shadow-subtle transition-all transform hover:-translate-y-0.5"
          >
            <FilePlus className="w-4 h-4" />
            <span>Submit New Grievance</span>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-civic-secondary uppercase tracking-wider">
              My Submissions
            </span>
            <div className="p-2 rounded-lg bg-navy-50 text-navy-900">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-navy-900">{totalMyGrievances}</span>
            <span className="text-xs text-gray-500 font-medium">tickets</span>
          </div>
          <p className="text-[11px] text-civic-secondary mt-1">Total personal civic filings</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-civic-secondary uppercase tracking-wider">
              Under Review
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-navy-900">{pendingCount}</span>
            <span className="text-xs text-amber-600 font-medium">pending</span>
          </div>
          <p className="text-[11px] text-civic-secondary mt-1">Awaiting municipal officer action</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-civic-secondary uppercase tracking-wider">
              In Remediation
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-navy-900">{inProgressCount}</span>
            <span className="text-xs text-purple-600 font-medium">active</span>
          </div>
          <p className="text-[11px] text-civic-secondary mt-1">Field engineers on site</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-civic-secondary uppercase tracking-wider">
              Resolved & Verified
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-navy-900">{resolvedCount}</span>
            <span className="text-xs text-teal-600 font-semibold">completed</span>
          </div>
          <p className="text-[11px] text-civic-secondary mt-1">Verified with photo proofs</p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-civic-border shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference ID or title..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50/50 border border-civic-border rounded-lg text-navy-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-xs py-2 px-3 bg-white border border-civic-border rounded-lg text-navy-900 focus:ring-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="AI_TRIAGED">AI Triaged</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchGrievances}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-semibold transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* MY GRIEVANCES LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">
            My Submitted Grievances ({filteredGrievances.length}
            {filteredGrievances.length !== allGrievances.length && !isLoading
              ? ` of ${allGrievances.length}`
              : ''}
            )
          </h2>
          {allGrievances.length > 0 && (
            <button
              onClick={fetchGrievances}
              disabled={isLoading}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold disabled:opacity-50"
            >
              Refresh
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-civic-border p-12 text-center shadow-2xs flex flex-col items-center justify-center space-y-2 text-xs text-civic-secondary">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading your grievances...</span>
          </div>
        ) : errorMessage && allGrievances.length === 0 ? (
          <div className="bg-white rounded-xl border border-civic-border p-12 text-center shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-navy-900">Unable to load grievances</h3>
            <p className="text-xs text-civic-secondary max-w-sm mx-auto">{errorMessage}</p>
            <button
              onClick={fetchGrievances}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        ) : allGrievances.length === 0 ? (
          <div className="bg-white rounded-xl border border-civic-border p-12 text-center shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
              <FilePlus className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-navy-900">No grievances filed yet</h3>
            <p className="text-xs text-civic-secondary mt-1 max-w-sm mx-auto">
              Spot a civic issue in Jammu? Click below to file a geotagged grievance with photo evidence.
            </p>
            <Link
              to="/submit"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              <span>File Your First Grievance</span>
            </Link>
          </div>
        ) : filteredGrievances.length === 0 ? (
          <div className="bg-white rounded-xl border border-civic-border p-10 text-center shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-2">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-900">No matching grievances found</h3>
            <p className="text-xs text-civic-secondary mt-1">
              Try adjusting your search query or reset the status filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="mt-3 px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs text-navy-900 font-semibold hover:bg-gray-50 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGrievances.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-xl border border-civic-border p-5 shadow-2xs hover:border-teal-300 hover:shadow-subtle transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-navy-900 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                        {g.trackingNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {g.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {getStatusBadge(g.status)}
                  </div>

                  <h3 className="text-sm font-bold text-navy-900 leading-snug">{g.title}</h3>
                  <p className="text-xs text-civic-secondary mt-1 line-clamp-2">{g.description}</p>
                  {g.address && (
                    <p className="text-[11px] text-civic-secondary mt-1 truncate">
                      {g.address}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-civic-secondary gap-2">
                    <span className="flex items-center gap-1 text-navy-900">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      <span>
                        Ward {g.ward?.number}: {g.ward?.name ? g.ward.name.split('&')[0] : `Ward ${g.ward?.number}`}
                      </span>
                    </span>
                    <span>
                      {g.createdAt
                        ? new Date(g.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>

                  {/* Resolution Evidence Notice */}
                  {g.status === 'RESOLVED' && g.resolutionEvidence && (
                    <div className="mt-3 p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Camera className="w-3.5 h-3.5 text-teal-600" />
                        Resolution photo proof attached
                      </span>
                      <span className="text-[10px] font-bold uppercase underline">View</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end">
                  <button
                    onClick={() => setSelectedGrievance(g)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-900 hover:text-white text-navy-900 text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Tracking Dossier</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaint Detail Modal (Read-only for citizens) */}
      <ComplaintDetailModal
        grievance={selectedGrievance}
        isOpen={!!selectedGrievance}
        onClose={() => {
          setSelectedGrievance(null);
          fetchGrievances();
        }}
        onStatusUpdated={() => {
          fetchGrievances();
        }}
      />
    </div>
  );
};
