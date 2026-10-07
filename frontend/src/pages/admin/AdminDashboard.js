import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getDashboard();
      setStats(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
    const interval = setInterval(fetchStats, 30000);
    const socket = getSocket();
    if (socket) {
      socket.on('emergency:updated', fetchStats);
    }
    return () => {
      clearInterval(interval);
      const s = getSocket();
      if (s) s.off('emergency:updated', fetchStats);
    };
  }, []);

  if (loading) return <LoadingSpinner />;

  const e = stats?.emergencies || {};
  const a = stats?.ambulances || {};
  const h = stats?.hospitals || {};
  const u = stats?.users || {};

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>📊 Admin Dashboard</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>System overview — live data</p>
      </div>

      {/* Critical alert */}
      {parseInt(e.critical_active) > 0 && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#991b1b', fontWeight: 600 }}>
            🔴 {e.critical_active} critical emergency{e.critical_active > 1 ? 's' : ''} active!
          </span>
          <Link to="/admin/emergencies" style={{
            background: '#dc2626', color: '#fff', padding: '6px 14px',
            borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 600,
          }}>Manage →</Link>
        </div>
      )}

      {/* Emergency stats */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Emergencies
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Active" value={e.active} icon="🚨" color="#dc2626" />
          <StatCard label="Pending" value={e.pending} icon="⏳" color="#f59e0b" />
          <StatCard label="Completed Today" value={e.completed} icon="✅" color="#10b981" />
          <StatCard label="Total" value={e.total} icon="📋" color="#3b82f6" />
        </div>
      </div>

      {/* Ambulance stats */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Ambulances
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Available" value={a.available} icon="🟢" color="#10b981" />
          <StatCard label="On Duty" value={a.on_duty} icon="🚑" color="#3b82f6" />
          <StatCard label="Maintenance" value={a.maintenance} icon="🔧" color="#f59e0b" />
          <StatCard label="Total Fleet" value={a.total} icon="🚗" color="#8b5cf6" />
        </div>
      </div>

      {/* Hospital & user stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Card title="🏥 Hospitals">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Active Hospitals</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{h.total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Available Beds</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>{h.total_available_beds}</span>
          </div>
          <Link to="/admin/hospitals" style={{
            display: 'inline-block', marginTop: 12,
            fontSize: 13, color: '#3b82f6', textDecoration: 'none',
          }}>Manage hospitals →</Link>
        </Card>

        <Card title="👥 Users">
          {[
            { label: 'Patients', value: u.patients, color: '#3b82f6' },
            { label: 'Drivers', value: u.drivers, color: '#10b981' },
            { label: 'Hospital Staff', value: u.hospital_staff, color: '#8b5cf6' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>{row.label}</span>
              <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}
          <Link to="/admin/users" style={{
            display: 'inline-block', marginTop: 8,
            fontSize: 13, color: '#3b82f6', textDecoration: 'none',
          }}>Manage users →</Link>
        </Card>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { to: '/admin/emergencies', icon: '🚨', label: 'Active Emergencies', color: '#fee2e2', border: '#fca5a5' },
          { to: '/admin/ambulances', icon: '🚑', label: 'Fleet Management', color: '#dbeafe', border: '#93c5fd' },
          { to: '/admin/hospitals', icon: '🏥', label: 'Hospitals', color: '#e0e7ff', border: '#a5b4fc' },
          { to: '/admin/users', icon: '👥', label: 'User Management', color: '#d1fae5', border: '#6ee7b7' },
        ].map(item => (
          <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: item.color, border: `1px solid ${item.border}`,
              borderRadius: 10, padding: '16px', textAlign: 'center',
              transition: 'transform 0.15s',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
