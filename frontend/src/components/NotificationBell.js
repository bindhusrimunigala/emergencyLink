import React, { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';
import useSocket from '../hooks/useSocket';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.data);
    } catch {}
  };

  useEffect(() => { fetchNotifications(); }, []);

  // Real-time new notification
  useSocket('notification:new', (notif) => {
    setNotifications(prev => [notif, ...prev]);
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = async (id) => {
    await notificationAPI.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await notificationAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 20, position: 'relative', padding: 4,
      }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#dc2626', color: '#fff',
            fontSize: 10, borderRadius: '50%',
            width: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%',
          width: 320, background: '#fff',
          border: '1px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 1000, maxHeight: 400, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', color: '#3b82f6',
                fontSize: 12, cursor: 'pointer',
              }}>Mark all read</button>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No notifications
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n.id} onClick={() => markRead(n.id)} style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f1f5f9',
                  background: n.is_read ? '#fff' : '#eff6ff',
                  cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: '#1e293b' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
