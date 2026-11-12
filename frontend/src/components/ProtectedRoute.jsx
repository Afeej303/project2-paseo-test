import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Spinner from './ui/Spinner';
import useAuth from '../hooks/useAuth';
import { getRoleHome } from '../services/navigation';

const ProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="route-loading" aria-live="polite">
        <Spinner size={36} label="Checking your session" />
        <span>Checking your session…</span>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
