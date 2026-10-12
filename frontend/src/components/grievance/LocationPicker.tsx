import React, { useState, useRef, useEffect } from 'react';
import {
  Coordinates,
  SelectedLocationData,
  LocationSelectionMethod,
  JammuWard,
} from '../../types/grievance';
import {
  JAMMU_MAP_CENTER,
  JAMMU_WARDS,
  findEstimatedWard,
  WardEstimationResult,
} from '../../data/jammuWards';
import { reverseGeocode } from '../../services/geocodingService';
import { InteractiveMap } from '../map/InteractiveMap';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  MapPin,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
  RefreshCw,
  Building2,
  Sparkles,
  Info,
  HelpCircle,
  Check,
} from 'lucide-react';

export interface LocationPickerProps {
  selectedLocation: SelectedLocationData | null;
  onLocationChange: (location: SelectedLocationData) => void;
  address: string;
  onAddressChange: (address: string) => void;
  landmark: string;
  onLandmarkChange: (landmark: string) => void;
  wardId: number | null;
  onWardChange: (wardId: number | null, source: 'auto' | 'manual') => void;
  wardSource?: 'auto' | 'manual' | 'none';
  error?: string | null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  selectedLocation,
  onLocationChange,
  address,
  onAddressChange,
  landmark,
  onLandmarkChange,
  wardId,
  onWardChange,
  wardSource = 'none',
  error,
}) => {
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccessMessage, setGpsSuccessMessage] = useState<string | null>(null);

  // Ward estimation & manual override tracking
  const [isManualSelection, setIsManualSelection] = useState(wardSource === 'manual');
  const [wardEstimation, setWardEstimation] = useState<WardEstimationResult | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<JammuWard | null>(null);

  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Keep manual selection state synchronized if prop changes from outside
  useEffect(() => {
    if (wardSource === 'manual') {
      setIsManualSelection(true);
    }
  }, [wardSource]);

  // Clear success notification after 5 seconds
  useEffect(() => {
    if (gpsSuccessMessage) {
      const timer = setTimeout(() => setGpsSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [gpsSuccessMessage]);

  /**
   * Evaluates ward for given coordinates, optionally using locality hint from reverse geocoding
   */
  const evaluateWard = (coords: Coordinates, localityHint?: string) => {
    const estimation = findEstimatedWard(coords, localityHint);
    setWardEstimation(estimation);

    if (!isManualSelection) {
      // In AUTO mode: assign estimated ward if found, or set null if undetermined
      if (estimation.ward) {
        onWardChange(estimation.ward.id, 'auto');
        setPendingSuggestion(null);
      } else {
        onWardChange(null, 'auto');
        setPendingSuggestion(null);
      }
    } else {
      // In MANUAL mode: do NOT overwrite the citizen's manual selection!
      // If the pin points to a different ward, offer a non-destructive option to switch.
      if (estimation.ward && estimation.ward.id !== wardId) {
        setPendingSuggestion(estimation.ward);
      } else {
        setPendingSuggestion(null);
      }
    }
  };

  /**
   * Browser Geolocation detection
   */
  const handleGetCurrentLocation = () => {
    setGpsError(null);
    setGpsSuccessMessage(null);

    if (!navigator.geolocation) {
      setGpsError(
        'Geolocation is not supported by your browser. Please click on the interactive map to select your location.'
      );
      return;
    }

    setIsDetectingGps(true);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsDetectingGps(false);

        const coords: Coordinates = {
          latitude: Number(position.coords.latitude.toFixed(5)),
          longitude: Number(position.coords.longitude.toFixed(5)),
        };
        const accuracy = Math.round(position.coords.accuracy);

        const newLocationData: SelectedLocationData = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          selectionMethod: 'current_location',
          accuracyMeters: accuracy,
          detectedAt: new Date().toISOString(),
        };

        onLocationChange(newLocationData);
        setGpsSuccessMessage(`Location detected successfully (accurate to ±${accuracy}m).`);

        // Reverse geocode to resolve readable street address & locality hint
        await resolveAddressAndWard(coords, newLocationData);
      },
      (geoErr) => {
        setIsDetectingGps(false);
        let message =
          'Unable to retrieve location. Please choose your location directly on the map.';

        switch (geoErr.code) {
          case geoErr.PERMISSION_DENIED:
            message =
              'Location permission was denied. Please allow location access in your browser settings or select a marker manually on the map.';
            break;
          case geoErr.POSITION_UNAVAILABLE:
            message =
              'GPS location information is currently unavailable on your device. Please click on the map to pinpoint your location.';
            break;
          case geoErr.TIMEOUT:
            message =
              'The location request timed out. Please try again or tap your incident spot on the map.';
            break;
        }

        setGpsError(message);
      },
      geoOptions
    );
  };

  /**
   * Manual map selection handler (from clicking or dragging marker)
   */
  const handleMapLocationSelected = async (
    coords: Coordinates,
    method: LocationSelectionMethod = 'manual'
  ) => {
    setGpsError(null);

    const newLocationData: SelectedLocationData = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      selectionMethod: method,
      detectedAt: new Date().toISOString(),
    };

    onLocationChange(newLocationData);

    // Immediately estimate ward from coordinates
    evaluateWard(coords);

    // Reverse geocode address and refine ward with locality hint
    await resolveAddressAndWard(coords, newLocationData);
  };

  /**
   * Reverse geocoding helper that also informs ward estimation
   */
  const resolveAddressAndWard = async (
    coords: Coordinates,
    locData: SelectedLocationData
  ) => {
    setIsGeocoding(true);
    try {
      const result = await reverseGeocode(coords);
      if (result) {
        if (result.fullAddress) {
          onAddressChange(result.fullAddress);
          onLocationChange({
            ...locData,
            address: result.fullAddress,
          });
        }
        // Refine ward estimation with locality hint (e.g., "Muthi", "Paloura")
        evaluateWard(coords, result.localityHint || result.suburb || result.neighbourhood);
      } else {
        evaluateWard(coords);
      }
    } catch {
      evaluateWard(coords);
    } finally {
      setIsGeocoding(false);
    }
  };

  /**
   * Dropdown manual selection by user
   */
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : null;
    setIsManualSelection(true);
    setPendingSuggestion(null);
    onWardChange(val, 'manual');
  };

  /**
   * Re-estimate ward from current map coordinates
   */
  const handleReEstimateWard = () => {
    if (!selectedLocation) return;
    setIsManualSelection(false);
    setPendingSuggestion(null);

    const coords: Coordinates = {
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    };
    const estimation = findEstimatedWard(coords, address);
    setWardEstimation(estimation);
    if (estimation.ward) {
      onWardChange(estimation.ward.id, 'auto');
    } else {
      onWardChange(null, 'auto');
    }
  };

  /**
   * Accept pending suggestion when pin moved
   */
  const handleAcceptPendingSuggestion = () => {
    if (pendingSuggestion) {
      setIsManualSelection(false);
      onWardChange(pendingSuggestion.id, 'auto');
      setPendingSuggestion(null);
    }
  };

  const currentWardObj = JAMMU_WARDS.find((w) => w.id === wardId);

  return (
    <div className="space-y-4" ref={mapSectionRef}>
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-civic-border shadow-subtle">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Prominent Current Location Button */}
          <Button
            type="button"
            variant="accent"
            size="md"
            onClick={handleGetCurrentLocation}
            isLoading={isDetectingGps}
            leftIcon={<MapPin className="w-4 h-4 text-white" />}
            className="shadow-sm"
          >
            {isDetectingGps ? 'Detecting GPS...' : 'Use My Current Location'}
          </Button>

          {/* Choose on Map Button */}
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => {
              mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            leftIcon={<Crosshair className="w-4 h-4 text-navy-800" />}
          >
            Choose on Map
          </Button>
        </div>

        {/* Coordinates / Selection Status */}
        <div className="flex items-center gap-2 text-xs">
          {selectedLocation ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedLocation.selectionMethod === 'current_location' ? (
                <Badge variant="accent" icon={<Navigation className="w-3 h-3 text-teal-600" />}>
                  GPS Detected {selectedLocation.accuracyMeters ? `(±${selectedLocation.accuracyMeters}m)` : ''}
                </Badge>
              ) : (
                <Badge variant="primary" icon={<Crosshair className="w-3 h-3 text-navy-800" />}>
                  Manual Map Pin
                </Badge>
              )}
              <span className="font-mono text-[11px] text-navy-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                {selectedLocation.latitude.toFixed(5)}° N, {selectedLocation.longitude.toFixed(5)}° E
              </span>
            </div>
          ) : (
            <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              Location required — pick on map or detect GPS
            </span>
          )}
        </div>
      </div>

      {/* GPS Error Alert */}
      {gpsError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-rose-900">
            <span className="font-semibold block mb-0.5">Location Access Error</span>
            <p>{gpsError}</p>
          </div>
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* GPS Success Notification */}
      {gpsSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{gpsSuccessMessage}</span>
        </div>
      )}

      {/* Reverse Geocoding Status */}
      {isGeocoding && (
        <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg flex items-center gap-2 text-xs text-teal-900">
          <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
          <span>Resolving address & verifying municipal ward in Jammu...</span>
        </div>
      )}

      {/* Validation Error */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Interactive Map Box */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-civic-secondary px-1">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-navy-400" />
            Click anywhere in Jammu or drag the pin to fine-tune incident spot
          </span>
          <span className="text-[11px] text-gray-400">Map data © OpenStreetMap</span>
        </div>

        <InteractiveMap
          height="360px"
          center={JAMMU_MAP_CENTER}
          selectedLocation={selectedLocation || undefined}
          onLocationSelect={handleMapLocationSelected}
          zoom={selectedLocation ? 16 : 14}
          isDraggable={true}
          accuracyMeters={selectedLocation?.accuracyMeters}
          selectedAddress={address}
          preferredTileStyle="humanitarian"
        />
      </div>

      {/* Non-destructive notification when pin moved after manual selection */}
      {pendingSuggestion && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-950 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Pin Moved Near Another Ward</span>
              <p className="mt-0.5 text-amber-900">
                The incident marker is now closer to <strong>Ward {pendingSuggestion.number}: {pendingSuggestion.name}</strong>. You previously manually selected <strong>Ward {currentWardObj?.number || wardId}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleAcceptPendingSuggestion}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Switch to Ward {pendingSuggestion.number}
            </button>
            <button
              type="button"
              onClick={() => setPendingSuggestion(null)}
              className="px-2 py-1 text-amber-800 hover:text-amber-950 font-medium text-xs"
            >
              Keep Current
            </button>
          </div>
        </div>
      )}

      {/* Form Fields Synchronized with Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Street Address Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-navy-900">
              Resolved Street Address / Locality
            </label>
            {isGeocoding && <span className="text-[11px] text-teal-600">Updating...</span>}
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="e.g. Lower Muthi, Barnai Road, Jammu"
            className="w-full px-3 py-2 text-sm border border-civic-border rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
            required
          />
        </div>

        {/* Municipal Ward Dropdown & Estimation Status */}
        <div>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
            <label className="block text-xs font-semibold text-navy-900 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-navy-600" />
              Municipal Ward
            </label>

            {/* Dynamic Status Badges */}
            <div className="flex items-center gap-1">
              {isManualSelection ? (
                <div className="flex items-center gap-1">
                  <Badge variant="neutral">Manually Selected</Badge>
                  {selectedLocation && (
                    <button
                      type="button"
                      onClick={handleReEstimateWard}
                      className="text-[11px] text-teal-600 hover:text-teal-700 underline"
                      title="Re-estimate ward from current map coordinates"
                    >
                      Re-estimate
                    </button>
                  )}
                </div>
              ) : wardEstimation?.confidence === 'high' ? (
                <Badge variant="accent" icon={<Sparkles className="w-3 h-3 text-teal-600" />}>
                  Auto-estimated
                </Badge>
              ) : wardEstimation?.confidence === 'suggested' ? (
                <Badge variant="primary" icon={<Info className="w-3 h-3 text-navy-700" />}>
                  Proximity Suggestion
                </Badge>
              ) : wardId === null ? (
                <Badge variant="warning">Ward not determined</Badge>
              ) : null}
            </div>
          </div>

          <select
            value={wardId !== null ? wardId : ''}
            onChange={handleDropdownChange}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white ${
              wardId === null
                ? 'border-amber-400 bg-amber-50/30 text-amber-900'
                : 'border-civic-border text-navy-900'
            }`}
          >
            <option value="">
              {selectedLocation
                ? '-- Ward not determined (Select from 75 JMC Wards) --'
                : '-- Select your Jammu Municipal Ward --'}
            </option>
            {JAMMU_WARDS.map((w) => (
              <option key={w.id} value={w.id}>
                Ward {w.number}: {w.name} ({w.zone})
              </option>
            ))}
          </select>

          {/* Subtext explaining estimation status */}
          <div className="mt-1 flex items-center justify-between text-[11px]">
            {wardEstimation?.statusLabel ? (
              <span className="text-civic-secondary italic">
                {wardEstimation.statusLabel}
              </span>
            ) : (
              <span className="text-civic-secondary">
                Select your designated ward from all 75 JMC wards
              </span>
            )}
            {currentWardObj?.councillor && (
              <span className="text-navy-700 font-medium hidden sm:inline">
                Rep: {currentWardObj.councillor}
              </span>
            )}
          </div>
        </div>

        {/* Nearby Landmark */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-navy-900 mb-1">
            Nearby Landmark or Crossroad (Optional)
          </label>
          <input
            type="text"
            value={landmark}
            onChange={(e) => onLandmarkChange(e.target.value)}
            placeholder="e.g. Near Muthi Chowk / Opposite Kalika Colony Entry"
            className="w-full px-3 py-2 text-sm border border-civic-border rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
          />
        </div>
      </div>

      {/* Privacy & Boundary Note */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-civic-secondary flex items-start gap-2">
        <Info className="w-4 h-4 text-navy-400 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Municipal Ward Integrity:</strong> Automated ward estimation uses spatial proximity to official JMC centroids and reverse-geocoded locality anchors. If your local ward differs from the proximity estimate (such as along border lanes), you can choose your exact ward from the complete 75-ward directory. Your manual choice will be respected.
        </div>
      </div>
    </div>
  );
};
