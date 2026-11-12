import React, { useCallback, useState } from 'react';
import api, { getApiError } from '../../services/api';
import useApiResource from '../../hooks/useApiResource';
import PageHeader from '../../components/PageHeader';
import AsyncState from '../../components/AsyncState';
import StatusBadge from '../../components/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

const nextStatuses = {
  accepted: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['traveling', 'cancelled'],
  traveling: ['arrived', 'cancelled'],
  arrived: ['diagnosing'],
  diagnosing: ['repairing', 'waiting_parts', 'cancelled'],
  waiting_parts: ['repairing', 'cancelled'],
  repairing: ['completed'],
};

const TechnicianDashboard = () => {
  const loadRequests = useCallback(async () => (await api.get('/repair-requests')).data.data || [], []);
  const { data: requests = [], loading, error, reload } = useApiResource(loadRequests);
  const [actionRequest, setActionRequest] = useState(null);
  const [action, setAction] = useState('');
  const [actionValue, setActionValue] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  const openAction = (request, type, initialValue = '') => {
    setActionRequest(request);
    setAction(type);
    setActionValue(initialValue);
    setFeedback({ type: '', message: '' });
  };

  const closeAction = () => {
    setActionRequest(null);
    setAction('');
    setActionValue('');
  };

  const submitAction = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      if (action === 'accept') {
        await api.post(`/repair-requests/${actionRequest._id}/accept`, { estimatedArrivalTime: actionValue });
      } else if (action === 'reject') {
        await api.post(`/repair-requests/${actionRequest._id}/reject`, { reason: actionValue });
      } else {
        await api.put(`/repair-requests/${actionRequest._id}/status`, { status: actionValue });
      }
      closeAction();
      setFeedback({ type: 'success', message: 'Repair request updated.' });
      reload();
    } catch (requestError) {
      setFeedback({ type: 'error', message: getApiError(requestError, 'Unable to update request') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Technician workspace" title="Assigned repair jobs" description="Review each job, respond quickly, and keep the factory informed as work progresses." />
      {feedback.message && <Alert type={feedback.type}>{feedback.message}</Alert>}
      <AsyncState loading={loading} error={error} onRetry={reload} empty={requests.length === 0} emptyMessage="No repair requests are assigned to you yet.">
        <section className="record-list job-list">
          {requests.map((request) => {
            const transitions = nextStatuses[request.status] || [];
            return (
              <Card key={request._id} title={request.faultReportId?.machineInfo?.name || 'Repair request'}>
                <div className="job-heading"><StatusBadge value={request.status} /><span className={`priority priority-${request.urgency}`}>{request.urgency} priority</span></div>
                <p>{request.faultReportId?.faultDescription || 'No fault description provided.'}</p>
                <dl className="detail-list">
                  <div><dt>Factory</dt><dd>{request.factoryId?.companyName || '—'}</dd></div>
                  <div><dt>Contact</dt><dd>{request.factoryId?.contactPerson || request.factoryContactId?.email || '—'}</dd></div>
                  <div><dt>Created</dt><dd>{new Date(request.createdAt).toLocaleString()}</dd></div>
                </dl>
                <div className="button-row">
                  {request.status === 'pending' && <><Button onClick={() => openAction(request, 'accept')}>Accept</Button><Button variant="danger" onClick={() => openAction(request, 'reject')}>Reject</Button></>}
                  {transitions.filter((status) => status !== 'rejected').map((status) => <Button key={status} variant={status === 'cancelled' ? 'danger' : 'secondary'} onClick={() => openAction(request, 'status', status)}>Mark {status.replaceAll('_', ' ')}</Button>)}
                </div>
              </Card>
            );
          })}
        </section>
      </AsyncState>

      <Modal isOpen={Boolean(actionRequest)} onClose={closeAction} title={action === 'accept' ? 'Accept repair request' : action === 'reject' ? 'Reject repair request' : 'Update job status'}>
        <form className="form-stack" onSubmit={submitAction}>
          {feedback.type === 'error' && <Alert type="error">{feedback.message}</Alert>}
          {action === 'accept' && <Input label="Estimated arrival" id="estimatedArrivalTime" type="datetime-local" value={actionValue} onChange={(event) => setActionValue(event.target.value)} required />}
          {action === 'reject' && <div className="input-group"><label htmlFor="reason">Reason</label><textarea id="reason" rows="4" value={actionValue} onChange={(event) => setActionValue(event.target.value)} required /></div>}
          {action === 'status' && <p>Confirm status change to <strong>{actionValue.replaceAll('_', ' ')}</strong>.</p>}
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Confirm update'}</Button>
        </form>
      </Modal>
    </div>
  );
};

export default TechnicianDashboard;
