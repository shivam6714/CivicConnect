import React, { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import { Coordinates, Grievance, LocationSelectionMethod } from '../../types/grievance';
import { JAMMU_MAP_CENTER } from '../../data/jammuWards';
import { CategoryBadge, StatusBadge } from '../grievance/GrievanceStatusBadge';
import {
  ThumbsUp,
  Move,
  Plus,
  Minus,
  Crosshair,
  Layers,
  Info,
} from 'lucide-react';

// Custom SVG-based modern Leaflet Pin Icons
export const createPinIcon = (color: string, label?: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3)); cursor: pointer;">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="${color}" stroke="#FFFFFF" stroke-width="1.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.8" fill="#FFFFFF"/>
        </svg>
        ${label ? `<span style="position: absolute; top: 4px; font-size: 10px; font-weight: bold; color: ${color};">${label}</span>` : ''}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
};

export const defaultPin = createPinIcon('#0F9D8A'); // Accent teal
export const userSelectedPin = createPinIcon('#E11D48', '📍'); // Rose pin for selected incident

export type MapTileStyle = 'streets' | 'humanitarian' | 'voyager';

export interface TileProviderConfig {
  id: MapTileStyle;
  name: string;
  shortLabel: string;
  badgeLabel: string;
  description: string;
  url: string;
  attribution: string;
  maxNativeZoom: number;
  maxZoom: number;
  subdomains?: string[];
}

/**
 * Tile Providers evaluated for Jammu, India street-level clarity.
 * All providers are free, open, require zero API keys, and adhere to attribution policies.
 */
export const TILE_PROVIDERS: Record<MapTileStyle, TileProviderConfig> = {
  humanitarian: {
    id: 'humanitarian',
    name: 'Humanitarian / High-Contrast Streets (HOT)',
    shortLabel: 'High-Contrast Streets',
    badgeLabel: 'HOT Streets (Recommended)',
    description: 'High-contrast rendering of lanes, gallis, unpaved roads and civic amenities in Jammu',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, Tiles by <a href="https://www.hotosm.org/" target="_blank" rel="noopener">Humanitarian OpenStreetMap Team</a>',
    maxNativeZoom: 19,
    maxZoom: 20,
    subdomains: ['a', 'b', 'c'],
  },
  streets: {
    id: 'streets',
    name: 'OpenStreetMap Standard',
    shortLabel: 'OSM Standard',
    badgeLabel: 'Standard OSM',
    description: 'Default OpenStreetMap cartography with verified global road network',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
    maxZoom: 20,
    subdomains: ['a', 'b', 'c'],
  },
  voyager: {
    id: 'voyager',
    name: 'CartoDB Voyager (Civic POI)',
    shortLabel: 'Detailed Civic',
    badgeLabel: 'Carto Voyager',
    description: 'Emphasized building footprints, road labels and civic points of interest',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    maxNativeZoom: 19,
    maxZoom: 20,
    subdomains: ['a', 'b', 'c', 'd'],
  },
};

interface MapClickEventsProps {
  onLocationSelect?: (coords: Coordinates, method: LocationSelectionMethod) => void;
}

const MapClickEvents: React.FC<MapClickEventsProps> = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(
          {
            latitude: Number(e.latlng.lat.toFixed(5)),
            longitude: Number(e.latlng.lng.toFixed(5)),
          },
          'manual'
        );
      }
    },
  });
  return null;
};

interface MapViewControllerProps {
  center?: Coordinates;
  selectedLocation?: Coordinates;
  flyToLocation?: boolean;
  onZoomChange?: (zoom: number) => void;
}

/**
 * Controller to handle smooth navigation, resize invalidation,
 * and PREVENT unexpected zoom/center resets during React state updates.
 */
