import React from 'react';
import './Table.css';

const Table = ({ columns, data }) => {
  if (!data || data.length === 0) {
    return <p>No data available</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map(col => <th key={col}>{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;