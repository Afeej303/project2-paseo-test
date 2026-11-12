import React, { useCallback, useEffect } from 'react';
import api, { getApiError } from '../services/api';
import useApiResource from '../hooks/useApiResource';
import PageHeader from '../components/PageHeader';
import AsyncState from '../components/AsyncState';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const NotificationsPage = () => {
  const loadNotifications = useCallback(async () => (await api.get('/notifications')).data.data || [], []);
  const { data: notifications = [], loading, error, reload, setData } = useApiResource(loadNotifications);

  useEffect(() => {
    const timer = window.setInterval(reload, 30000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const markRead = async (notification) => {
    try {
      const response = await api.put(`/notifications/${notification._id}/read`);
      setData((current) => current.map((item) => item._id === notification._id ? response.data.data : item));
    } catch (requestError) {
      window.alert(getApiError(requestError, 'Unable to mark notification as read'));
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Inbox" title="Notifications" description={`Polling every 30 seconds · ${unreadCount} unread`} actions={<Button variant="secondary" onClick={reload}>Refresh</Button>} />
      <AsyncState loading={loading} error={error} onRetry={reload} empty={notifications.length === 0} emptyMessage="You do not have any notifications yet.">
        <section className="record-list">
          {notifications.map((notification) => (
            <Card key={notification._id}>
              <article className={`notification-row${notification.read ? '' : ' notification-unread'}`}>
                <div>
                  <span className="eyebrow">{notification.type.replaceAll('_', ' ')}</span>
                  <p>{notification.message}</p>
                  <time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
                </div>
                {!notification.read && <Button variant="secondary" onClick={() => markRead(notification)}>Mark read</Button>}
              </article>
            </Card>
          ))}
        </section>
      </AsyncState>
    </div>
  );
};

export default NotificationsPage;