const MapViewController: React.FC<MapViewControllerProps> = ({
  center,
  selectedLocation,
  flyToLocation = true,
  onZoomChange,
}) => {
  const map = useMap();
  const lastFlownCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  // Sync zoom level back to state
  useMapEvents({
    zoomend() {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
    },
  });

  // Handle container resizing (e.g. flex transitions, window resize)
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  // Add metric scale control in bottom right
  useEffect(() => {
    const scale = L.control.scale({ imperial: false, metric: true, position: 'bottomright' });
    scale.addTo(map);
    return () => {
      scale.remove();
    };
  }, [map]);

  // Fly to selected location ONLY when coordinates have actually changed significantly
  // (Prevents re-flying or resetting zoom when parent re-renders or address changes!)
  useEffect(() => {
    if (!selectedLocation || !flyToLocation) return;

    const prev = lastFlownCoordRef.current;
    const isFirstTime = prev === null;
    const hasMovedSignificantly =
      !prev ||
      Math.abs(selectedLocation.latitude - prev.lat) > 0.00008 ||
      Math.abs(selectedLocation.longitude - prev.lng) > 0.00008;

    if (isFirstTime || hasMovedSignificantly) {
      lastFlownCoordRef.current = {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
      };

      // Maintain current zoom level if user has already zoomed into street level (>= 16)
      const targetZoom = Math.max(map.getZoom(), 16);

      map.flyTo([selectedLocation.latitude, selectedLocation.longitude], targetZoom, {
        duration: 1.0,
        easeLinearity: 0.25,
      });
    }
  }, [selectedLocation?.latitude, selectedLocation?.longitude, flyToLocation, map]);

  // Handle external center changes (e.g., clicking ward focus buttons)
  useEffect(() => {
    if (!center || selectedLocation) return;

    const prev = lastCenterRef.current;
    const hasCenterChanged =
      !prev ||
      Math.abs(center.latitude - prev.lat) > 0.0001 ||
      Math.abs(center.longitude - prev.lng) > 0.0001;

    if (hasCenterChanged) {
      lastCenterRef.current = { lat: center.latitude, lng: center.longitude };
      map.setView([center.latitude, center.longitude], map.getZoom());
    }
  }, [center?.latitude, center?.longitude, selectedLocation, map]);

  return null;
};

/**
 * Child component with imperative zoom & pan controls
 */
