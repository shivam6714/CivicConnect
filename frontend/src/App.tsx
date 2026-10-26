import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public & Portal Pages
import { HomePage } from './pages/HomePage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { CitizenLoginPage } from './pages/CitizenLoginPage';
import { SubmitGrievancePage } from './pages/SubmitGrievancePage';
import { CitizenDashboardPage } from './pages/citizen/CitizenDashboardPage';
import { TriageDashboardPage } from './pages/TriageDashboardPage';
import { MapViewPage } from './pages/MapViewPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

// Admin Console Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminGrievancesPage } from './pages/admin/AdminGrievancesPage';
import { AdminMapPage } from './pages/admin/AdminMapPage';
import { AdminActivityPage } from './pages/admin/AdminActivityPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login Landing & Dedicated Flows */}
          <Route path="/login" element={<Navigate to="/login/citizen" replace />} />
          <Route path="/login/admin" element={<AdminLoginPage />} />
          <Route path="/login/citizen" element={<CitizenLoginPage />} />

          {/* Public & Citizen Portal Experience */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="submit" element={<SubmitGrievancePage />} />
            <Route path="triage" element={<TriageDashboardPage />} />
            <Route path="map" element={<MapViewPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />

            {/* Protected Citizen Dashboard Route - Strictly for Citizens */}
            <Route element={<ProtectedRoute allowedRoles={['CITIZEN']} />}>
              <Route path="citizen" element={<CitizenDashboardPage />} />
            </Route>
          </Route>

          {/* Protected Municipal Administration Console (Centralized City Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['CITY_ADMIN', 'MUNICIPAL_OFFICER']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="grievances" element={<AdminGrievancesPage />} />
              <Route path="map" element={<AdminMapPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
