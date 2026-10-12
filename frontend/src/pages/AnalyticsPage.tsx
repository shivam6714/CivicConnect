import React, { useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { grievanceService } from '../services/grievanceService';
import { Grievance } from '../types/grievance';
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
  CartesianGrid,
} from 'recharts';
import { BarChart3, TrendingUp, CheckCircle, Activity } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  POTHOLE_ROAD: '#14243A',
  STREET_LIGHT: '#0F9D8A',
  GARBAGE_ACCUMULATION: '#D97706',
  DRAINAGE_SEWAGE: '#0284C7',
  WATER_SUPPLY: '#6366F1',
};

const CATEGORY_LABELS: Record<string, string> = {
  POTHOLE_ROAD: 'Roads & Potholes',
  STREET_LIGHT: 'Street Lighting',
  GARBAGE_ACCUMULATION: 'Sanitation & Waste',
  DRAINAGE_SEWAGE: 'Drainage & Sewage',
  WATER_SUPPLY: 'Drinking Water (PHE)',
};

export const AnalyticsPage: React.FC = () => {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await grievanceService.getGrievances();
        setGrievances(data);
      } catch (err) {
        console.error('Failed to load grievances', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute live metrics if data exists
  const totalGrievances = grievances.length;
  const resolvedCount = grievances.filter((g) => g.status === 'RESOLVED').length;
  const inProgressCount = grievances.filter((g) => g.status === 'IN_PROGRESS').length;
  const totalSupports = grievances.reduce((sum, g) => sum + g.supportCount, 0);

  // Ward Distribution data
  const wardMap: Record<string, { complaints: number; resolved: number }> = {};
  grievances.forEach((g) => {
    const key = `Ward ${g.ward.number}`;
    if (!wardMap[key]) {
      wardMap[key] = { complaints: 0, resolved: 0 };
    }
    wardMap[key].complaints += 1;
    if (g.status === 'RESOLVED') {
      wardMap[key].resolved += 1;
    }
  });

  const wardData = Object.entries(wardMap).map(([ward, stats]) => ({
    ward,
    complaints: stats.complaints,
    resolved: stats.resolved,
  }));

  // Category distribution data
  const categoryCountMap: Record<string, number> = {};
  grievances.forEach((g) => {
    categoryCountMap[g.category] = (categoryCountMap[g.category] || 0) + 1;
  });

  const categoryData = Object.entries(categoryCountMap).map(([catKey, count]) => ({
    name: CATEGORY_LABELS[catKey] || catKey,
    value: count,
    color: CATEGORY_COLORS[catKey] || '#64748B',
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
          <BarChart3 className="w-3.5 h-3.5" />
          Municipal Intelligence &bull; Jammu District
        </div>
        <h1 className="text-2xl font-bold text-navy-900">
          Civic Resolution Analytics & SLA Monitor
        </h1>
        <p className="text-xs text-civic-secondary mt-0.5">
          Real-time metrics tracking grievance density, resolution velocity, and duplicate deflection efficiency.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-civic-secondary text-sm">
          Loading analytics data...
        </div>
      ) : totalGrievances === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Statistics will appear when data is available"
          description="No municipal grievance records have been registered yet. Once complaints are submitted across Jammu wards, resolution metrics, ward distributions, and category breakdowns will be visualized here."
          actionLabel="Report a Grievance"
          actionTo="/submit"
        />
      ) : (
        <>
          {/* High-level SLA cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white">
              <span className="text-xs text-civic-secondary font-medium block">
                Total Grievances
              </span>
              <div className="text-2xl font-bold text-navy-900 mt-2">{totalGrievances}</div>
              <div className="flex items-center gap-1 text-[11px] text-teal-600 font-medium mt-1">
                <CheckCircle className="w-3 h-3 text-teal-600" /> Active across wards
              </div>
            </Card>

            <Card className="p-4 bg-white">
              <span className="text-xs text-civic-secondary font-medium block">
                In Field Resolution
              </span>
              <div className="text-2xl font-bold text-navy-900 mt-2">{inProgressCount}</div>
              <div className="flex items-center gap-1 text-[11px] text-teal-600 font-medium mt-1">
                <Activity className="w-3 h-3 text-teal-600" /> Active field units
              </div>
            </Card>

            <Card className="p-4 bg-white">
              <span className="text-xs text-civic-secondary font-medium block">
                Successfully Resolved
              </span>
              <div className="text-2xl font-bold text-navy-900 mt-2">{resolvedCount}</div>
              <div className="flex items-center gap-1 text-[11px] text-teal-600 font-medium mt-1">
                <CheckCircle className="w-3 h-3 text-teal-600" /> Verified completions
              </div>
            </Card>

            <Card className="p-4 bg-white">
              <span className="text-xs text-civic-secondary font-medium block">
                Community Upvotes
              </span>
              <div className="text-2xl font-bold text-navy-900 mt-2">{totalSupports}</div>
              <div className="flex items-center gap-1 text-[11px] text-teal-600 font-medium mt-1">
                <TrendingUp className="w-3 h-3 text-teal-600" /> Duplicates deflected
              </div>
            </Card>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ward Comparison */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-navy-900">
                  Grievance Volume vs. Resolution by Ward
                </h3>
                <span className="text-[11px] text-civic-secondary">Active Wards</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wardData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E7EC" />
                    <XAxis
                      dataKey="ward"
                      tick={{ fontSize: 10, fill: '#667085' }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#667085' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E4E7EC',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="complaints" name="Complaints Reported" fill="#14243A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="#0F9D8A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Category Breakdown */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-navy-900">
                  Departmental Category Breakdown
                </h3>
                <span className="text-[11px] text-civic-secondary">JMC Operational Wings</span>
              </div>
              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E4E7EC',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 text-xs">
                {categoryData.map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-civic-secondary text-[11px]">
                      {cat.name} ({cat.value})
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* AI Duplicate Deflection Impact */}
          <Card className="p-6 bg-gradient-to-r from-navy-900 to-navy-800 text-white space-y-4 border-none">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-teal-400 text-xs font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  Spatial AI Deflection Yield
                </div>
                <h3 className="text-xl font-bold text-white">
                  Real-time Duplicate Prevention
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  By surfacing proximate grievances on the Jammu map before ticket generation, citizens reinforce active complaints rather than inflating the administrative backlog.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 text-center min-w-[140px]">
                <div className="text-3xl font-extrabold text-teal-300">{totalSupports}</div>
                <div className="text-[11px] text-slate-300 mt-0.5">Citizen Upvotes Recorded</div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
