import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hospitalAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const hospRes = await hospitalAPI.getMine();
      const h = hospRes.data.data;
      setHospital(h);
      const incRes = await hospitalAPI.getIncoming(h.id);
      setIncoming(incRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    if (socket) {
      socket.on('emergency:updated', fetchData);
    }
    return () => {
      const s = getSocket();
      if (s) s.off('emergency:updated', fetchData);
    };
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!hospital) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
      No hospital assigned to your account.
    </div>
  );

  const critical = incoming.filter(e => e.priority === 'critical');
  const occupancy = hospital.total_beds > 0
    ? Math.round(((hospital.total_beds - hospital.available_beds) / hospital.total_beds) * 100)
    : 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>🏥 {hospital.name}</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>{hospital.address}</p>
      </div>

      {/* Critical alert */}
      {critical.length > 0 && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ color: '#991b1b', fontWeight: 600 }}>
            🔴 {critical.length} critical emergency{critical.length > 1 ? 's' : ''} incoming!
          </div>
          <Link to="/hospital/incoming" style={{
            background: '#dc2626', color: '#fff', padding: '6px 14px',
            borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 600,
          }}>View Now →</Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard label="Available Beds" value={hospital.available_beds} icon="🛏️" color="#10b981" />
        <StatCard label="Total Beds" value={hospital.total_beds} icon="🏥" color="#3b82f6" />
        <StatCard label="Occupancy" value={`${occupancy}%`} icon="📊" color="#f59e0b" />
        <StatCard label="Incoming Now" value={incoming.length} icon="🚑" color="#dc2626" />
      </div>

      {/* Hospital capabilities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Card>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>{hospital.has_icu ? '✅' : '❌'}</span>
            <div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>ICU</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {hospital.has_icu ? 'Available' : 'Not available'}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>{hospital.has_trauma_center ? '✅' : '❌'}</span>
            <div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>Trauma Center</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {hospital.has_trauma_center ? 'Available' : 'Not available'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Incoming emergencies preview */}
      <Card title="🚑 Incoming Emergencies" action={
        <Link to="/hospital/incoming" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none' }}>
          View all →
        </Link>
      }>
        {incoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <p style={{ marginTop: 8 }}>No incoming emergencies at the moment</p>
          </div>
        ) : (
          incoming.slice(0, 5).map(em => (
            <div key={em.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid #f1f5f9',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{em.emergency_type}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {em.patient_name} • {em.vehicle_number || 'No ambulance'}
                  {em.estimated_arrival_minutes && ` • ETA ${em.estimated_arrival_minutes}m`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <StatusBadge status={em.priority} />
                <StatusBadge status={em.status} />
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
