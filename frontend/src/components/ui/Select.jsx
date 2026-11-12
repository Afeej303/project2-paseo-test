import React from 'react';
import './Select.css';

const Select = ({ label, id, options = [], value, onChange, ...props }) => {
  return (
    <div className="select-group">
      {label && <label htmlFor={id}>{label}</label>}
      <select id={id} className="select-field" value={value} onChange={onChange} {...props}>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
};

export default Select;