import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Spinner from './ui/Spinner';
import useAuth from '../hooks/useAuth';
import { getRoleHome } from '../services/navigation';

const PublicOnlyRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="route-loading" aria-live="polite">
        <Spinner size={36} label="Checking your session" />
      </main>
    );
  }

  return user ? <Navigate to={getRoleHome(user.role)} replace /> : <Outlet />;
};

export default PublicOnlyRoute;
