import React from 'react';
import './Input.css';

const Input = ({ label, id, ...props }) => {
  return (
    <div className="input-group">
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} className="input-field" {...props} />
    </div>
  );
};

export default Input;
