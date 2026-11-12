import React from 'react';
import { Card, Button, Input } from './index';
import api from '../../services/api';

const QuotationForm = ({ repairRequestId, onSubmit }) => {
  const [formData, setFormData] = React.useState({
    estimatedCost: '',
    estimatedDuration: '',
    partsNeeded: '',
    notes: ''
  });
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/repair-requests/${repairRequestId}/quotation`, formData);
      onSubmit?.(res.data.data);
    } catch {
      console.error('Failed to submit quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Submit Quotation">
      <Input label="Estimated Cost ($)" value={formData.estimatedCost} onChange={e => setFormData({...formData, estimatedCost: e.target.value})} />
      <Input label="Estimated Duration (hours)" value={formData.estimatedDuration} onChange={e => setFormData({...formData, estimatedDuration: e.target.value})} />
      <Input label="Parts Needed (comma separated)" value={formData.partsNeeded} onChange={e => setFormData({...formData, partsNeeded: e.target.value})} />
      <Input label="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
      <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</Button>
    </Card>
  );
};

export default QuotationForm;