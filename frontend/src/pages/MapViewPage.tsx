import React, { useEffect, useState } from 'react';
import { InteractiveMap } from '../components/map/InteractiveMap';
import { grievanceService } from '../services/grievanceService';
import { Grievance, Coordinates } from '../types/grievance';
import { JAMMU_MAP_CENTER } from '../data/jammuWards';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/grievance/GrievanceStatusBadge';
import { MapPin, ThumbsUp, Calendar, X, Compass } from 'lucide-react';

export const MapViewPage: React.FC = () => {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>(JAMMU_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    const load = async () => {
      const data = await grievanceService.getGrievances();
      setGrievances(data);
    };
    load();
  }, []);

  const handleSupport = async (id: string) => {
    await grievanceService.supportGrievance(id);
    const updated = await grievanceService.getGrievances();
    setGrievances(updated);
    if (selectedGrievance && selectedGrievance.id === id) {
      const updatedItem = updated.find((g) => g.id === id);
      if (updatedItem) setSelectedGrievance(updatedItem);
    }
  };

  const focusWard = (lat: number, lng: number) => {
    setMapCenter({ latitude: lat, longitude: lng });
    setMapZoom(15);
  };

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Top Banner */}
      <div className="bg-white border-b border-civic-border px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-subtle z-10">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-teal-600" />
          <span className="text-xs sm:text-sm font-bold text-navy-900">
            Jammu Geospatial Municipal Grid
          </span>
          <span className="text-xs text-civic-secondary hidden sm:inline">
            ({grievances.length} Active Spatial Anchors)
          </span>
        </div>

        {/* Quick Ward Jumps */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
          <span className="text-civic-secondary text-[11px] font-medium hidden md:inline">
            Quick Zoom:
          </span>
          <button
            onClick={() => focusWard(32.7088, 74.8631)}
            className="px-2.5 py-1 rounded bg-navy-50 text-navy-900 border border-navy-100 hover:bg-navy-100 font-medium whitespace-nowrap"
          >
            Gandhi Nagar
          </button>
          <button
            onClick={() => focusWard(32.7292, 74.8615)}
            className="px-2.5 py-1 rounded bg-navy-50 text-navy-900 border border-navy-100 hover:bg-navy-100 font-medium whitespace-nowrap"
          >
            Old Heritage City
          </button>
          <button
            onClick={() => focusWard(32.7532, 74.8465)}
            className="px-2.5 py-1 rounded bg-navy-50 text-navy-900 border border-navy-100 hover:bg-navy-100 font-medium whitespace-nowrap"
          >
            Janipur
          </button>
          <button
            onClick={() => focusWard(32.7285, 74.8780)}
            className="px-2.5 py-1 rounded bg-navy-50 text-navy-900 border border-navy-100 hover:bg-navy-100 font-medium whitespace-nowrap"
          >
            Bahu Fort
          </button>
          <button
            onClick={() => {
              setMapCenter(JAMMU_MAP_CENTER);
              setMapZoom(13);
            }}
            className="px-2.5 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium whitespace-nowrap"
          >
            Reset City View
          </button>
        </div>
      </div>

      {/* Map Container and Drawer */}
      <div className="relative flex-1 w-full min-h-[550px] flex">
        {grievances.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none px-4 w-full max-w-md text-center">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 px-4 py-2.5 rounded-full shadow-md inline-flex items-center gap-2 text-xs font-medium text-navy-900 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>No complaint locations available</span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-500 hidden sm:inline">New reports will appear here in real time</span>
            </div>
          </div>
        )}
        <div className="flex-1 w-full h-full relative">
          <InteractiveMap
            height="100%"
            zoom={mapZoom}
            center={mapCenter}
            grievances={grievances}
            onGrievanceClick={(g) => setSelectedGrievance(g)}
          />
        </div>

        {/* Selected Complaint Detail Slide-Over Card */}
        {selectedGrievance && (
          <div className="absolute top-4 right-4 z-20 w-full max-w-sm sm:max-w-md animate-in slide-in-from-right duration-200">
            <Card className="p-5 shadow-elevated border-navy-200 bg-white">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-civic-border">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-navy-900 bg-navy-50 px-2 py-0.5 rounded border border-navy-100">
                    {selectedGrievance.trackingNumber}
                  </span>
                  <CategoryBadge category={selectedGrievance.category} />
                </div>
                <button
                  onClick={() => setSelectedGrievance(null)}
                  className="p-1 text-civic-secondary hover:text-navy-900 rounded-md hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={selectedGrievance.priority} />
                  <StatusBadge status={selectedGrievance.status} />
                </div>

                <h3 className="font-bold text-base text-navy-900">
                  {selectedGrievance.title}
                </h3>

                <p className="text-xs text-civic-secondary leading-relaxed">
                  {selectedGrievance.description}
                </p>

                {selectedGrievance.imageUrl && (
                  <div className="h-40 rounded-lg overflow-hidden border border-civic-border">
                    <img
                      src={selectedGrievance.imageUrl}
                      alt={selectedGrievance.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-civic-secondary pt-2 border-t border-civic-border">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span className="font-medium text-navy-900">{selectedGrievance.address}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-civic-secondary">
                    <span>Ward {selectedGrievance.ward.number}: {selectedGrievance.ward.name}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(selectedGrievance.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-civic-border flex items-center justify-between">
                  <Button
                    size="sm"
                    variant={selectedGrievance.isSupportedByCurrentUser ? 'accent' : 'outline'}
                    leftIcon={<ThumbsUp className="w-3.5 h-3.5" />}
                    onClick={() => handleSupport(selectedGrievance.id)}
                  >
                    {selectedGrievance.supportCount} Citizens Supported
                  </Button>

                  <span className="text-xs font-mono text-teal-700">
                    {selectedGrievance.location.latitude.toFixed(4)}, {selectedGrievance.location.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
