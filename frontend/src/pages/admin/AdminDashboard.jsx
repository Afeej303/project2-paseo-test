import React, { useCallback, useState } from 'react';
import api, { getApiError } from '../../services/api';
import useApiResource from '../../hooks/useApiResource';
import PageHeader from '../../components/PageHeader';
import AsyncState from '../../components/AsyncState';
import StatusBadge from '../../components/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const AdminDashboard = () => {
  const loadAdminData = useCallback(async () => {
    const [usersResponse, statsResponse, requestsResponse, techniciansResponse] = await Promise.all([
      api.get('/admin/users'),
      api.get('/admin/stats'),
      api.get('/admin/repair-requests'),
      api.get('/technicians'),
    ]);
    return {
      users: usersResponse.data.data || [],
      stats: statsResponse.data.data || { userCounts: [], requestCounts: [] },
      requests: requestsResponse.data.data || [],
      technicians: techniciansResponse.data.data || [],
    };
  }, []);

  const { data, loading, error, reload } = useApiResource(loadAdminData);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [savingId, setSavingId] = useState('');

  const runAction = async (id, operation, message) => {
    setSavingId(id);
    setFeedback({ type: '', message: '' });
    try {
      await operation();
      setFeedback({ type: 'success', message });
      reload();
    } catch (requestError) {
      setFeedback({ type: 'error', message: getApiError(requestError, 'Admin action failed') });
    } finally {
      setSavingId('');
    }
  };

  const users = data?.users || [];
  const technicians = data?.technicians || [];
  const requests = data?.requests || [];
  const userCounts = Object.fromEntries((data?.stats?.userCounts || []).map((item) => [item._id, item.count]));
  const requestCounts = Object.fromEntries((data?.stats?.requestCounts || []).map((item) => [item._id, item.count]));

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Administration" title="Platform operations" description="Monitor adoption, verify technicians, and manage user access." actions={<Button variant="secondary" onClick={reload}>Refresh</Button>} />
      {feedback.message && <Alert type={feedback.type}>{feedback.message}</Alert>}
      <AsyncState loading={loading} error={error} onRetry={reload}>
        <section className="metric-grid" aria-label="Platform statistics">
          <Card><span className="metric-value">{users.length}</span><span className="metric-label">Total users</span></Card>
          <Card><span className="metric-value">{userCounts.factory || 0}</span><span className="metric-label">Factories</span></Card>
          <Card><span className="metric-value">{userCounts.technician || 0}</span><span className="metric-label">Technicians</span></Card>
          <Card><span className="metric-value">{(requestCounts.pending || 0) + (requestCounts.accepted || 0)}</span><span className="metric-label">Open requests</span></Card>
        </section>

        <Card title="Users">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Email</th><th>Role</th><th>Verified</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{users.map((user) => <tr key={user._id}><td>{user.email}</td><td>{user.role}</td><td>{user.isVerified ? 'Yes' : 'No'}</td><td><StatusBadge value={user.isActive ? 'active' : 'inactive'} /></td><td><Button variant="secondary" disabled={savingId === user._id} onClick={() => runAction(user._id, () => api.put(`/admin/users/${user._id}/status`, { isActive: !user.isActive }), `${user.email} is now ${user.isActive ? 'inactive' : 'active'}.`)}>{user.isActive ? 'Deactivate' : 'Activate'}</Button></td></tr>)}</tbody>
            </table>
          </div>
        </Card>

        <Card title="Verified technician directory">
          {technicians.length === 0 ? <div className="empty-state"><p>No verified technicians are visible yet.</p></div> : <div className="record-list">{technicians.map((technician) => <article className="record-row" key={technician._id}><div><strong>{technician.firstName} {technician.lastName}</strong><p>{technician.userId?.email || technician.phone}</p></div><div className="button-row"><StatusBadge value={technician.isVerified ? 'verified' : 'pending'} /><Button variant="secondary" disabled={savingId === technician._id} onClick={() => runAction(technician._id, () => api.put(`/admin/technicians/${technician._id}/verify`, { isVerified: !technician.isVerified }), 'Technician verification updated.')}>{technician.isVerified ? 'Revoke' : 'Verify'}</Button></div></article>)}</div>}
        </Card>

        <Card title="Repair requests">
          {requests.length === 0 ? <div className="empty-state"><p>No repair requests are recorded.</p></div> : <div className="table-scroll"><table><thead><tr><th>Request</th><th>Urgency</th><th>Status</th><th>Created</th></tr></thead><tbody>{requests.map((request) => <tr key={request._id}><td>{request._id.slice(-8)}</td><td>{request.urgency}</td><td><StatusBadge value={request.status} /></td><td>{new Date(request.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
        </Card>
      </AsyncState>
    </div>
  );
};

export default AdminDashboard;
