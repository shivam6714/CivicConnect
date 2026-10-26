import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading, switchToCitizen } = useAuth();
  const location = useLocation();

  const isSwitchingToCitizen =
    location.pathname.startsWith('/citizen') &&
    user !== null &&
    (user.role === 'CITY_ADMIN' || user.role === 'MUNICIPAL_OFFICER');

  React.useEffect(() => {
    if (isSwitchingToCitizen) {
      switchToCitizen();
    }
  }, [isSwitchingToCitizen, switchToCitizen]);

  if (isLoading || isSwitchingToCitizen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-civic-bg">
        <div className="flex flex-col items-center gap-3 text-xs text-civic-secondary">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span>{isSwitchingToCitizen ? 'Switching to Citizen Portal...' : 'Verifying session...'}</span>
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
    // Role mismatch:
    // If a citizen tries to access admin routes, keep admin protected and redirect to /citizen
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/citizen" replace />;
    }
    // If an officer tries to access citizen routes, switch to citizen immediately
    if (location.pathname.startsWith('/citizen')) {
      switchToCitizen();
      return null;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
