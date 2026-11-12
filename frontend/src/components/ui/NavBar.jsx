import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Nav.css';
import { getRoleHome } from '../../services/navigation';

const linksByRole = {
  factory: [
    ['/dashboard/factory', 'Dashboard'],
    ['/dashboard/factory/profile', 'Profile'],
    ['/dashboard/factory/machines', 'Machines'],
    ['/dashboard/factory/faults/new', 'Report fault'],
    ['/dashboard/factory/technicians', 'Find technicians'],
  ],
  technician: [
    ['/dashboard/technician', 'Jobs'],
    ['/dashboard/technician/profile', 'Profile & availability'],
  ],
  admin: [
    ['/dashboard/admin', 'Admin dashboard'],
  ],
};

const NavBar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const links = user ? linksByRole[user.role] || [] : [];

  const handleLogout = async () => {
    await onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="navbar">
      <NavLink to={user ? getRoleHome(user.role) : '/login'} className="navbar-logo">RepairLink</NavLink>
      <nav className="navbar-links" aria-label="Primary navigation">
        {links.map(([to, label]) => <NavLink key={to} to={to} end className={({ isActive }) => `navbar-link${isActive ? ' navbar-link-active' : ''}`}>{label}</NavLink>)}
        {user && <NavLink to="/notifications" className={({ isActive }) => `navbar-link${isActive ? ' navbar-link-active' : ''}`}>Notifications</NavLink>}
      </nav>
      {user && <div className="navbar-account"><span className="navbar-user">{user.email}</span><button type="button" onClick={handleLogout} className="navbar-button">Log out</button></div>}
    </header>
  );
};

export default NavBar;
