import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Lock,
  Mail,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAdmin, isLoading } = useAuth();

  // Initialized with mock credentials for easy testing until backend is ready
  const [adminId, setAdminId] = useState('cityadmin@civicconnect.demo');
  const [password, setPassword] = useState('CityAdmin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFillCredentials = (id: string, pass: string) => {
    setAdminId(id);
    setPassword(pass);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminId.trim()) {
      setErrorMessage('Please enter your Admin ID.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      await loginAdmin(adminId.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Authentication failed. Please check your credentials.');
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-navy-900 text-teal-400 font-extrabold text-xl shadow-subtle mb-3">
            CC
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-50 border border-navy-100 text-navy-900 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            Municipal Administration Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy-900">
            Admin Sign In
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-civic-secondary leading-relaxed">
            Authorized municipal officers and city administrators.
          </p>
        </div>

        {/* Mock Login Credentials Helper Panel */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 text-white shadow-card border border-navy-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Mock Login Credentials</span>
            </div>
            <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded">
              Prototype Mode
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            FastAPI backend is in development. Click below to auto-fill mock credentials:
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleFillCredentials('cityadmin@civicconnect.demo', 'CityAdmin123!')}
              className={`w-full p-3 rounded-xl border text-left transition-all ${
                adminId === 'cityadmin@civicconnect.demo'
                  ? 'border-teal-400 bg-white/15 ring-1 ring-teal-400 text-white'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">City Admin</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-300 bg-teal-500/20 px-2 py-0.5 rounded border border-teal-400/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Auto-Fill
                </span>
              </div>
              <p className="font-mono text-[11px] text-teal-300 mt-1">Admin ID: cityadmin@civicconnect.demo</p>
              <p className="font-mono text-[11px] text-slate-400">Password: CityAdmin123!</p>
            </button>
          </div>
        </div>

        {/* Login Form Card */}
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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Admin ID Field */}
            <div>
              <label
                htmlFor="adminId"
                className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5"
              >
                Admin ID / Official Identifier
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-civic-secondary">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="adminId"
                  type="text"
                  autoComplete="username"
                  required
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="e.g. cityadmin@civicconnect.demo"
                  className="block w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-white border border-civic-border rounded-lg text-navy-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors min-h-[44px]"
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-civic-secondary">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-11 py-2.5 text-xs sm:text-sm bg-white border border-civic-border rounded-lg text-navy-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-civic-secondary hover:text-navy-900 focus:outline-none min-w-[44px] justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-navy-900 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating admin...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Provisioning Notice */}
          <div className="mt-5 pt-4 border-t border-civic-border">
            <p className="text-[11px] sm:text-xs text-civic-secondary leading-relaxed">
              <strong>Simulated Session:</strong> Authenticates instantly via the frontend mock authentication fixture layer. Connects seamlessly with the upcoming FastAPI endpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
