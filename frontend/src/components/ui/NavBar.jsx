import React from 'react';
import './Nav.css';
import { Link, useNavigate } from 'react-router-dom';

const NavBar = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">Repair Platform</Link>
      </div>
      <div className="navbar-links">
        {user ? (
          <>
            <span className="navbar-user">Welcome, {user.role}</span>
            <Link to="/dashboard" className="navbar-link">Dashboard</Link>
            <button onClick={handleLogout} className="navbar-button">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">Login</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default NavBar;