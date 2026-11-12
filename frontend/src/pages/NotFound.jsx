import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <main className="empty-page">
    <span className="eyebrow">404</span>
    <h1>That page is not available.</h1>
    <p>Return to the platform and continue from your dashboard.</p>
    <Link className="text-link" to="/">Go to dashboard</Link>
  </main>
);

export default NotFound;
