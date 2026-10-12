import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_CITIZEN_ACCOUNT } from '../data/mockUsers';

export const CitizenLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestCitizenOtp, verifyCitizenOtp, isLoading } = useAuth();

  // Initialized with mock citizen credentials for seamless testing
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState(DEMO_CITIZEN_ACCOUNT.phone);
  const [otp, setOtp] = useState(DEMO_CITIZEN_ACCOUNT.demoOtp);

  // Flow states
  const [otpSent, setOtpSent] = useState(true);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(
    `Prototype mock session active. Verification OTP preloaded (${DEMO_CITIZEN_ACCOUNT.demoOtp}).`
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFillDemoCitizen = () => {
    setMobileNumber(DEMO_CITIZEN_ACCOUNT.phone);
    setOtp(DEMO_CITIZEN_ACCOUNT.demoOtp);
    setOtpSent(true);
    setOtpMessage(`Mock OTP auto-loaded (${DEMO_CITIZEN_ACCOUNT.demoOtp}) for Anil Sharma.`);
    setErrorMessage(null);
  };

  const handleSendOtp = async () => {
    setErrorMessage(null);
    setOtpMessage(null);

    const clean = mobileNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSendingOtp(true);
    try {
      await requestCitizenOtp(clean);
      setOtpSent(true);
      setOtp(DEMO_CITIZEN_ACCOUNT.demoOtp);
      setOtpMessage(
        `A 6-digit verification code has been dispatched to ${countryCode} ${clean} (Prototype OTP: ${DEMO_CITIZEN_ACCOUNT.demoOtp}).`
      );
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to dispatch OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = mobileNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setErrorMessage('Please enter your 10-digit mobile number.');
      return;
    }

    if (!otp.trim()) {
      setErrorMessage('Please enter the 6-digit OTP code received on your mobile.');
      return;
    }

    try {
      await verifyCitizenOtp(clean, otp.trim());
      navigate('/citizen', { replace: true });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Verification failed. Please check the code and try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-civic-bg">
      <div className="w-full max-w-md mx-auto">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-civic-secondary hover:text-navy-900 transition-colors mb-6 group min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </Link>

        {/* Header & Wordmark */}
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
            Log in via Mobile OTP to file civic grievances and track resolution status.
          </p>
        </div>

        {/* Mock Citizen Credentials Helper Panel */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-teal-900 to-navy-900 text-white shadow-card border border-teal-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Mock Citizen Login Data</span>
            </div>
            <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded">
              Prototype Mode
            </span>
          </div>

          <p className="text-[11px] text-teal-100 leading-relaxed">
            FastAPI backend & SMS gateway in progress. Click to load verified mock citizen credentials:
          </p>

          <button
            type="button"
            onClick={handleFillDemoCitizen}
            className="w-full p-2.5 rounded-xl border border-teal-500/40 bg-white/10 hover:bg-white/15 text-left transition-all flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-white block">Citizen: {DEMO_CITIZEN_ACCOUNT.user.name}</span>
              <span className="font-mono text-[11px] text-teal-200 mt-0.5 block">
                Mobile: +91 {DEMO_CITIZEN_ACCOUNT.phone} &bull; OTP: {DEMO_CITIZEN_ACCOUNT.demoOtp}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300 bg-teal-500/20 px-2.5 py-1 rounded-lg border border-teal-400/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Auto-Fill</span>
            </div>
          </button>
        </div>

        {/* Form Card */}
        <div className="mt-4 bg-white py-6 sm:py-8 px-5 sm:px-8 shadow-subtle rounded-2xl border border-civic-border">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Error</p>
                <p className="mt-0.5 text-red-600 leading-normal">{errorMessage}</p>
              </div>
            </div>
          )}

          {otpMessage && !errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-teal-600 mt-0.5" />
              <div>
                <p className="font-semibold">Mock OTP Active</p>
                <p className="mt-0.5 text-teal-800 leading-normal">{otpMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4" noValidate>
            {/* Mobile Number with Country Code */}
            <div>
              <label
                htmlFor="mobileNumber"
                className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5"
              >
                Registered Mobile Number
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 text-xs sm:text-sm py-2.5 px-2 bg-gray-50 border border-civic-border rounded-lg text-navy-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium min-h-[44px]"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                </select>

                <div className="relative flex-1 rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-civic-secondary">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <input
                    id="mobileNumber"
                    type="tel"
                    maxLength={10}
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="block w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white border border-civic-border rounded-lg text-navy-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Send OTP button or status */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[44px]"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                <span>{otpSent ? 'Resend Verification Code' : 'Send One-Time Password (OTP)'}</span>
              </button>
            </div>

            {/* 6-Digit OTP Field */}
            <div>
              <label
                htmlFor="otpCode"
                className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5"
              >
                6-Digit Verification Code (OTP)
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="block w-full px-3 py-2.5 text-center text-sm sm:text-base tracking-widest bg-white border border-civic-border rounded-lg text-navy-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono font-bold min-h-[44px]"
                />
              </div>
            </div>

            {/* Verify & Continue Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify and Continue to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Privacy Note */}
          <div className="mt-5 pt-4 border-t border-civic-border">
            <p className="text-[11px] sm:text-xs text-civic-secondary leading-relaxed">
              <strong>Simulated OTP:</strong> Uses in-memory verification. Real SMS dispatch will be activated with Twilio / CDAC SMS Gateway on FastAPI deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
