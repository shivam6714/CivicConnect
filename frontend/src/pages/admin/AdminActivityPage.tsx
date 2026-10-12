import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { grievanceService } from '../../services/grievanceService';
import { GrievanceTimelineEvent } from '../../types/grievance';

interface ActivityItem {
  id: string;
  trackingNumber: string;
  complaintTitle: string;
  wardNumber: number;
  wardName: string;
  event: GrievanceTimelineEvent;
}

export const AdminActivityPage: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const grievances = await grievanceService.getGrievances();

        // Flatten timelines into audit activity items across all city wards
        const items: ActivityItem[] = [];
        grievances.forEach((g) => {
          g.timeline.forEach((tl) => {
            items.push({
              id: `${g.id}-${tl.id}`,
              trackingNumber: g.trackingNumber,
              complaintTitle: g.title,
              wardNumber: g.ward.number,
              wardName: g.ward.name,
              event: tl,
            });
          });
        });

        // Sort by timestamp descending
        items.sort(
          (a, b) =>
            new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime()
        );

        setActivities(items);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.role]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'REPORTED':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'AI_TRIAGED':
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      case 'IN_PROGRESS':
        return <History className="w-4 h-4 text-purple-600" />;
      case 'RESOLVED':
        return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Scope Header */}
      <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-navy-900">System Audit & Activity Trail</h2>
            <span className="text-[10px] font-mono bg-navy-50 text-navy-900 px-2 py-0.5 rounded border border-navy-100">
              {activities.length} Events Logged
            </span>
          </div>
          <p className="text-xs text-civic-secondary mt-1">
            Complete chronological audit log of all civic triage actions across Jammu
          </p>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          Immutable Audit Log
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white rounded-xl border border-civic-border shadow-2xs p-6">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-xs text-civic-secondary space-y-2">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading audit history...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3 border border-gray-100">
              <History className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-navy-900">No activity to display</h3>
            <p className="text-xs sm:text-sm text-civic-secondary mt-1 max-w-sm mx-auto">
              Triage reviews, field officer dispatches, and status transitions will appear in this audit log as actions occur.
            </p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-gray-200">
            {activities.map((act) => (
              <div key={act.id} className="relative flex items-start gap-4 pl-2">
                <div className="w-7 h-7 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center flex-shrink-0 z-10 shadow-2xs">
                  {getStatusIcon(act.event.status)}
                </div>

                <div className="flex-1 bg-gray-50/70 p-4 rounded-xl border border-gray-100 text-xs hover:border-gray-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-navy-900">
                        {act.trackingNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white text-navy-900 border border-gray-200 font-semibold text-[10px]">
                        {act.event.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-civic-secondary">
                        Ward {act.wardNumber} ({act.wardName.split('&')[0]})
                      </span>
                    </div>

                    <span className="text-[11px] text-gray-500">
                      {new Date(act.event.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="font-semibold text-navy-900 mb-1">{act.complaintTitle}</p>

                  <div className="flex items-center gap-2 text-civic-secondary text-[11px]">
                    <User className="w-3 h-3 text-gray-400" />
                    <span>
                      Actor: <strong>{act.event.actor}</strong>
                    </span>
                    {act.event.note && (
                      <>
                        <span>•</span>
                        <span className="italic">{act.event.note}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
