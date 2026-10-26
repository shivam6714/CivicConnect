import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { grievanceService } from '../services/grievanceService';
import { Grievance, GrievanceStatus } from '../types/grievance';
import { JAMMU_WARDS } from '../data/jammuWards';
import { GrievanceCard } from '../components/grievance/GrievanceCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Lock,
} from 'lucide-react';

export const TriageDashboardPage: React.FC = () => {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [wardFilter, setWardFilter] = useState<number | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await grievanceService.getGrievances();
      setGrievances(data);
    } catch (err: unknown) {
      console.error('Failed to load grievances', err);
      const isAuthError =
        err instanceof Error &&
        (err.message.includes('401') ||
          err.message.includes('403') ||
          err.message.includes('privileges') ||
          err.message.includes('Authentication') ||
          err.message.includes('session'));
      if (isAuthError) {
        setError('Municipal administrator authorization is required to access the central triage queue.');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to connect to grievance server.');
      }
      setGrievances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: GrievanceStatus) => {
    try {
      await grievanceService.updateGrievanceStatus(id, newStatus, 'Status updated via Triage Console');
      await loadData();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleSupport = async (id: string) => {
    await grievanceService.supportGrievance(id);
    await loadData();
  };

  const filteredGrievances = grievances.filter((g) => {
    if (statusFilter !== 'ALL' && g.status !== statusFilter) return false;
    if (wardFilter !== 'ALL' && g.ward.id !== wardFilter) return false;
    if (categoryFilter !== 'ALL' && g.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.trackingNumber.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const countByStatus = {
    REPORTED: grievances.filter((g) => g.status === 'REPORTED').length,
    AI_TRIAGED: grievances.filter((g) => g.status === 'AI_TRIAGED').length,
    IN_PROGRESS: grievances.filter((g) => g.status === 'IN_PROGRESS').length,
    RESOLVED: grievances.filter((g) => g.status === 'RESOLVED').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Zap className="w-3.5 h-3.5" />
            Jammu Municipal Corporation &bull; Central Control Room
          </div>
          <h1 className="text-2xl font-bold text-navy-900">
            Municipal Grievance Triage Dashboard
          </h1>
          <p className="text-xs text-civic-secondary mt-0.5">
            Real-time pipeline monitoring, AI prioritization, and departmental task routing across all 75 JMC wards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            isLoading={loading}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Admin Auth Notice if unauthenticated */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Link to="/login/admin" state={{ from: { pathname: '/triage' } }}>
            <Button size="sm" variant="accent">
              Sign In as Admin
            </Button>
          </Link>
        </div>
      )}

      {/* Pipeline Status Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
              : 'bg-white text-navy-900 border-civic-border hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-medium opacity-80">All Tickets</div>
          <div className="text-2xl font-bold mt-1">{grievances.length}</div>
        </button>

        <button
          onClick={() => setStatusFilter('REPORTED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'REPORTED'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-navy-900 border-civic-border hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-medium flex items-center gap-1 opacity-90">
            <Clock className="w-3.5 h-3.5" />
            Under Review
          </div>
          <div className="text-2xl font-bold mt-1">{countByStatus.REPORTED}</div>
        </button>

        <button
          onClick={() => setStatusFilter('AI_TRIAGED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'AI_TRIAGED'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white text-navy-900 border-civic-border hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-medium flex items-center gap-1 opacity-90">
            <Sparkles className="w-3.5 h-3.5" />
            AI Triaged
          </div>
          <div className="text-2xl font-bold mt-1">{countByStatus.AI_TRIAGED}</div>
        </button>

        <button
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white text-navy-900 border-civic-border hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-medium flex items-center gap-1 opacity-90">
            <Clock className="w-3.5 h-3.5" />
            In Field Progress
          </div>
          <div className="text-2xl font-bold mt-1">{countByStatus.IN_PROGRESS}</div>
        </button>

        <button
          onClick={() => setStatusFilter('RESOLVED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-navy-900 border-civic-border hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-medium flex items-center gap-1 opacity-90">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved
          </div>
          <div className="text-2xl font-bold mt-1">{countByStatus.RESOLVED}</div>
        </button>
      </div>


      {/* Filter Toolbar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket ID, address, keywords..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-civic-border rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          {/* Ward filter */}
          <div className="w-full md:w-56">
            <select
              value={wardFilter}
              onChange={(e) =>
                setWardFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="w-full px-3 py-1.5 text-xs sm:text-sm border border-civic-border rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
            >
              <option value="ALL">All Jammu Wards</option>
              {JAMMU_WARDS.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward {w.number}: {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="w-full md:w-52">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm border border-civic-border rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
            >
              <option value="ALL">All Categories</option>
              <option value="POTHOLE_ROAD">Roads & Potholes</option>
              <option value="STREET_LIGHT">Street Lighting</option>
              <option value="GARBAGE_ACCUMULATION">Sanitation & Waste</option>
              <option value="DRAINAGE_SEWAGE">Drainage & Sewage</option>
              <option value="WATER_SUPPLY">Drinking Water (PHE)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-civic-secondary pt-1 border-t border-gray-100">
          <span>
            Showing <strong className="text-navy-900">{filteredGrievances.length}</strong> matching grievances
          </span>
          {(search || statusFilter !== 'ALL' || wardFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setWardFilter('ALL');
                setCategoryFilter('ALL');
              }}
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Complaints Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-civic-secondary">
          Loading triage queue...
        </div>
      ) : grievances.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No complaints yet"
          description="The municipal triage queue is currently empty. New citizen submissions will appear here for priority review."
          actionLabel="Submit a Complaint"
          actionTo="/submit"
        />
      ) : filteredGrievances.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Filter className="w-8 h-8 text-gray-300 mx-auto" />
          <h3 className="font-semibold text-navy-900">No matching grievances found</h3>
          <p className="text-xs text-civic-secondary">
            Try adjusting your search query, ward selection, or status filters.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGrievances.map((grievance) => (
            <GrievanceCard
              key={grievance.id}
              grievance={grievance}
              onSupport={handleSupport}
              showAdminActions={true}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};
