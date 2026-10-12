import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-civic-border mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-civic-secondary">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-navy-900">CivicConnect Jammu</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Jammu Municipal Corporation (JMC) Pilot Initiative
            </span>
          </div>

          <div className="flex items-center gap-6">
            <span>Spatial PostGIS Resolution</span>
            <span>Multi-Stage AI Duplicate Triage</span>
            <span>Citizen Verified</span>
          </div>

          <div className="flex items-center gap-1 text-civic-secondary">
            <span>Built for the citizens of Jammu</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
