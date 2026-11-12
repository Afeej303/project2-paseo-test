import React from 'react';
import './Alert.css';

const Alert = ({ type = 'info', children }) => {
  const role = type === 'error' ? 'alert' : 'status';
  return <div className={`alert alert-${type}`} role={role}>{children}</div>;
};

export default Alert;
