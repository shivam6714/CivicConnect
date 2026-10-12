import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { grievanceService } from '../services/grievanceService';
import { Grievance } from '../types/grievance';
import { GrievanceCard } from '../components/grievance/GrievanceCard';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import {
  FilePlus,
  Sparkles,
  TrendingUp,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const HomePage: React.FC = () => {
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

  const handleSupport = async (id: string) => {
    await grievanceService.supportGrievance(id);
    const updated = await grievanceService.getGrievances();
    setGrievances(updated);
  };

  const totalComplaints = grievances.length;
  const resolvedCount = grievances.filter((g) => g.status === 'RESOLVED').length;
  const inProgressCount = grievances.filter((g) => g.status === 'IN_PROGRESS').length;
  const totalSupports = grievances.reduce((sum, g) => sum + g.supportCount, 0);
  const resolutionRate = totalComplaints > 0 ? `${Math.round((resolvedCount / totalComplaints) * 100)}%` : '0%';

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section */}
      <section className="bg-navy-900 text-white relative overflow-hidden border-b border-navy-800">
        <div className="absolute inset-0 bg-[radial-gradient(#0F9D8A_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Gen Civic Infrastructure &bull; Jammu, J&K
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Smarter Municipal Resolution for <span className="text-teal-400">Jammu City</span>.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              CivicConnect combines AI geospatial triage and community verification to eliminate duplicate reports, accelerate municipal field response, and restore infrastructure across all 75 wards of Jammu.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link to="/submit">
                <Button
                  size="lg"
                  variant="accent"
                  leftIcon={<FilePlus className="w-5 h-5" />}
                >
                  Report a Problem
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Stats Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 sm:p-5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-civic-secondary">Total Grievances</span>
              <Layers className="w-4 h-4 text-navy-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-navy-900 mt-2">
              {totalComplaints}
            </p>
            <span className="text-[11px] text-teal-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> All 75 JMC Wards Active
            </span>
          </Card>

          <Card className="p-4 sm:p-5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-civic-secondary">In Field Resolution</span>
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-navy-900 mt-2">
              {inProgressCount}
            </p>
            <span className="text-[11px] text-civic-secondary mt-1 block">
              Active engineering teams
            </span>
          </Card>

          <Card className="p-4 sm:p-5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-civic-secondary">Successfully Resolved</span>
              <span className="text-emerald-600 text-xs font-semibold">{resolutionRate}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-2">
              {resolvedCount}
            </p>
            <span className="text-[11px] text-civic-secondary mt-1 block">
              Verified by citizens
            </span>
          </Card>

          <Card className="p-4 sm:p-5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-civic-secondary">Community Upvotes</span>
              <Sparkles className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-navy-900 mt-2">
              {totalSupports}
            </p>
            <span className="text-[11px] text-teal-600 font-medium mt-1 block">
              Duplicates deflected
            </span>
          </Card>
        </div>
      </section>

      {/* How It Works (Unique Value Proposition for Jammu) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-navy-900">
            Intelligent Triage Workflow
          </h2>
          <p className="text-sm text-civic-secondary mt-1">
            Engineered to overcome redundant manual complaint desks with spatial AI precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-base">
              1
            </div>
            <h3 className="text-base font-semibold text-navy-900">
              Photographic & Pinpoint Location
            </h3>
            <p className="text-xs text-civic-secondary leading-relaxed">
              Snap an image and place a pin on the Jammu interactive map. GPS and PostGIS geometry lock the exact coordinates down to the meter.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-teal-200 bg-teal-50/20">
            <div className="w-10 h-10 rounded-lg bg-navy-900 text-teal-400 flex items-center justify-center font-bold text-base">
              2
            </div>
            <h3 className="text-base font-semibold text-navy-900">
              Spatial Proximity & Duplicate Check
            </h3>
            <p className="text-xs text-civic-secondary leading-relaxed">
              If an identical problem exists nearby, you are given the option to support it instead of creating a duplicate queue item. Distinct issues stay separate!
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center font-bold text-base">
              3
            </div>
            <h3 className="text-base font-semibold text-navy-900">
              Automated Municipal Dispatch
            </h3>
            <p className="text-xs text-civic-secondary leading-relaxed">
              Issues are automatically routed to the right division (R&B, Sanitation, Electrical, or Jal Shakti) with SLA countdowns and live progress updates.
            </p>
          </Card>
        </div>
      </section>

      {/* Recent Grievances Feed */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-navy-900">Recent Complaints in Jammu</h2>
            <p className="text-xs text-civic-secondary">
              Real-time feed across Gandhi Nagar, Old City, Janipur, Bahu Fort & Channi Himmat.
            </p>
          </div>
          <Link
            to="/triage"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            Open Triage View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-civic-secondary text-sm">
            Loading municipal grievances...
          </div>
        ) : grievances.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No complaints yet"
            description="Complaints submitted across Jammu municipal wards will appear here in real time."
            actionLabel="Report a Problem"
            actionTo="/submit"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {grievances.slice(0, 6).map((g) => (
              <GrievanceCard key={g.id} grievance={g} onSupport={handleSupport} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
