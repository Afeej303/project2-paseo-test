import React from 'react';
import Alert from './ui/Alert';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

const AsyncState = ({ loading, error, empty, emptyMessage, onRetry, children }) => {
  if (loading) {
    return <div className="loading-state" aria-live="polite"><Spinner size={32} /><span>Loading…</span></div>;
  }

  if (error) {
    return (
      <div>
        <Alert type="error">{error}</Alert>
        {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
      </div>
    );
  }

  if (empty) {
    return <div className="empty-state"><p>{emptyMessage}</p></div>;
  }

  return children;
};

export default AsyncState;
