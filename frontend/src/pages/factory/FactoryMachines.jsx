import React, { useCallback, useState } from 'react';
import api, { getApiError } from '../../services/api';
import useApiResource from '../../hooks/useApiResource';
import PageHeader from '../../components/PageHeader';
import AsyncState from '../../components/AsyncState';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

const emptyMachine = { name: '', brand: '', model: '', serialNumber: '', purchaseDate: '', lastMaintenanceDate: '' };

const FactoryMachines = () => {
  const loadProfile = useCallback(async () => (await api.get('/factories/profile')).data.data, []);
  const { data: profile, loading, error, reload } = useApiResource(loadProfile);
  const [form, setForm] = useState(emptyMachine);
  const [editingId, setEditingId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(emptyMachine); setEditingId(null); setFeedback(''); setDialogOpen(true); };
  const openEdit = (machine) => {
    setForm({
      name: machine.name || '', brand: machine.brand || '', model: machine.model || '', serialNumber: machine.serialNumber || '',
      purchaseDate: machine.purchaseDate?.slice(0, 10) || '', lastMaintenanceDate: machine.lastMaintenanceDate?.slice(0, 10) || '',
    });
    setEditingId(machine._id);
    setFeedback('');
    setDialogOpen(true);
  };
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const saveMachine = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      if (editingId) await api.put(`/factories/machines/${editingId}`, form);
      else await api.post('/factories/machines', form);
      setDialogOpen(false);
      reload();
    } catch (requestError) {
      setFeedback(getApiError(requestError, 'Unable to save machine'));
    } finally {
      setSaving(false);
    }
  };

  const deleteMachine = async (machine) => {
    if (!window.confirm(`Remove ${machine.name} from your inventory?`)) return;
    try {
      await api.delete(`/factories/machines/${machine._id}`);
      reload();
    } catch (requestError) {
      setFeedback(getApiError(requestError, 'Unable to remove machine'));
    }
  };

  const machines = profile?.machines || [];

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Factory assets" title="Machine inventory" description="Store the machine details technicians need before arriving." actions={<Button onClick={openCreate}>Add machine</Button>} />
      {feedback && !dialogOpen && <Alert type="error">{feedback}</Alert>}
      <AsyncState loading={loading} error={error} onRetry={reload} empty={machines.length === 0} emptyMessage="No machines have been added yet.">
        <section className="card-grid">
          {machines.map((machine) => (
            <Card key={machine._id} title={machine.name}>
              <dl className="detail-list">
                <div><dt>Brand</dt><dd>{machine.brand || '—'}</dd></div>
                <div><dt>Model</dt><dd>{machine.model || '—'}</dd></div>
                <div><dt>Serial number</dt><dd>{machine.serialNumber || '—'}</dd></div>
              </dl>
              <div className="button-row"><Button variant="secondary" onClick={() => openEdit(machine)}>Edit</Button><Button variant="danger" onClick={() => deleteMachine(machine)}>Remove</Button></div>
            </Card>
          ))}
        </section>
      </AsyncState>

      <Modal isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title={editingId ? 'Edit machine' : 'Add machine'}>
        <form className="form-stack" onSubmit={saveMachine}>
          {feedback && <Alert type="error">{feedback}</Alert>}
          <Input label="Machine name" id="machineName" name="name" value={form.name} onChange={updateField} required />
          <Input label="Brand" id="machineBrand" name="brand" value={form.brand} onChange={updateField} />
          <Input label="Model" id="machineModel" name="model" value={form.model} onChange={updateField} />
          <Input label="Serial number" id="machineSerial" name="serialNumber" value={form.serialNumber} onChange={updateField} />
          <Input label="Purchase date" id="purchaseDate" name="purchaseDate" type="date" value={form.purchaseDate} onChange={updateField} />
          <Input label="Last maintenance date" id="lastMaintenanceDate" name="lastMaintenanceDate" type="date" value={form.lastMaintenanceDate} onChange={updateField} />
          <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save machine'}</Button></div>
        </form>
      </Modal>
    </div>
  );
};

export default FactoryMachines;
