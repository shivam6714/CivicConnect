import React from 'react';
import { Server } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Page Title */}
      <div className="bg-white p-5 rounded-xl border border-civic-border shadow-2xs">
        <h2 className="text-base font-bold text-navy-900">Administration & Profile Settings</h2>
        <p className="text-xs text-civic-secondary mt-1">
          Review municipal profile authorization and backend API integration endpoints.
        </p>
      </div>

      {/* Administrator Profile Card */}
      <div className="bg-white p-6 rounded-xl border border-civic-border shadow-2xs space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-navy-900 text-teal-400 font-extrabold flex items-center justify-center text-lg shadow-2xs">
            {user?.name.charAt(0) || 'A'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-900">{user?.name}</h3>
            <p className="text-xs text-civic-secondary">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                {user?.role.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-gray-500">ID: {user?.id}</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Department Assignment
            </span>
            <p className="font-semibold text-navy-900">{user?.department || 'Municipal Administration'}</p>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Administrative Jurisdiction
            </span>
            <p className="font-semibold text-navy-900">
              City-Wide (All 75 Jammu Wards)
            </p>
          </div>
        </div>
      </div>

      {/* Backend API Integration Architecture Status */}
      <div className="bg-white p-6 rounded-xl border border-civic-border shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-navy-900">FastAPI Backend Integration Contract</h3>
          </div>
          <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
            Provisional Interface Ready
          </span>
        </div>

        <p className="text-xs text-civic-secondary leading-relaxed">
          The frontend service layer has been pre-configured with typed DTOs and endpoints matching the companion FastAPI service:
        </p>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <span className="font-mono text-navy-900 font-semibold">POST /api/auth/login</span>
            <span className="text-teal-700 font-medium">Session Verification</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <span className="font-mono text-navy-900 font-semibold">GET /api/complaints</span>
            <span className="text-teal-700 font-medium">Ward-Scoped Querying</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <span className="font-mono text-navy-900 font-semibold">PATCH /api/complaints/:id/status</span>
            <span className="text-teal-700 font-medium">Officer Status Transition</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <span className="font-mono text-navy-900 font-semibold">POST /api/complaints/check-duplicate</span>
            <span className="text-teal-700 font-medium">Geospatial Proximity Match</span>
          </div>
        </div>
      </div>
    </div>
  );
};
