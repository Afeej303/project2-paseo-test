import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiError } from '../../services/api';
import useApiResource from '../../hooks/useApiResource';
import PageHeader from '../../components/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

const FaultReportForm = () => {
  const loadProfile = useCallback(async () => (await api.get('/factories/profile')).data.data, []);
  const { data: profile } = useApiResource(loadProfile);
  const navigate = useNavigate();
  const [form, setForm] = useState({ machineName: '', brand: '', model: '', serialNumber: '', faultDescription: '', symptoms: '', urgency: 'medium', hasStoppedProduction: false, preferredVisitTime: '', safetyInstructions: '', accessInstructions: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'machineSelection' && value) {
      const machine = profile?.machines?.find((item) => item._id === value);
      if (machine) setForm((current) => ({ ...current, machineName: machine.name || '', brand: machine.brand || '', model: machine.model || '', serialNumber: machine.serialNumber || '' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        symptoms: form.symptoms.split(',').map((item) => item.trim()).filter(Boolean),
      };
      if (!payload.preferredVisitTime) delete payload.preferredVisitTime;
      const response = await api.post('/fault-reports', payload);
      const fault = response.data.data;
      if (files.length > 0) {
        const media = new FormData();
        files.forEach((file) => media.append('media', file));
        await api.post(`/fault-reports/${fault._id}/media`, media);
      }
      navigate('/dashboard/factory', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to submit fault report'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Rapid response" title="Report a machine fault" description="Give technicians a clear picture of the breakdown and any site constraints." />
      <Card title="Fault details">
        <form className="form-grid" onSubmit={handleSubmit}>
          {error && <div className="form-span"><Alert type="error">{error}</Alert></div>}
          {profile?.machines?.length > 0 && (
            <div className="input-group form-span"><label htmlFor="machineSelection">Select from inventory</label><select id="machineSelection" name="machineSelection" onChange={updateField} defaultValue=""><option value="">Enter details manually</option>{profile.machines.map((machine) => <option key={machine._id} value={machine._id}>{machine.name} {machine.model ? `— ${machine.model}` : ''}</option>)}</select></div>
          )}
          <Input label="Machine name" id="machineName" name="machineName" value={form.machineName} onChange={updateField} required />
          <Input label="Brand" id="brand" name="brand" value={form.brand} onChange={updateField} />
          <Input label="Model" id="model" name="model" value={form.model} onChange={updateField} />
          <Input label="Serial number" id="serialNumber" name="serialNumber" value={form.serialNumber} onChange={updateField} />
          <div className="input-group form-span"><label htmlFor="faultDescription">Describe the fault</label><textarea id="faultDescription" name="faultDescription" rows="5" value={form.faultDescription} onChange={updateField} required /></div>
          <Input label="Symptoms (comma separated)" id="symptoms" name="symptoms" value={form.symptoms} onChange={updateField} />
          <div className="input-group"><label htmlFor="urgency">Urgency</label><select id="urgency" name="urgency" value={form.urgency} onChange={updateField}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
          <Input label="Preferred visit time" id="preferredVisitTime" name="preferredVisitTime" type="datetime-local" value={form.preferredVisitTime} onChange={updateField} />
          <div className="checkbox-field form-span"><input id="hasStoppedProduction" name="hasStoppedProduction" type="checkbox" checked={form.hasStoppedProduction} onChange={updateField} /><label htmlFor="hasStoppedProduction">Production has stopped</label></div>
          <div className="input-group"><label htmlFor="safetyInstructions">Safety instructions</label><textarea id="safetyInstructions" name="safetyInstructions" rows="3" value={form.safetyInstructions} onChange={updateField} /></div>
          <div className="input-group"><label htmlFor="accessInstructions">Site access instructions</label><textarea id="accessInstructions" name="accessInstructions" rows="3" value={form.accessInstructions} onChange={updateField} /></div>
          <div className="input-group form-span"><label htmlFor="media">Photos, video, or audio (up to 5 files, 10MB each)</label><input id="media" className="file-input" type="file" multiple accept="image/jpeg,image/png,image/gif,video/mp4,video/mpeg,audio/mpeg,audio/wav" onChange={(event) => setFiles(Array.from(event.target.files).slice(0, 5))} /><span className="field-help">{files.length} file{files.length === 1 ? '' : 's'} selected</span></div>
          <div className="form-actions form-span"><Link className="text-link" to="/dashboard/factory">Cancel</Link><Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit fault report'}</Button></div>
        </form>
      </Card>
    </div>
  );
};

export default FaultReportForm;
