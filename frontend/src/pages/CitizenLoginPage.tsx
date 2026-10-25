import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Terminal,
  User,
  Building,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidIndianMobile, extractTenDigitMobile } from '../services/authService';
import { JAMMU_WARDS } from '../data/jammuWards';

type AuthStep = 'PHONE' | 'OTP';

export const CitizenLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestCitizenOtp, verifyCitizenOtp } = useAuth();

  // Current step in authentication flow
  const [step, setStep] = useState<AuthStep>('PHONE');

  // Input fields
  const [countryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [wardNumber, setWardNumber] = useState<number | ''>('');
  const [otp, setOtp] = useState('');

  // Expandable profile fields in Step A
  const [showOptionalProfile, setShowOptionalProfile] = useState(false);

  // Flow & Submission States
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Status & Error Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Field validation error states
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Refs
  const otpInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Cooldown countdown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus OTP input when advancing to Step B
  useEffect(() => {
    if (step === 'OTP') {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  // Derived validation
  const cleanPhone = extractTenDigitMobile(mobileNumber);
  const isPhoneValid = isValidIndianMobile(mobileNumber) && cleanPhone.length === 10;
  const isOtpValid = /^\d{6}$/.test(otp.trim());

  // Fill quick demo number for developer convenience
  const handleFillDemoNumber = (number: string) => {
    setMobileNumber(number);
    setPhoneTouched(true);
    setErrorMessage(null);
  };

  // STEP A: Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setPhoneTouched(true);

    if (!isPhoneValid) {
      setErrorMessage(
        'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).'
      );
      phoneInputRef.current?.focus();
      return;
    }

    if (cooldown > 0) {
      setErrorMessage(`Please wait ${cooldown} seconds before requesting a new OTP code.`);
      return;
    }

    setIsRequestingOtp(true);
    try {
      const response = await requestCitizenOtp(cleanPhone);
      setStep('OTP');
      setCooldown(response.cooldownSeconds || 60);
      setStatusMessage(
        response.message || 'A 6-digit verification code has been generated.'
      );
    } catch (err: unknown) {
      const error = err as Error & { details?: { retryAfter?: number } };
      setErrorMessage(error.message || 'Failed to request verification code. Please try again.');
      if (error.details?.retryAfter) {
        setCooldown(error.details.retryAfter);
      }
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Resend OTP in Step B
  const handleResendOtp = async () => {
    if (cooldown > 0 || isRequestingOtp) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setIsRequestingOtp(true);
    try {
      const response = await requestCitizenOtp(cleanPhone);
      setCooldown(response.cooldownSeconds || 60);
      setOtp('');
      setStatusMessage(response.message || 'A new verification code has been generated.');
      otpInputRef.current?.focus();
    } catch (err: unknown) {
      const error = err as Error & { details?: { retryAfter?: number } };
      setErrorMessage(error.message || 'Failed to resend code.');
      if (error.details?.retryAfter) {
        setCooldown(error.details.retryAfter);
      }
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // STEP B: Verify OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = otp.replace(/\D/g, '').trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      otpInputRef.current?.focus();
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await verifyCitizenOtp(
        cleanPhone,
        cleanCode,
        fullName.trim() || undefined,
        typeof wardNumber === 'number' ? wardNumber : undefined
      );

      // Navigate directly to citizen portal dashboard upon verification
      navigate('/citizen', { replace: true });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(
        error.message || 'Invalid or expired verification code. Please check the code and try again.'
      );
      otpInputRef.current?.select();
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Return to Step A
  const handleReturnToPhone = () => {
    setStep('PHONE');
    setOtp('');
    setErrorMessage(null);
    setStatusMessage(null);
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-civic-bg">
      <div className="w-full max-w-md mx-auto">
        {/* Navigation & Header */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-civic-secondary hover:text-navy-900 transition-colors mb-6 group min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </Link>

        {/* Civic Wordmark & Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 font-extrabold text-xl shadow-subtle mb-3 border border-teal-100">
            <Users className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            Citizen Grievance Desk
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy-900">
            Citizen Sign In
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-civic-secondary leading-relaxed">
            {step === 'PHONE'
              ? 'Enter your mobile number to receive a secure One-Time Password (OTP).'
              : 'Enter the 6-digit verification code to complete sign in.'}
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === 'PHONE'
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'bg-teal-100 text-teal-700'
              }`}
            >
              1
            </span>
            <span
              className={`text-xs font-semibold ${
                step === 'PHONE' ? 'text-navy-900' : 'text-gray-400'
              }`}
            >
              Mobile Number
            </span>
          </div>

          <div className="w-8 h-0.5 bg-gray-200" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === 'OTP'
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              2
            </span>
            <span
              className={`text-xs font-semibold ${
                step === 'OTP' ? 'text-navy-900' : 'text-gray-400'
              }`}
            >
              Verify OTP
            </span>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="mt-6 bg-white py-6 sm:py-8 px-5 sm:px-8 shadow-subtle rounded-2xl border border-civic-border">
          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Error</p>
                <p className="mt-0.5 text-red-600 leading-normal">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Status / Success Message Alert */}
          {statusMessage && !errorMessage && (
            <div
              role="status"
              className="mb-5 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-teal-600 mt-0.5" />
              <div>
                <p className="font-semibold">Request Processed</p>
                <p className="mt-0.5 text-teal-800 leading-normal">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* STEP A: MOBILE NUMBER ENTRY */}
          {step === 'PHONE' && (
            <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="citizenMobile"
                  className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5"
                >
                  Indian Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="w-24 flex items-center justify-center text-xs sm:text-sm py-2.5 px-2 bg-gray-50 border border-civic-border rounded-lg text-navy-900 font-semibold select-none min-h-[44px]">
                    🇮🇳 {countryCode}
                  </div>

                  <div className="relative flex-1 rounded-lg shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-civic-secondary">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <input
                      ref={phoneInputRef}
                      id="citizenMobile"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      required
                      value={mobileNumber}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setMobileNumber(digits);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onBlur={() => setPhoneTouched(true)}
                      placeholder="10-digit mobile number"
                      className={`block w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white border rounded-lg text-navy-900 placeholder-gray-400 focus:outline-none focus:ring-2 font-mono min-h-[44px] ${
                        phoneTouched && !isPhoneValid && mobileNumber.length > 0
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-civic-border focus:ring-teal-500 focus:border-teal-500'
                      }`}
                    />
                  </div>
                </div>

                {phoneTouched && mobileNumber.length > 0 && !isPhoneValid && (
                  <p className="mt-1.5 text-xs text-red-600">
                    Please enter a valid 10-digit Indian mobile number (e.g., 9103009286).
                  </p>
                )}
              </div>

              {/* Collapsible Optional Citizen Details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowOptionalProfile(!showOptionalProfile)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors py-1 focus:outline-none"
                >
                  <Info className="w-3.5 h-3.5 text-teal-600" />
                  <span>
                    {showOptionalProfile
                      ? 'Hide Optional Profile Info'
                      : 'Add Name & Ward Number (Optional)'}
                  </span>
                </button>

                {showOptionalProfile && (
                  <div className="mt-3 p-3.5 rounded-xl bg-gray-50 border border-civic-border space-y-3 animate-fadeIn">
                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="citizenFullName"
                        className="block text-[11px] font-semibold text-navy-900 uppercase tracking-wider mb-1"
                      >
                        Full Name (Optional)
                      </label>
                      <div className="relative rounded-lg shadow-2xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-civic-secondary">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <input
                          id="citizenFullName"
                          type="text"
                          maxLength={100}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Sunil Kumar"
                          className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-civic-border rounded-lg text-navy-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    {/* Ward Number */}
                    <div>
                      <label
                        htmlFor="citizenWard"
                        className="block text-[11px] font-semibold text-navy-900 uppercase tracking-wider mb-1"
                      >
                        Jammu Ward (1–75, Optional)
                      </label>
                      <div className="relative rounded-lg shadow-2xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-civic-secondary">
                          <Building className="h-3.5 w-3.5" />
                        </div>
                        <select
                          id="citizenWard"
                          value={wardNumber}
                          onChange={(e) =>
                            setWardNumber(e.target.value ? Number(e.target.value) : '')
                          }
                          className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-civic-border rounded-lg text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value="">Select Jammu Ward (Optional)</option>
                          {JAMMU_WARDS.map((w) => (
                            <option key={w.number} value={w.number}>
                              Ward {w.number}: {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isRequestingOtp || (phoneTouched && !isPhoneValid) || mobileNumber.length < 10}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isRequestingOtp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Requesting OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Quick Test Helper for Developer Testing */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-[11px] text-civic-secondary">
                  <span>Quick test number:</span>
                  <button
                    type="button"
                    onClick={() => handleFillDemoNumber('9103009286')}
                    className="font-mono text-teal-700 hover:text-teal-900 font-semibold underline"
                  >
                    9103009286
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP B: 6-DIGIT OTP ENTRY */}
          {step === 'OTP' && (
            <form onSubmit={handleVerify} className="space-y-4" noValidate>
              {/* Target Phone & Change Number option */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-civic-border">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">
                      Code Sent To
                    </span>
                    <span className="text-xs font-mono font-bold text-navy-900">
                      +91 {cleanPhone}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReturnToPhone}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors p-1"
                  title="Change mobile number"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Dev Notice: Mock OTP is in backend terminal */}
              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-teal-400 font-semibold text-[11px]">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Development Terminal Notice</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  During development, the mock SMS gateway does not dispatch real cellular SMS.
                  Your 6-digit code has been output to the <strong>backend server terminal</strong>.
                </p>
              </div>

              {/* 6-Digit OTP Field */}
              <div>
                <label
                  htmlFor="otpCode"
                  className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5"
                >
                  6-Digit Verification Code <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <input
                    ref={otpInputRef}
                    id="otpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(clean);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••"
                    className="block w-full px-3 py-3 text-center text-lg sm:text-xl tracking-[0.4em] bg-white border border-civic-border rounded-lg text-navy-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono font-bold min-h-[44px]"
                  />
                </div>
              </div>

              {/* Resend OTP Button with Cooldown Timer */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isRequestingOtp}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRequestingOtp ? 'animate-spin' : ''}`} />
                  <span>
                    {cooldown > 0
                      ? `Resend code in ${cooldown}s`
                      : 'Resend Verification Code'}
                  </span>
                </button>
              </div>

              {/* Verify & Continue Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifyingOtp || !isOtpValid}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isVerifyingOtp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue to Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Privacy & Security Note */}
          <div className="mt-5 pt-4 border-t border-civic-border">
            <p className="text-[11px] text-civic-secondary leading-relaxed">
              <strong>Jammu Municipal Corporation (JMC):</strong> OTP verification provisions a secure,
              authenticated citizen session. Never share your verification codes with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
