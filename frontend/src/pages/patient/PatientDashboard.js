import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { emergencyAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    emergencyAPI.getAll().then(res => {
      setEmergencies(res.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const active = emergencies.filter(e => !['completed', 'cancelled'].includes(e.status));
  const completed = emergencies.filter(e => e.status === 'completed');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          Welcome, {user?.name} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Your emergency requests and status
        </p>
      </div>

      {/* Emergency button */}
      <Link to="/patient/emergency" style={{ textDecoration: 'none' }}>
        <div style={{
          background: 'linear-gradient(135deg, #dc2626, #991b1b)',
          color: '#fff', borderRadius: 14, padding: '20px 24px',
          marginBottom: 24, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
          transition: 'transform 0.15s',
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🚨 Request Emergency</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Get immediate ambulance assistance</div>
          </div>
          <div style={{ fontSize: 40 }}>→</div>
        </div>
      </Link>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Requests" value={emergencies.length} icon="📋" color="#3b82f6" />
        <StatCard label="Active" value={active.length} icon="🔴" color="#dc2626" />
        <StatCard label="Completed" value={completed.length} icon="✅" color="#10b981" />
      </div>

      {/* Recent emergencies */}
      <Card title="Recent Emergencies" action={
        <Link to="/patient/history" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none' }}>
          View all →
        </Link>
      }>
        {loading ? <LoadingSpinner /> : emergencies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <p>No emergency requests yet</p>
          </div>
        ) : (
          <div>
            {emergencies.slice(0, 5).map(em => (
              <Link key={em.id} to={`/patient/track/${em.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                      {em.emergency_type}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {new Date(em.created_at).toLocaleString()}
                      {em.hospital_name && ` • ${em.hospital_name}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge status={em.priority} />
                    <StatusBadge status={em.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
