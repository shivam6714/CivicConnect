import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ChevronRight,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { grievanceService } from '../../services/grievanceService';
import { Grievance, GrievanceStatus } from '../../types/grievance';
import { ComplaintDetailModal } from '../../components/grievance/ComplaintDetailModal';

// Design tokens
const COLORS = {
  navy: '#14243A',
  teal: '#0F9D8A',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  red: '#EF4444',
  blue: '#3B82F6',
  gray: '#94A3B8',
};

const STATUS_PIE_COLORS = [COLORS.amber, COLORS.blue, COLORS.purple, COLORS.teal];

export const AdminOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const all = await grievanceService.getGrievances();
      setGrievances(all);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to grievance server.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.role]);

  // Derived KPI Metrics
  const totalCount = grievances.length;
  const pendingCount = grievances.filter(
    (g) => g.status === 'REPORTED' || g.status === 'AI_TRIAGED'
  ).length;
  const inProgressCount = grievances.filter((g) => g.status === 'IN_PROGRESS').length;
  const resolvedCount = grievances.filter((g) => g.status === 'RESOLVED').length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  // Chart Data: Status Distribution
  const statusChartData = [
    { name: 'Reported', count: grievances.filter((g) => g.status === 'REPORTED').length },
    { name: 'AI Triaged', count: grievances.filter((g) => g.status === 'AI_TRIAGED').length },
    { name: 'In Progress', count: grievances.filter((g) => g.status === 'IN_PROGRESS').length },
    { name: 'Resolved', count: grievances.filter((g) => g.status === 'RESOLVED').length },
  ];

  // Chart Data: Category Breakdown
  const categoryMap: Record<string, number> = {};
  grievances.forEach((g) => {
    const formatted = g.category.replace(/_/g, ' ');
    categoryMap[formatted] = (categoryMap[formatted] || 0) + 1;
  });
  const categoryChartData = Object.entries(categoryMap).map(([name, count]) => ({
    name,
    count,
  }));

  // Chart Data: Ward Comparison (Across City)
  const wardComparisonMap: Record<string, number> = {};
  grievances.forEach((g) => {
    const wardKey = `Ward ${g.ward.number} (${g.ward.name.split(' ')[0]})`;
    wardComparisonMap[wardKey] = (wardComparisonMap[wardKey] || 0) + 1;
  });
  const wardComparisonData = Object.entries(wardComparisonMap)
    .map(([ward, count]) => ({ ward, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case 'REPORTED':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Reported</span>;
      case 'AI_TRIAGED':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">AI Triaged</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">In Progress</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200">Resolved</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
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
    <div className="space-y-6">
      {/* Scope Banner & Real-time Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-civic-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-navy-900">
                Central Municipality Scope
              </span>
              <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                Centralized DB
              </span>
            </div>
            <p className="text-xs text-civic-secondary mt-0.5">
              Aggregated grievance telemetry across all 75 municipal wards of Jammu
            </p>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-navy-900 hover:bg-gray-50 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : 'text-gray-400'}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>
              <strong>Server Communication Error:</strong> {error}
            </span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Grievances */}
        <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-civic-secondary uppercase tracking-wider">
              Total Grievances
            </span>
            <div className="p-2 rounded-lg bg-navy-50 text-navy-900">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-navy-900">{totalCount}</span>
            <span className="text-xs text-gray-500 font-medium">registered</span>
          </div>
          <p className="text-[11px] text-civic-secondary mt-2">
            Central municipal database records
          </p>
        </div>

        {/* Pending & Triage */}
        <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-civic-secondary uppercase tracking-wider">
              Pending Triage
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-navy-900">{pendingCount}</span>
            <span className="text-xs text-amber-600 font-medium font-mono">needs action</span>
          </div>
          <p className="text-[11px] text-civic-secondary mt-2">
            Awaiting inspection or engineer dispatch
          </p>
        </div>

        {/* In Progress */}
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
            <span className="text-xs text-purple-600 font-medium">on site</span>
          </div>
          <p className="text-[11px] text-civic-secondary mt-2">
            Field engineer & machinery active
          </p>
        </div>

        {/* Resolved */}
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
            <span className="text-xs text-teal-600 font-semibold">{resolutionRate}% rate</span>
          </div>
          <p className="text-[11px] text-civic-secondary mt-2">
            Completed with photo evidence proof
          </p>
        </div>
      </div>

      {/* ANALYTICS CHARTS SECTION */}
      {totalCount === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-civic-border text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-navy-900">
            Statistics will appear when data becomes available
          </h3>
          <p className="text-xs sm:text-sm text-civic-secondary mt-1 max-w-md mx-auto leading-relaxed">
            Analytical charts, category distributions, and resolution trends will populate automatically once complaints are received.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Chart */}
            <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Grievance Status Breakdown</h3>
                  <p className="text-xs text-civic-secondary">Distribution across resolution lifecycle</p>
                </div>
                <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  Live
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_PIE_COLORS[index % STATUS_PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} complaints`, 'Count']}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown Chart */}
            <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Complaints by Category</h3>
                  <p className="text-xs text-civic-secondary">Frequency of civic issues</p>
                </div>
                <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  Volume
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis
                      dataKey="name"
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                    <Tooltip
                      formatter={(val: number) => [`${val} complaints`, 'Frequency']}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* WARD COMPARISON CHART */}
          {wardComparisonData.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-navy-900">Ward-Wise Grievance Comparison</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-navy-100 text-navy-900 px-2 py-0.5 rounded">
                      City-Wide
                    </span>
                  </div>
                  <p className="text-xs text-civic-secondary mt-0.5">
                    Comparative ticket densities across active municipal wards
                  </p>
                </div>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wardComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <XAxis dataKey="ward" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                    <Tooltip
                      formatter={(val: number) => [`${val} complaints`, 'Grievances']}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill={COLORS.navy} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* RECENT GRIEVANCES TABLE */}
      <div className="bg-white rounded-xl border border-civic-border shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-civic-border flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-navy-900">Recent Grievances</h3>
            <p className="text-xs text-civic-secondary">
              Latest municipal complaints received in scope
            </p>
          </div>
          <Link
            to="/admin/grievances"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors min-h-[44px] items-center"
          >
            <span>View All Records</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {grievances.length === 0 ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3 border border-gray-100">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-navy-900">No complaints yet</p>
            <p className="text-xs text-civic-secondary mt-1 max-w-sm">
              Newly submitted municipal grievances will appear here in real-time once reported.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-civic-border text-navy-900 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Complaint Title</th>
                  <th className="py-3 px-4">Ward</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grievances.slice(0, 6).map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">
                      {g.trackingNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-navy-900 max-w-xs truncate">
                      {g.title}
                    </td>
                    <td className="py-3 px-4 text-civic-secondary">
                      Ward {g.ward.number} ({g.ward.name.split(' ')[0]})
                    </td>
                    <td className="py-3 px-4 text-civic-secondary">
                      {g.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">{getPriorityBadge(g.priority)}</td>
                    <td className="py-3 px-4">{getStatusBadge(g.status)}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(g.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedGrievance(g)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-100 hover:bg-navy-900 hover:text-white text-navy-900 font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reusable Complaint Detail Modal */}
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
