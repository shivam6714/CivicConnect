import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DuplicateAlertModal } from '../components/grievance/DuplicateAlertModal';
import { LocationPicker } from '../components/grievance/LocationPicker';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import {
  GrievanceCategory,
  CreateGrievanceDTO,
  DuplicateDetectionResult,
  SelectedLocationData,
} from '../types/grievance';
import { grievanceService } from '../services/grievanceService';
import { ApiError } from '../services/apiClient';
import {
  CheckCircle,
  Sparkles,
  UserCheck,
  RotateCcw,
  AlertTriangle,
  Lock,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SubmitGrievancePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [category, setCategory] = useState<GrievanceCategory>('POTHOLE_ROAD');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [wardId, setWardId] = useState<number | null>(null);
  const [wardSource, setWardSource] = useState<'auto' | 'manual' | 'none'>('none');
  const [location, setLocation] = useState<SelectedLocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Duplicate Check Modal State
  const [duplicateResult, setDuplicateResult] = useState<DuplicateDetectionResult | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [createdTrackingNumber, setCreatedTrackingNumber] = useState<string | null>(null);

  const categories: { value: GrievanceCategory; label: string; icon: string }[] = [
    { value: 'POTHOLE_ROAD', label: 'Pothole / Road Damage', icon: '🛣️' },
    { value: 'STREET_LIGHT', label: 'Broken Street Light', icon: '💡' },
    { value: 'GARBAGE_ACCUMULATION', label: 'Garbage & Waste', icon: '🗑️' },
    { value: 'DRAINAGE_SEWAGE', label: 'Drainage / Sewage', icon: '🌊' },
    { value: 'WATER_SUPPLY', label: 'Water Leakage (PHE)', icon: '🚰' },
    { value: 'ENCROACHMENT', label: 'Encroachment / Public Space', icon: '🚧' },
    { value: 'OTHER', label: 'Other Civic Hazard', icon: '⚠️' },
  ];

  const handleLocationChange = async (newLocation: SelectedLocationData) => {
    setLocation(newLocation);
    setLocationError(null);

    // Automatically check for nearby duplicates on location update
    const dupCheck = await grievanceService.checkNearbyDuplicates(
      { latitude: newLocation.latitude, longitude: newLocation.longitude },
      category
    );
    if (dupCheck.isPotentialDuplicate && dupCheck.nearbyGrievances.length > 0) {
      setDuplicateResult(dupCheck);
      setShowDuplicateModal(true);
    }
  };

  const handleWardChange = (newWardId: number | null, source: 'auto' | 'manual') => {
    setWardId(newWardId);
    setWardSource(source);
    setLocationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submission
    setSubmitError(null);
    setLocationError(null);

    // Require authenticated citizen session
    if (!isAuthenticated || !user) {
      setSubmitError('Authentication required. Please sign in with your mobile OTP to file an official grievance.');
      navigate('/login/citizen', { state: { from: { pathname: '/submit' } } });
      return;
    }

    // Required fields validation
    if (!title.trim() || title.trim().length < 3) {
      setSubmitError('Issue title must be at least 3 characters long.');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setSubmitError('Detailed description must be at least 5 characters long.');
      return;
    }

    if (address.trim() && address.trim().length < 3) {
      setSubmitError('Address must be at least 3 characters long.');
      return;
    }

    // Location is mandatory
    if (!location || !location.latitude || !location.longitude) {
      setLocationError(
        'Please select a valid incident location by clicking on the map or using your current location.'
      );
      window.scrollTo({ top: 380, behavior: 'smooth' });
      return;
    }

    if (wardId === null || wardId < 1 || wardId > 75) {
      setLocationError(
        'Please select or verify your designated Jammu Municipal Ward (1-75) in the dropdown.'
      );
      window.scrollTo({ top: 480, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Run duplicate check if not already verified
      const dupCheck = await grievanceService.checkNearbyDuplicates(
        { latitude: location.latitude, longitude: location.longitude },
        category
      );
      if (dupCheck.isPotentialDuplicate && dupCheck.nearbyGrievances.length > 0 && !duplicateResult) {
        setDuplicateResult(dupCheck);
        setShowDuplicateModal(true);
        setIsSubmitting(false);
        return;
      }
    } catch (checkErr) {
      console.warn('Duplicate check skipped:', checkErr);
    }

    await executeCreate();
  };

  const executeCreate = async () => {
    if (!location || wardId === null) return;
    if (isSubmitting && submittedSuccess) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const generatedAddress =
        address.trim() || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;

      const payload: CreateGrievanceDTO = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        selectionMethod: location.selectionMethod,
        address: generatedAddress,
        landmark: landmark.trim() || undefined,
        wardId,
        imageUrl: imageUrl.trim() || undefined,
        isAnonymous,
      };

      const created = await grievanceService.createGrievance(payload);
      setCreatedTrackingNumber(created.trackingNumber);
      setSubmittedSuccess(true);
      setShowDuplicateModal(false);
    } catch (err: unknown) {
      console.error('Error submitting complaint:', err);
      if (err instanceof ApiError && err.status === 401) {
        setSubmitError('Your session has expired. Please log in again.');
        navigate('/login/citizen', { state: { from: { pathname: '/submit' } } });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to submit grievance. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupportExisting = async (grievanceId: string) => {
    setIsSubmitting(true);
    try {
      await grievanceService.supportGrievance(grievanceId);
      setShowDuplicateModal(false);
      navigate('/citizen');
    } catch (err) {
      console.error('Failed to support existing:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          Jammu Municipal Corporation (JMC) Citizen Desk
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">
          File a Municipal Grievance
        </h1>
        <p className="text-sm text-civic-secondary mt-1">
          Upload photo proof, pinpoint location on Jammu map or detect with GPS, and let spatial AI route your report to the designated field division.
        </p>
      </div>

      {submittedSuccess ? (
        <Card className="p-8 text-center space-y-5 border-teal-200 bg-white shadow-subtle">
          <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-navy-900">
              Grievance Registered Successfully!
            </h2>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-50 border border-navy-100">
              <span className="text-xs text-civic-secondary">Reference Tracking Number:</span>
              <span className="font-mono text-sm font-bold text-navy-900">
                {createdTrackingNumber || 'JMC-2026-ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-civic-secondary max-w-md mx-auto mt-2 leading-relaxed">
              Assigned to designated ward field queue. Recorded in Jammu Municipal Corporation database.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              to="/citizen"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <UserCheck className="w-4 h-4 text-teal-400" />
              <span>Go to Citizen Dashboard</span>
            </Link>

            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setTitle('');
                setDescription('');
                setAddress('');
                setLandmark('');
                setImageUrl('');
                setLocation(null);
                setWardId(null);
                setCreatedTrackingNumber(null);
                setSubmitError(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-navy-900 font-semibold text-xs transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-gray-500" />
              <span>File Another Grievance</span>
            </button>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submit Error Banner */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 flex items-center gap-3 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div className="flex-1">
                <span className="font-bold">Submission failed: </span>
                <span>{submitError}</span>
              </div>
            </div>
          )}

          {/* Category Selection */}
          <Card className="p-6 space-y-4">
            <label className="block text-sm font-semibold text-navy-900">
              1. Issue Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                    category === c.value
                      ? 'border-teal-500 bg-teal-50/50 text-navy-900 font-semibold ring-1 ring-teal-500 shadow-sm'
                      : 'border-civic-border bg-white text-civic-text hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-xs">{c.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Photo Proof */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-navy-900">
                2. Photographic Proof (Optional)
              </label>
              <span className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full font-medium">
                URL Supported
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="imageUrlInput" className="block text-xs font-medium text-navy-900 mb-1">
                  Image Web URL
                </label>
                <div className="relative">
                  <input
                    id="imageUrlInput"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/incident-photo.jpg"
                    className="w-full px-3 py-2 text-sm border border-civic-border rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-civic-border text-xs text-civic-secondary flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Notice:</strong> Server-side binary file upload storage is not configured in this release.
                  To attach photo evidence, provide a publicly accessible image web URL (PNG, JPG, WebP) above.
                </p>
              </div>

              {imageUrl.trim() && (
                <div className="w-full sm:w-64 h-36 rounded-lg overflow-hidden border border-civic-border relative group bg-gray-100">
                  <img
                    src={imageUrl.trim()}
                    alt="Image Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-medium">
                    Attached Photo Preview
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Location Selection with GPS and Interactive Map */}
          <Card className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-navy-900">
                3. Incident Location & Municipal Ward
              </label>
              <p className="text-xs text-civic-secondary mt-0.5">
                Detect your current location with GPS or select and drag a pin on the Jammu interactive map.
              </p>
            </div>

            <LocationPicker
              selectedLocation={location}
              onLocationChange={handleLocationChange}
              address={address}
              onAddressChange={setAddress}
              landmark={landmark}
              onLandmarkChange={setLandmark}
              wardId={wardId}
              onWardChange={handleWardChange}
              wardSource={wardSource}
              error={locationError}
            />
          </Card>

          {/* Details & Description */}
          <Card className="p-6 space-y-4">
            <label className="block text-sm font-semibold text-navy-900">
              4. Issue Details
            </label>
            <div>
              <label className="block text-xs font-medium text-navy-900 mb-1">
                Short Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep pothole damaging vehicles outside Gol Market"
                className="w-full px-3 py-2 text-sm border border-civic-border rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-navy-900 mb-1">
                Detailed Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the severity, duration, and safety hazards..."
                className="w-full px-3 py-2 text-sm border border-civic-border rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
                required
              />
            </div>
          </Card>

          {/* Citizen Reporter Info & Privacy */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-navy-900">
                5. Citizen Contact & Privacy
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-navy-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Report Anonymously
              </label>
            </div>

            {user ? (
              <div className="bg-gray-50/70 rounded-xl p-4 border border-civic-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-navy-900">
                      {isAnonymous ? 'Anonymous Citizen' : user.name || 'Citizen'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                      <UserCheck className="w-3 h-3 text-teal-600" />
                      Verified Citizen Session
                    </span>
                  </div>
                  <p className="text-xs text-civic-secondary">
                    {isAnonymous
                      ? 'Your personal identity is masked on public listings and visible only to assigned municipal engineers.'
                      : `SMS notifications and status updates will be routed to ${user.phone || user.phoneNumber}.`}
                  </p>
                </div>
                <div className="text-xs font-mono font-semibold text-navy-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200 self-start sm:self-auto">
                  {user.phone || user.phoneNumber}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <span className="font-semibold">Authentication Required:</span> Sign in with your mobile OTP to file a verified municipal grievance.
                  </span>
                </div>
                <Link
                  to="/login/citizen"
                  className="px-3.5 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded-lg font-semibold transition-colors whitespace-nowrap self-start sm:self-auto"
                >
                  Log In with OTP
                </Link>
              </div>
            )}
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting || !title.trim() || !description.trim() || !location || wardId === null}
            >
              Submit Grievance to JMC
            </Button>
          </div>
        </form>
      )}

      {/* Duplicate Prevention Prompt Modal */}
      {duplicateResult && (
        <DuplicateAlertModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          nearbyGrievances={duplicateResult.nearbyGrievances}
          distanceMeters={duplicateResult.distanceMeters}
          onSupportExisting={handleSupportExisting}
          onProceedWithNew={executeCreate}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};
