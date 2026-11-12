import React, { useCallback, useState } from 'react';
import api, { getApiError } from '../../services/api';
import useApiResource from '../../hooks/useApiResource';
import PageHeader from '../../components/PageHeader';
import AsyncState from '../../components/AsyncState';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/StatusBadge';

const specializations = ['electrical', 'mechanical', 'CNC', 'PLC', 'robotics', 'HVAC', 'hydraulics', 'pneumatics', 'welding', 'other'];

const TechnicianDiscovery = () => {
  const [filters, setFilters] = useState({ specialization: '', coordinates: '', radius: '50', available: true, emergency: false });
  const [query, setQuery] = useState(filters);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [selectedFault, setSelectedFault] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    const params = {};
    if (query.specialization) params.specialization = query.specialization;
    if (query.coordinates) params.coordinates = query.coordinates;
    if (query.radius) params.radius = query.radius;
    if (query.available) params.available = 'true';
    if (query.emergency) params.emergency = 'true';
    const [techniciansResponse, faultsResponse] = await Promise.all([
      api.get('/technicians', { params }),
      api.get('/fault-reports'),
    ]);
    return { technicians: techniciansResponse.data.data || [], faults: faultsResponse.data.data || [] };
  }, [query]);

  const { data, loading, error, reload } = useApiResource(loadData);
  const technicians = data?.technicians || [];
  const faults = (data?.faults || []).filter((fault) => !['resolved', 'cancelled'].includes(fault.status));

  const submitSearch = (event) => { event.preventDefault(); setQuery(filters); };

  const createRequest = async (event) => {
    event.preventDefault();
    if (!selectedFault || !selectedTechnician) return;
    setCreating(true);
    setFeedback({ type: '', message: '' });
    try {
      await api.post('/repair-requests', { faultReportId: selectedFault });
      await api.put(`/fault-reports/${selectedFault}/assign`, { technicianId: selectedTechnician._id });
      setFeedback({ type: 'success', message: `Repair request created for ${selectedTechnician.firstName} ${selectedTechnician.lastName}.` });
      setSelectedTechnician(null);
      setSelectedFault('');
      reload();
    } catch (requestError) {
      setFeedback({ type: 'error', message: getApiError(requestError, 'Unable to create repair request') });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Technician network" title="Find the right specialist" description="Filter verified technicians by expertise, availability, and distance." />
      {feedback.message && <Alert type={feedback.type}>{feedback.message}</Alert>}
      <Card title="Search criteria">
        <form className="filter-bar" onSubmit={submitSearch}>
          <div className="input-group"><label htmlFor="specialization">Specialization</label><select id="specialization" value={filters.specialization} onChange={(event) => setFilters((current) => ({ ...current, specialization: event.target.value }))}><option value="">All specializations</option>{specializations.map((item) => <option value={item} key={item}>{item}</option>)}</select></div>
          <div className="input-group"><label htmlFor="coordinates">Coordinates (longitude,latitude)</label><input id="coordinates" value={filters.coordinates} placeholder="-74.006,40.7128" onChange={(event) => setFilters((current) => ({ ...current, coordinates: event.target.value }))} /></div>
          <div className="input-group"><label htmlFor="radius">Radius (km)</label><input id="radius" type="number" min="1" max="500" value={filters.radius} onChange={(event) => setFilters((current) => ({ ...current, radius: event.target.value }))} /></div>
          <label className="checkbox-field"><input type="checkbox" checked={filters.available} onChange={(event) => setFilters((current) => ({ ...current, available: event.target.checked }))} />Available now</label>
          <label className="checkbox-field"><input type="checkbox" checked={filters.emergency} onChange={(event) => setFilters((current) => ({ ...current, emergency: event.target.checked }))} />Emergency service</label>
          <Button type="submit">Search</Button>
        </form>
      </Card>

      <AsyncState loading={loading} error={error} onRetry={reload} empty={technicians.length === 0} emptyMessage="No verified technicians match these filters.">
        <section className="card-grid">
          {technicians.map((technician) => (
            <Card key={technician._id} title={`${technician.firstName} ${technician.lastName}`}>
              <div className="record-meta"><StatusBadge value={technician.availability?.status} /><span>{technician.ratings?.average || 0} / 5 ({technician.ratings?.count || 0})</span></div>
              <p>{technician.bio || 'Industrial repair technician'}</p>
              <div className="tag-list">{technician.specializations?.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
              <dl className="detail-list"><div><dt>Service radius</dt><dd>{technician.serviceArea?.radius || 0} km</dd></div><div><dt>Jobs completed</dt><dd>{technician.completedJobs || 0}</dd></div></dl>
              <Button onClick={() => { setSelectedTechnician(technician); setFeedback({ type: '', message: '' }); }}>Request technician</Button>
            </Card>
          ))}
        </section>
      </AsyncState>

      <Modal isOpen={Boolean(selectedTechnician)} onClose={() => setSelectedTechnician(null)} title="Create repair request">
        <form className="form-stack" onSubmit={createRequest}>
          <p>Send an open fault to <strong>{selectedTechnician?.firstName} {selectedTechnician?.lastName}</strong>.</p>
          {faults.length === 0 ? <Alert type="warning">You need an open fault report before creating a request.</Alert> : <div className="input-group"><label htmlFor="fault">Fault report</label><select id="fault" value={selectedFault} onChange={(event) => setSelectedFault(event.target.value)} required><option value="">Select a fault</option>{faults.map((fault) => <option key={fault._id} value={fault._id}>{fault.machineInfo?.name} — {fault.faultDescription}</option>)}</select></div>}
          <Button type="submit" disabled={creating || faults.length === 0}>{creating ? 'Creating…' : 'Create request'}</Button>
        </form>
      </Modal>
    </div>
  );
};

export default TechnicianDiscovery;
