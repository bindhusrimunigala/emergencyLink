import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { emergencyAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function EmergencyHistory() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    emergencyAPI.getAll().then(res => {
      setEmergencies(res.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? emergencies
    : emergencies.filter(e => e.status === filter);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>📋 Emergency History</h1>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'pending', 'assigned', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: filter === f ? '2px solid #dc2626' : '1px solid #e2e8f0',
            background: filter === f ? '#fee2e2' : '#fff',
            color: filter === f ? '#991b1b' : '#64748b',
            fontSize: 13, cursor: 'pointer', fontWeight: filter === f ? 600 : 400,
            textTransform: 'capitalize',
          }}>
            {f}
          </button>
        ))}
      </div>

      <Card>
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
            <div style={{ fontSize: 32 }}>📭</div>
            <p style={{ marginTop: 8 }}>No emergency requests found</p>
          </div>
        ) : (
          filtered.map(em => (
            <Link key={em.id} to={`/patient/track/${em.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '14px 0', borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {em.emergency_type}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    {new Date(em.created_at).toLocaleString()}
                  </div>
                  {em.hospital_name && (
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      🏥 {em.hospital_name}
                    </div>
                  )}
                  {em.ambulance_vehicle_number && (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      🚑 {em.ambulance_vehicle_number}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <StatusBadge status={em.status} />
                  <StatusBadge status={em.priority} />
                  {em.estimated_arrival_minutes && em.status !== 'completed' && (
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      ETA: {em.estimated_arrival_minutes}m
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </Card>
    </div>
  );
}
