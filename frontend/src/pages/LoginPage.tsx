import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
  Smartphone,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-civic-bg">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* CivicConnect Header & Identity */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-900 text-teal-400 font-extrabold text-2xl shadow-subtle mb-4">
            CC
          </div>
          <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-2 mx-auto w-fit">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            Jammu Municipal Corporation
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900">
            Welcome to CivicConnect
          </h1>
          <p className="mt-2 text-sm text-civic-secondary max-w-md mx-auto leading-relaxed">
            AI-assisted municipal grievance triage and resolution platform for Jammu. Please choose your portal to continue.
          </p>
        </div>

        {/* Two Large Selectable Portal Cards */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Admin Login */}
          <div
            onClick={() => navigate('/login/admin')}
            className="group relative bg-white rounded-2xl border-2 border-civic-border hover:border-navy-900 p-7 shadow-2xs hover:shadow-card transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-navy-900 text-teal-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <h2 className="text-lg font-bold text-navy-900 group-hover:text-navy-900">
                  Admin Login
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-navy-50 text-navy-900 border border-navy-100 px-2 py-0.5 rounded">
                  Official
                </span>
              </div>

              <p className="text-xs text-civic-secondary leading-relaxed mb-5">
                Municipal grievance triage, ward-level assignment, resolution tracking, and city-wide spatial analytics.
              </p>

              <div className="space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span>City-wide & Ward-specific dashboards</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span>Inspect & triage field tickets</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span>Geospatial ward map & reports</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-navy-900 group-hover:text-teal-700 transition-colors">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Sign In with Admin ID
              </span>
              <div className="w-7 h-7 rounded-lg bg-navy-50 group-hover:bg-navy-900 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2: Citizen Login */}
          <div
            onClick={() => navigate('/login/citizen')}
            className="group relative bg-white rounded-2xl border-2 border-civic-border hover:border-teal-500 p-7 shadow-2xs hover:shadow-card transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-xs border border-teal-100">
                <Users className="w-6 h-6" />
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <h2 className="text-lg font-bold text-navy-900 group-hover:text-teal-700 transition-colors">
                  Citizen Login
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                  Residents
                </span>
              </div>

              <p className="text-xs text-civic-secondary leading-relaxed mb-5">
                Submit complaints, track grievance lifecycle in real-time, and view photographic resolution evidence.
              </p>

              <div className="space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span>Fast login using Mobile OTP</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span>Track your personal submissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span>View repair photos & evidence</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-teal-800 group-hover:text-teal-900 transition-colors">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Sign In with Mobile OTP
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Prototype Mock Credentials Notice */}
        <div className="mt-8 p-4 bg-white rounded-xl border border-civic-border text-center text-xs text-civic-secondary shadow-2xs">
          <p className="font-semibold text-navy-900 mb-1">
            Prototype Mock Authentication Active
          </p>
          <p className="text-[11px] text-gray-500">
            Pre-configured mock accounts are loaded for testing until the FastAPI backend and database are connected:
            <span className="block mt-1 font-mono text-[10px] text-teal-700">
              Admin: cityadmin@civicconnect.demo &bull; Citizen: 9876543210 (OTP: 123456)
            </span>
          </p>
        </div>

        {/* Municipal Footer Notice */}
        <div className="mt-4 text-center text-[11px] text-civic-secondary">
          <p>Jammu Municipal Corporation &bull; Civic Redressal & Field Operations System</p>
        </div>
      </div>
    </div>
  );
};
