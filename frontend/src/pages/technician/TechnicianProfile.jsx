import React, { useCallback, useEffect, useState } from 'react';
import api, { getApiError } from '../../services/api';
import useApiResource from '../../hooks/useApiResource';
import PageHeader from '../../components/PageHeader';
import AsyncState from '../../components/AsyncState';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

const specializationOptions = ['electrical', 'mechanical', 'CNC', 'PLC', 'robotics', 'HVAC', 'hydraulics', 'pneumatics', 'welding', 'other'];

const TechnicianProfile = () => {
  const loadProfile = useCallback(async () => (await api.get('/technicians/profile')).data.data, []);
  const { data: profile, loading, error, reload } = useApiResource(loadProfile);
  const [identity, setIdentity] = useState({ firstName: '', lastName: '', phone: '' });
  const [specializations, setSpecializations] = useState([]);
  const [brands, setBrands] = useState('');
  const [serviceArea, setServiceArea] = useState({ longitude: '', latitude: '', radius: '50', cities: '' });
  const [availability, setAvailability] = useState({ status: 'offline', emergencyAvailable: false, start: '08:00', end: '18:00' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState('');

  useEffect(() => {
    if (!profile) return;
    setIdentity({ firstName: profile.firstName || '', lastName: profile.lastName || '', phone: profile.phone || '' });
    setSpecializations(profile.specializations || []);
    setBrands((profile.brands || []).join(', '));
    setServiceArea({
      longitude: profile.serviceArea?.location?.coordinates?.[0] ?? '',
      latitude: profile.serviceArea?.location?.coordinates?.[1] ?? '',
      radius: profile.serviceArea?.radius ?? '50',
      cities: (profile.serviceArea?.cities || []).join(', '),
    });
    setAvailability({
      status: profile.availability?.status || 'offline',
      emergencyAvailable: Boolean(profile.availability?.emergencyAvailable),
      start: profile.availability?.workingHours?.start || '08:00',
      end: profile.availability?.workingHours?.end || '18:00',
    });
  }, [profile]);

  const runSave = async (key, operation, successMessage) => {
    setSaving(key);
    setFeedback({ type: '', message: '' });
    try {
      await operation();
      setFeedback({ type: 'success', message: successMessage });
      reload();
    } catch (requestError) {
      setFeedback({ type: 'error', message: getApiError(requestError, 'Unable to save changes') });
    } finally {
      setSaving('');
    }
  };

  const saveIdentity = (event) => {
    event.preventDefault();
    runSave('identity', () => api.put('/technicians/profile', identity), 'Contact details saved.');
  };
  const saveSpecializations = (event) => {
    event.preventDefault();
    runSave('specializations', () => api.put('/technicians/specializations', { specializations, brands: brands.split(',').map((item) => item.trim()).filter(Boolean) }), 'Specializations saved.');
  };
  const saveServiceArea = (event) => {
    event.preventDefault();
    runSave('service', () => api.put('/technicians/service-area', {
      coordinates: [Number(serviceArea.longitude), Number(serviceArea.latitude)],
      radius: Number(serviceArea.radius),
      cities: serviceArea.cities.split(',').map((item) => item.trim()).filter(Boolean),
    }), 'Service area saved.');
  };
  const saveAvailability = (event) => {
    event.preventDefault();
    runSave('availability', () => api.put('/technicians/availability', {
      status: availability.status,
      emergencyAvailable: availability.emergencyAvailable,
      workingHours: { start: availability.start, end: availability.end },
    }), 'Availability saved.');
  };

  const toggleSpecialization = (item) => {
    setSpecializations((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Technician settings" title="Profile and availability" description="Keep your expertise, travel area, and current availability accurate for matching." />
      {feedback.message && <Alert type={feedback.type}>{feedback.message}</Alert>}
      <AsyncState loading={loading} error={error} onRetry={reload}>
        <section className="content-grid">
          <Card title="Contact details">
            <form className="form-stack" onSubmit={saveIdentity}>
              <Input label="First name" id="firstName" value={identity.firstName} onChange={(event) => setIdentity((current) => ({ ...current, firstName: event.target.value }))} required />
              <Input label="Last name" id="lastName" value={identity.lastName} onChange={(event) => setIdentity((current) => ({ ...current, lastName: event.target.value }))} required />
              <Input label="Phone" id="phone" type="tel" value={identity.phone} onChange={(event) => setIdentity((current) => ({ ...current, phone: event.target.value }))} required />
              <Button type="submit" disabled={saving === 'identity'}>{saving === 'identity' ? 'Saving…' : 'Save contact details'}</Button>
            </form>
          </Card>

          <Card title="Availability">
            <form className="form-stack" onSubmit={saveAvailability}>
              <div className="input-group"><label htmlFor="availabilityStatus">Current status</label><select id="availabilityStatus" value={availability.status} onChange={(event) => setAvailability((current) => ({ ...current, status: event.target.value }))}><option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option></select></div>
              <div className="form-grid compact-grid"><Input label="Starts" id="workStart" type="time" value={availability.start} onChange={(event) => setAvailability((current) => ({ ...current, start: event.target.value }))} /><Input label="Ends" id="workEnd" type="time" value={availability.end} onChange={(event) => setAvailability((current) => ({ ...current, end: event.target.value }))} /></div>
              <label className="checkbox-field"><input type="checkbox" checked={availability.emergencyAvailable} onChange={(event) => setAvailability((current) => ({ ...current, emergencyAvailable: event.target.checked }))} />Available for emergency callouts</label>
              <Button type="submit" disabled={saving === 'availability'}>{saving === 'availability' ? 'Saving…' : 'Save availability'}</Button>
            </form>
          </Card>

          <Card title="Specializations and brands">
            <form className="form-stack" onSubmit={saveSpecializations}>
              <fieldset className="choice-grid"><legend>Repair specializations</legend>{specializationOptions.map((item) => <label className="checkbox-field" key={item}><input type="checkbox" checked={specializations.includes(item)} onChange={() => toggleSpecialization(item)} />{item}</label>)}</fieldset>
              <Input label="Supported brands (comma separated)" id="brands" value={brands} onChange={(event) => setBrands(event.target.value)} />
              <Button type="submit" disabled={saving === 'specializations'}>{saving === 'specializations' ? 'Saving…' : 'Save expertise'}</Button>
            </form>
          </Card>

          <Card title="Service area">
            <form className="form-stack" onSubmit={saveServiceArea}>
              <div className="form-grid compact-grid"><Input label="Longitude" id="serviceLongitude" type="number" step="any" min="-180" max="180" value={serviceArea.longitude} onChange={(event) => setServiceArea((current) => ({ ...current, longitude: event.target.value }))} required /><Input label="Latitude" id="serviceLatitude" type="number" step="any" min="-90" max="90" value={serviceArea.latitude} onChange={(event) => setServiceArea((current) => ({ ...current, latitude: event.target.value }))} required /></div>
              <Input label="Travel radius (km)" id="serviceRadius" type="number" min="1" max="500" value={serviceArea.radius} onChange={(event) => setServiceArea((current) => ({ ...current, radius: event.target.value }))} required />
              <Input label="Cities served (comma separated)" id="serviceCities" value={serviceArea.cities} onChange={(event) => setServiceArea((current) => ({ ...current, cities: event.target.value }))} />
              <Button type="submit" disabled={saving === 'service'}>{saving === 'service' ? 'Saving…' : 'Save service area'}</Button>
            </form>
          </Card>
        </section>
      </AsyncState>
    </div>
  );
};

export default TechnicianProfile;
