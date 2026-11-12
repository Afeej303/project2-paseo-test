import React, { useCallback, useEffect, useState } from 'react';
import api, { getApiError } from '../../services/api';
import useApiResource from '../../hooks/useApiResource';
import PageHeader from '../../components/PageHeader';
import AsyncState from '../../components/AsyncState';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

const emptyForm = {
  companyName: '', contactPerson: '', contactPhone: '', street: '', city: '', state: '', zipCode: '', country: '', longitude: '', latitude: '', emergencyName: '', emergencyPhone: '', notes: '',
};

const FactoryProfile = () => {
  const loadProfile = useCallback(async () => (await api.get('/factories/profile')).data.data, []);
  const { data: profile, loading, error, reload } = useApiResource(loadProfile);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      companyName: profile.companyName || '',
      contactPerson: profile.contactPerson || '',
      contactPhone: profile.contactPhone || '',
      street: profile.address?.street || '',
      city: profile.address?.city || '',
      state: profile.address?.state || '',
      zipCode: profile.address?.zipCode || '',
      country: profile.address?.country || '',
      longitude: profile.location?.coordinates?.[0] ?? '',
      latitude: profile.location?.coordinates?.[1] ?? '',
      emergencyName: profile.emergencyContact?.name || '',
      emergencyPhone: profile.emergencyContact?.phone || '',
      notes: profile.notes || '',
    });
  }, [profile]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });
    const longitude = Number(form.longitude);
    const latitude = Number(form.latitude);
    try {
      await api.put('/factories/profile', {
        companyName: form.companyName,
        contactPerson: form.contactPerson,
        contactPhone: form.contactPhone,
        address: { street: form.street, city: form.city, state: form.state, zipCode: form.zipCode, country: form.country },
        location: { type: 'Point', coordinates: [longitude, latitude] },
        emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone },
        notes: form.notes,
      });
      setFeedback({ type: 'success', message: 'Factory profile saved.' });
      reload();
    } catch (requestError) {
      setFeedback({ type: 'error', message: getApiError(requestError, 'Unable to save profile') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Factory settings" title="Factory profile" description="Keep contact, address, and location details accurate for repair coordination." />
      <AsyncState loading={loading} error={error} onRetry={reload}>
        <Card title="Company details">
          <form className="form-grid" onSubmit={handleSubmit}>
            {feedback.message && <div className="form-span"><Alert type={feedback.type}>{feedback.message}</Alert></div>}
            <Input label="Company name" id="companyName" name="companyName" value={form.companyName} onChange={updateField} required />
            <Input label="Contact person" id="contactPerson" name="contactPerson" value={form.contactPerson} onChange={updateField} required />
            <Input label="Contact phone" id="contactPhone" name="contactPhone" type="tel" value={form.contactPhone} onChange={updateField} required />
            <Input label="Street" id="street" name="street" value={form.street} onChange={updateField} />
            <Input label="City" id="city" name="city" value={form.city} onChange={updateField} />
            <Input label="State / region" id="state" name="state" value={form.state} onChange={updateField} />
            <Input label="Postal code" id="zipCode" name="zipCode" value={form.zipCode} onChange={updateField} />
            <Input label="Country" id="country" name="country" value={form.country} onChange={updateField} />
            <Input label="Longitude" id="longitude" name="longitude" type="number" step="any" min="-180" max="180" value={form.longitude} onChange={updateField} required />
            <Input label="Latitude" id="latitude" name="latitude" type="number" step="any" min="-90" max="90" value={form.latitude} onChange={updateField} required />
            <Input label="Emergency contact" id="emergencyName" name="emergencyName" value={form.emergencyName} onChange={updateField} />
            <Input label="Emergency phone" id="emergencyPhone" name="emergencyPhone" type="tel" value={form.emergencyPhone} onChange={updateField} />
            <div className="input-group form-span"><label htmlFor="notes">Site notes</label><textarea id="notes" name="notes" rows="4" value={form.notes} onChange={updateField} /></div>
            <div className="form-actions form-span"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button></div>
          </form>
        </Card>
      </AsyncState>
    </div>
  );
};

export default FactoryProfile;
