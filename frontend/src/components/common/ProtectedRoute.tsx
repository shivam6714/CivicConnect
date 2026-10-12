import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-civic-bg">
        <div className="flex flex-col items-center gap-3 text-xs text-civic-secondary">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect unauthenticated user to their dedicated login entry point
    const targetLogin = location.pathname.startsWith('/admin') ? '/login/admin' : '/login/citizen';
    return <Navigate to={targetLogin} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role mismatch: redirect appropriately
    if (user.role === 'CITY_ADMIN' || user.role === 'MUNICIPAL_OFFICER') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/citizen" replace />;
    }
  }

  return <Outlet />;
};