const MapNavigationControls: React.FC<{
  selectedLocation?: Coordinates;
  currentZoom: number;
  tileStyle: MapTileStyle;
  onTileStyleChange: (style: MapTileStyle) => void;
}> = ({ selectedLocation, currentZoom, tileStyle, onTileStyleChange }) => {
  const map = useMap();
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handlePresetZoom = (targetZoom: number) => {
    if (selectedLocation) {
      map.flyTo([selectedLocation.latitude, selectedLocation.longitude], targetZoom, {
        duration: 0.6,
      });
    } else {
      map.setZoom(targetZoom);
    }
  };

  const handleCenterOnMarker = () => {
    if (selectedLocation) {
      map.flyTo(
        [selectedLocation.latitude, selectedLocation.longitude],
        Math.max(map.getZoom(), 17),
        { duration: 0.8 }
      );
    }
  };

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2 pointer-events-auto">
      {/* Layer Style Switcher & Zoom Indicator */}
      <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-civic-border rounded-xl shadow-card p-1">
        {/* Layer Toggle Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-navy-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Switch map layer provider"
          >
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">{TILE_PROVIDERS[tileStyle].shortLabel}</span>
          </button>

          {/* Layer Selector Dropdown */}
          {showLayerMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-civic-border rounded-xl shadow-modal p-2 z-[1100] text-left animate-in fade-in duration-150">
              <span className="text-[10px] font-bold text-civic-secondary uppercase tracking-wider px-2 py-1 block">
                Jammu Map Tile Providers
              </span>
              {(Object.keys(TILE_PROVIDERS) as MapTileStyle[]).map((key) => {
                const prov = TILE_PROVIDERS[key];
                const active = tileStyle === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onTileStyleChange(key);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors block mb-1 ${
                      active
                        ? 'bg-teal-50 border border-teal-200 text-teal-900 font-semibold'
                        : 'hover:bg-gray-50 text-navy-900'
                    }`}
                  >
                    <div className="font-semibold text-navy-900">{prov.name}</div>
                    <div className="text-[11px] text-civic-secondary mt-0.5 leading-snug">
                      {prov.description}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span className="h-4 w-px bg-gray-200" />

        {/* Live Zoom Level Indicator */}
        <span className="font-mono text-[11px] font-bold text-navy-800 px-2 py-0.5 bg-navy-50 rounded border border-navy-100">
          {currentZoom}x
        </span>
      </div>

      {/* Navigation Buttons (+, -, presets, re-center) */}
      <div className="flex flex-col bg-white/95 backdrop-blur-md border border-civic-border rounded-xl shadow-card overflow-hidden">
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={currentZoom >= 20}
          className="p-2 text-navy-900 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 transition-colors border-b border-gray-100"
          title="Zoom In (Close Street Level)"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={currentZoom <= 10}
          className="p-2 text-navy-900 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 transition-colors border-b border-gray-100"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>

        {selectedLocation && (
          <button
            type="button"
            onClick={handleCenterOnMarker}
            className="p-2 text-teal-600 hover:bg-teal-50 active:bg-teal-100 transition-colors border-b border-gray-100"
            title="Re-center on selected incident pin"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Zoom Presets */}
      <div className="hidden sm:flex items-center gap-1 bg-white/95 backdrop-blur-md border border-civic-border rounded-xl shadow-card p-1 text-[11px]">
        <button
          type="button"
          onClick={() => handlePresetZoom(14)}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            currentZoom <= 14 ? 'bg-navy-900 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Ward / Area overview (14x)"
        >
          Ward (14x)
        </button>
        <button
          type="button"
          onClick={() => handlePresetZoom(17)}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            currentZoom >= 16 && currentZoom <= 17
              ? 'bg-navy-900 text-white font-semibold'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Street & Colony Level (17x)"
        >
          Street (17x)
        </button>
        <button
          type="button"
          onClick={() => handlePresetZoom(19)}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            currentZoom >= 18 ? 'bg-teal-600 text-white font-semibold' : 'text-teal-700 hover:bg-teal-50'
          }`}
          title="High-detail Alley & Lane Level (19x)"
        >
          Lanes (19x)
        </button>
      </div>
    </div>
  );
};

export interface InteractiveMapProps {
  selectedLocation?: Coordinates;
  onLocationSelect?: (coords: Coordinates, method: LocationSelectionMethod) => void;
  grievances?: Grievance[];
  height?: string;
  zoom?: number;
  center?: Coordinates;
  onGrievanceClick?: (grievance: Grievance) => void;
  isDraggable?: boolean;
  accuracyMeters?: number;
  flyToSelectedLocation?: boolean;
  selectedAddress?: string;
  preferredTileStyle?: MapTileStyle;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  selectedLocation,
  onLocationSelect,
  grievances = [],
  height = '400px',
  zoom = 14,
  center = JAMMU_MAP_CENTER,
  onGrievanceClick,
  isDraggable = true,
  accuracyMeters,
  flyToSelectedLocation = true,
  selectedAddress,
  preferredTileStyle = 'humanitarian', // Defaults to HOT which renders small Indian streets/lanes with high contrast
}) => {
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [tileStyle, setTileStyle] = useState<MapTileStyle>(preferredTileStyle);

  const activeProvider = TILE_PROVIDERS[tileStyle];
  const initialCenter = selectedLocation || center;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'POTHOLE_ROAD':
        return '#475569';
      case 'STREET_LIGHT':
        return '#0284C7';
      case 'GARBAGE_ACCUMULATION':
        return '#D97706';
      case 'DRAINAGE_SEWAGE':
        return '#0D9488';
      case 'WATER_SUPPLY':
        return '#2563EB';
      default:
        return '#14243A';
    }
  };

  return (
    <div
      style={{ height, width: '100%' }}
      className="rounded-xl overflow-hidden border border-civic-border relative shadow-subtle z-0"
    >
      <MapContainer
        center={[initialCenter.latitude, initialCenter.longitude]}
        zoom={zoom}
        minZoom={10}
        maxZoom={20} // Enables street-level navigation up to 20x without clipping
        scrollWheelZoom={true}
        doubleClickZoom={true}
        zoomControl={false} // Custom controls render cleanly without CSS conflicts
        style={{ height: '100%', width: '100%' }}
      >
        {/* Dynamic Tile Layer configured with documented maxNativeZoom & overzoom */}
        <TileLayer
          key={activeProvider.id}
          url={activeProvider.url}
          attribution={activeProvider.attribution}
          maxNativeZoom={activeProvider.maxNativeZoom} // Native tiles up to 19x
          maxZoom={activeProvider.maxZoom} // Smooth hardware-accelerated overzoom to 20x
          subdomains={activeProvider.subdomains || ['a', 'b', 'c']}
        />

        {/* Dynamic Map Controller for smooth flyTo, center changes & scale bar */}
        <MapViewController
          center={center}
          selectedLocation={selectedLocation}
          flyToLocation={flyToSelectedLocation}
          onZoomChange={(z) => setCurrentZoom(z)}
        />

        {/* User-facing zoom & layer controls */}
        <MapNavigationControls
          selectedLocation={selectedLocation}
          currentZoom={currentZoom}
          tileStyle={tileStyle}
          onTileStyleChange={setTileStyle}
        />

        {/* Listen for click to place pin */}
        {onLocationSelect && <MapClickEvents onLocationSelect={onLocationSelect} />}

        {/* Visual GPS Accuracy Radius Circle */}
        {selectedLocation && accuracyMeters && accuracyMeters > 0 && (
          <Circle
            center={[selectedLocation.latitude, selectedLocation.longitude]}
            radius={Math.min(accuracyMeters, 500)}
            pathOptions={{
              color: '#0F9D8A',
              fillColor: '#0F9D8A',
              fillOpacity: 0.12,
              weight: 1.5,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* User-selected Pin (Interactive & Draggable) */}
        {selectedLocation && (
          <Marker
            position={[selectedLocation.latitude, selectedLocation.longitude]}
            icon={userSelectedPin}
            draggable={isDraggable && !!onLocationSelect}
            eventHandlers={{
              dragend(e) {
                if (onLocationSelect) {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  onLocationSelect(
                    {
                      latitude: Number(pos.lat.toFixed(5)),
                      longitude: Number(pos.lng.toFixed(5)),
                    },
                    'manual'
                  );
                }
              },
            }}
          >
            <Popup>
              <div className="text-xs p-1 max-w-[240px]">
                <div className="flex items-center gap-1 text-rose-600 font-semibold mb-1">
                  <Move className="w-3.5 h-3.5" />
                  <span>Selected Incident Location</span>
                </div>
                {selectedAddress && (
                  <p className="text-navy-900 font-medium text-[11px] mb-1 leading-snug">
                    {selectedAddress}
                  </p>
                )}
                <span className="text-gray-500 font-mono text-[11px] block">
                  {selectedLocation.latitude.toFixed(5)}° N, {selectedLocation.longitude.toFixed(5)}° E
                </span>
                {isDraggable && onLocationSelect && (
                  <span className="text-[10px] text-teal-700 font-medium mt-1.5 pt-1 border-t border-gray-100 block">
                    Tip: Drag marker directly to the pothole or fixture
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Existing Grievances on the Map */}
        {grievances.map((grievance) => {
          const pin = createPinIcon(getCategoryColor(grievance.category));
          return (
            <Marker
              key={grievance.id}
              position={[grievance.location.latitude, grievance.location.longitude]}
              icon={pin}
              eventHandlers={{
                click: () => onGrievanceClick && onGrievanceClick(grievance),
              }}
            >
              <Popup>
                <div className="p-1 max-w-[220px] text-left">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] font-bold text-navy-900">
                      {grievance.trackingNumber}
                    </span>
                    <StatusBadge status={grievance.status} />
                  </div>
                  <h5 className="font-semibold text-xs text-navy-900 mb-1 leading-snug">
                    {grievance.title}
                  </h5>
                  <div className="mb-2">
                    <CategoryBadge category={grievance.category} />
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-2 mb-2">
                    {grievance.address}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-teal-700 font-medium pt-1 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {grievance.supportCount}
                    </span>
                    <span>Ward {grievance.ward.number}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating status & fallback notice */}
      <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none flex flex-col gap-1 max-w-[calc(100%-120px)]">
        {onLocationSelect && (
          <div className="bg-white/95 backdrop-blur-sm border border-civic-border rounded-lg px-3 py-1.5 shadow-subtle text-xs text-navy-900 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
            <span className="truncate">
              Click or drag marker to set exact spot in Jammu
            </span>
          </div>
        )}

        {/* High zoom lane/building fallback explanation */}
        {currentZoom >= 18 && (
          <div className="bg-navy-900/90 backdrop-blur-sm text-white border border-navy-700 rounded-lg px-2.5 py-1 text-[10px] flex items-center gap-1.5 shadow-subtle">
            <Info className="w-3 h-3 text-teal-400 flex-shrink-0" />
            <span className="truncate">
              Street detail active ({currentZoom}x). Unnamed gallis are mapped by exact coordinates.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
