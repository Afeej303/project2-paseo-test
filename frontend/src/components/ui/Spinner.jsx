import React from 'react';
import './Spinner.css';

const Spinner = ({ size = 24 }) => {
  return (
    <div className="spinner" style={{ width: size, height: size }} />
  );
};

export default Spinner;