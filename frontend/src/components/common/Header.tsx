import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  FilePlus,
  LayoutDashboard,
  Map as MapIcon,
  BarChart3,
  Menu,
  X,
  ShieldCheck,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Overview', path: '/', icon: <Compass className="w-4 h-4" /> },
    { name: 'Citizen Portal', path: '/citizen', icon: <UserCheck className="w-4 h-4" /> },
    { name: 'Report Issue', path: '/submit', icon: <FilePlus className="w-4 h-4" /> },
    { name: 'Municipal Triage', path: '/triage', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Geospatial Map', path: '/map', icon: <MapIcon className="w-4 h-4" /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-civic-border shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Civic Identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-navy-900 text-teal-400 flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-navy-800 transition-colors">
              <span className="text-teal-400 font-extrabold tracking-tighter">CC</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-navy-900 tracking-tight">
                  CivicConnect
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  <ShieldCheck className="w-3 h-3 text-teal-600" />
                  Jammu Municipal Corporation
                </span>
              </div>
              <p className="text-[11px] text-civic-secondary hidden md:block">
                AI Grievance Triage & Resolution Platform
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-navy-50 text-navy-900 font-semibold'
                      : 'text-civic-secondary hover:text-navy-900 hover:bg-gray-50'
                  }`}
                >
                  <span className={active ? 'text-teal-600' : 'text-gray-400'}>
                    {link.icon}
                  </span>
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Action Button & Auth Controls */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/submit"
              className="hidden sm:inline-flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-subtle"
            >
              <FilePlus className="w-3.5 h-3.5" />
              File Grievance
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                {(user.role === 'CITY_ADMIN' || user.role === 'MUNICIPAL_OFFICER') ? (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-teal-400" />
                    <span>Admin Console</span>
                  </Link>
                ) : (
                  <Link
                    to="/citizen"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-50 hover:bg-navy-100 text-navy-900 text-xs font-semibold transition-colors"
                  >
                    <span>My Dashboard</span>
                  </Link>
                )}
                <button
                  onClick={() => logout()}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login/citizen"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-civic-border bg-white hover:bg-gray-50 text-navy-900 text-xs font-semibold transition-colors shadow-2xs"
              >
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-civic-secondary hover:text-navy-900 hover:bg-gray-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-civic-border bg-white px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'bg-navy-50 text-navy-900 font-semibold'
                    : 'text-civic-secondary hover:text-navy-900 hover:bg-gray-50'
                }`}
              >
                <span className={active ? 'text-teal-600' : 'text-gray-400'}>
                  {link.icon}
                </span>
                {link.name}
              </Link>
            );
          })}
          <div className="pt-2 space-y-2">
            <Link
              to="/submit"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-subtle"
            >
              <FilePlus className="w-4 h-4" />
              File Grievance
            </Link>
            {!user && (
              <Link
                to="/login/citizen"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-navy-50 hover:bg-navy-100 text-navy-900 text-sm font-semibold px-4 py-2.5 rounded-lg border border-civic-border"
              >
                <UserCheck className="w-4 h-4 text-teal-600" />
                Citizen Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
