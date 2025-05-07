import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { UserRole } from '../../../../backend/src/functionalities/user/models'; // Adjust path as needed

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]; // Roles allowed to access this route
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show loading indicator while auth state is being determined
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated, saving the intended location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check roles if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      // User is authenticated but doesn't have the required role
      // Redirect to a 'forbidden' page or dashboard
      console.warn(`Access denied to ${location.pathname} for role: ${userRole}`);
      // You could navigate to a dedicated /forbidden page or just the dashboard
      return <Navigate to="/" replace />;
    }
  }

  // User is authenticated and has the required role (if specified)
  return <Outlet />; // Render the child route components
};

export default ProtectedRoute;