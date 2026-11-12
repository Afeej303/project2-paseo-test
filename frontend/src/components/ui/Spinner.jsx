import React from 'react';
import './Spinner.css';

const Spinner = ({ size = 24, label = 'Loading' }) => (
  <span
    className="spinner"
    style={{ width: size, height: size }}
    role="status"
    aria-label={label}
  />
);

export default Spinner;
