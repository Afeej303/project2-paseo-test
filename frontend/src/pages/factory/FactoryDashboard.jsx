import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useApiResource from '../../hooks/useApiResource';
import PageHeader from '../../components/PageHeader';
import AsyncState from '../../components/AsyncState';
import StatusBadge from '../../components/StatusBadge';
import Card from '../../components/ui/Card';

const FactoryDashboard = () => {
  const loadDashboard = useCallback(async () => {
    const [faultResponse, requestResponse] = await Promise.all([
      api.get('/fault-reports'),
      api.get('/repair-requests'),
    ]);
    return {
      faults: faultResponse.data.data || [],
      requests: requestResponse.data.data || [],
    };
  }, []);

  const { data, loading, error, reload } = useApiResource(loadDashboard);
  const faults = data?.faults || [];
  const requests = data?.requests || [];
  const activeRequests = requests.filter((item) => !['completed', 'rejected', 'cancelled'].includes(item.status));

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Factory workspace"
        title="Maintenance overview"
        description="Review breakdowns, repair requests, and the next action your team needs to take."
        actions={<Link className="button-link" to="/dashboard/factory/faults/new">Report a fault</Link>}
      />
      <AsyncState loading={loading} error={error} onRetry={reload}>
        <section className="metric-grid" aria-label="Maintenance metrics">
          <Card><span className="metric-value">{faults.length}</span><span className="metric-label">Fault reports</span></Card>
          <Card><span className="metric-value">{activeRequests.length}</span><span className="metric-label">Active repairs</span></Card>
          <Card><span className="metric-value">{requests.filter((item) => item.status === 'completed').length}</span><span className="metric-label">Completed repairs</span></Card>
        </section>

        <section className="content-grid">
          <Card title="Recent fault reports">
            {faults.length === 0 ? (
              <div className="empty-state"><p>No fault reports yet.</p><Link to="/dashboard/factory/faults/new">Create the first report</Link></div>
            ) : (
              <div className="record-list">
                {faults.slice(0, 6).map((fault) => (
                  <article className="record-row" key={fault._id}>
                    <div>
                      <strong>{fault.machineInfo?.name || 'Machine fault'}</strong>
                      <p>{fault.faultDescription}</p>
                    </div>
                    <div className="record-meta"><StatusBadge value={fault.status} /><span>{fault.urgency}</span></div>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card title="Repair requests">
            {requests.length === 0 ? (
              <div className="empty-state"><p>No repair requests yet.</p><Link to="/dashboard/factory/technicians">Find a technician</Link></div>
            ) : (
              <div className="record-list">
                {requests.slice(0, 6).map((request) => (
                  <article className="record-row" key={request._id}>
                    <div>
                      <strong>{request.faultReportId?.machineInfo?.name || 'Repair request'}</strong>
                      <p>{request.technicianId ? `${request.technicianId.firstName} ${request.technicianId.lastName}` : 'Awaiting technician'}</p>
                    </div>
                    <StatusBadge value={request.status} />
                  </article>
                ))}
              </div>
            )}
          </Card>
        </section>
      </AsyncState>
    </div>
  );
};

export default FactoryDashboard;
