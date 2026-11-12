import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './ui/NavBar';
import useAuth from '../hooks/useAuth';

const AppLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <NavBar user={user} onLogout={logout} />
      <main className="main-content" id="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
