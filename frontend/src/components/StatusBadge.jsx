import React from 'react';

const StatusBadge = ({ value }) => (
  <span className={`status-badge status-${String(value || 'unknown').replaceAll('_', '-')}`}>
    {String(value || 'unknown').replaceAll('_', ' ')}
  </span>
);

export default StatusBadge;
