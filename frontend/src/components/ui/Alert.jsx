import React from 'react';
import './Alert.css';

const Alert = ({ type = 'info', children }) => {
  return (
    <div className={`alert alert-${type}`}>
      {children}
    </div>
  );
};

export default Alert;
