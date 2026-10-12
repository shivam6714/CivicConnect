import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Map as MapIcon,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Building2,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login/admin');
  };

  const navItems = [
    { name: 'Overview', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, end: true },
    { name: 'All Grievances', path: '/admin/grievances', icon: <ClipboardList className="w-5 h-5" /> },
    { name: 'Ward Map', path: '/admin/map', icon: <MapIcon className="w-5 h-5" /> },
    { name: 'Activity History', path: '/admin/activity', icon: <History className="w-5 h-5" /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Municipal Operations Overview';
    if (path.includes('/admin/grievances')) return 'Grievance Central Repository';
    if (path.includes('/admin/map')) return 'Geospatial Ward Intelligence';
    if (path.includes('/admin/activity')) return 'System Audit & Activity History';
    if (path.includes('/admin/settings')) return 'Administration Settings';
    return 'Admin Dashboard';
  };

  return (
    <div className="min-h-screen bg-civic-bg flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-civic-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 rounded-lg text-civic-secondary hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-7 h-7 rounded-lg bg-navy-900 text-teal-400 font-extrabold flex items-center justify-center text-xs">
            CC
          </div>
          <span className="font-bold text-navy-900 text-sm">CivicConnect Admin</span>
        </div>

        {/* Role badge for mobile */}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
          City Admin
        </span>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-navy-900/50 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-civic-border transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } md:static md:translate-x-0`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-civic-border flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-navy-900 text-teal-400 font-extrabold flex items-center justify-center text-sm shadow-2xs flex-shrink-0">
              CC
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-bold text-navy-900 text-sm tracking-tight block">
                  CivicConnect
                </span>
                <span className="text-[10px] font-semibold text-teal-700 tracking-wider uppercase block">
                  Jammu Municipal Corp
                </span>
              </div>
            )}
          </div>
          {/* Collapse Toggle for Desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-navy-900 hover:bg-gray-100 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Centralized Scope Badge in Sidebar */}
        {!collapsed && (
          <div className="p-3 m-3 rounded-xl bg-navy-50/70 border border-navy-100/80">
            <div className="flex items-center gap-2 text-xs font-bold text-navy-900">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>City-Wide Oversight</span>
            </div>
            <p className="text-[11px] text-civic-secondary mt-1">
              Centralized municipal administration across all 75 JMC wards.
            </p>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'text-civic-secondary hover:text-navy-900 hover:bg-gray-100/70'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.name : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom User Profile & Sign Out */}
        <div className="p-3 border-t border-civic-border">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <div className="truncate pr-2">
                <p className="text-xs font-bold text-navy-900 truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[11px] text-civic-secondary truncate">{user?.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Desktop Bar */}
        <header className="h-16 bg-white border-b border-civic-border px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div>
            <h1 className="text-base font-bold text-navy-900">{getPageTitle()}</h1>
            <p className="text-xs text-civic-secondary hidden sm:block">
              Centralized Municipal Database — City of Jammu (All 75 Wards)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Centralized Municipal Scope Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 text-xs font-semibold shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline text-gray-500 font-medium">Administration:</span>
              <span className="font-bold text-teal-900">City Admin (All 75 Wards)</span>
            </div>

            {/* Notification Control */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg text-gray-400 hover:text-navy-900 hover:bg-gray-100 transition-colors"
                title="System Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-civic-border p-3 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs font-bold text-navy-900">
                    <span>Notifications</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="py-6 text-center text-xs text-civic-secondary space-y-1">
                    <p className="font-semibold text-navy-900">You're all caught up.</p>
                    <p className="text-[11px] text-gray-400">No pending municipal alert notifications.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
