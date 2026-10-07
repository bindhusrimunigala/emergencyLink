import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ambulanceAPI, emergencyAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import useGeolocation from '../../hooks/useGeolocation';
import StatusBadge from '../../components/StatusBadge';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function DriverDashboard() {
  const { user } = useAuth();
  const [ambulance, setAmbulance] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const { location } = useGeolocation(true); // watch continuously

  const fetchData = useCallback(async () => {
    try {
      const [ambRes, emRes] = await Promise.all([
        ambulanceAPI.getMine(),
        emergencyAPI.getAll(),
      ]);
      setAmbulance(ambRes.data.data);
      const emList = emRes.data.data;
      setEmergencies(emList);
      setActiveEmergency(emList.find(e => !['completed', 'cancelled'].includes(e.status)) || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Broadcast live location via socket
  useEffect(() => {
    if (!location || !ambulance) return;
    const socket = getSocket();
    if (!socket) return;

    if (broadcasting) {
      socket.emit('location:update', {
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
      });
    }
  }, [location, broadcasting, ambulance]);

  const toggleStatus = async (status) => {
    try {
      await ambulanceAPI.updateStatus(ambulance.id, { status });
      setAmbulance(prev => ({ ...prev, status }));
    } catch (err) {
      console.error(err);
    }
  };

  const updateEmergencyStatus = async (emergencyId, status) => {
    try {
      await emergencyAPI.updateStatus(emergencyId, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner />;

  const completed = emergencies.filter(e => e.status === 'completed').length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          🚑 Driver Dashboard
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Welcome back, {user?.name}</p>
      </div>

      {/* Ambulance status card */}
      {ambulance ? (
        <Card style={{ marginBottom: 16, borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                🚑 {ambulance.vehicle_number}
              </div>
              <div style={{ marginTop: 6 }}>
                <StatusBadge status={ambulance.status} size="lg" />
              </div>
              {ambulance.equipment?.length > 0 && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  Equipment: {ambulance.equipment.join(', ')}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ambulance.status !== 'available' && (
                <button onClick={() => toggleStatus('available')} style={btnStyle('#10b981')}>
                  ✅ Set Available
                </button>
              )}
              {ambulance.status !== 'maintenance' && (
                <button onClick={() => toggleStatus('maintenance')} style={btnStyle('#f59e0b')}>
                  🔧 Maintenance
                </button>
              )}
            </div>
          </div>

          {/* GPS broadcast toggle */}
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>Live Location Broadcast</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {location
                  ? `📍 ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                  : 'Waiting for GPS...'
                }
              </div>
            </div>
            <button onClick={() => setBroadcasting(!broadcasting)} style={{
              padding: '8px 16px', borderRadius: 20,
              border: 'none', cursor: 'pointer',
              background: broadcasting ? '#dc2626' : '#10b981',
              color: '#fff', fontSize: 13, fontWeight: 600,
            }}>
              {broadcasting ? '⏹ Stop' : '▶ Start'} Broadcasting
            </button>
          </div>
        </Card>
      ) : (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ color: '#64748b', textAlign: 'center', padding: 16 }}>
            No ambulance assigned to you yet.
          </p>
        </Card>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Trips" value={emergencies.length} icon="🗺️" color="#3b82f6" />
        <StatCard label="Completed" value={completed} icon="✅" color="#10b981" />
        <StatCard label="Active" value={activeEmergency ? 1 : 0} icon="🔴" color="#dc2626" />
      </div>

      {/* Active dispatch */}
      {activeEmergency && (
        <Card title="🚨 Active Dispatch" style={{ marginBottom: 16, borderLeft: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
                {activeEmergency.emergency_type}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Patient: {activeEmergency.patient_name} • {activeEmergency.patient_phone}
              </div>
              {activeEmergency.pickup_address && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  📍 {activeEmergency.pickup_address}
                </div>
              )}
              {activeEmergency.hospital_name && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  🏥 Destination: {activeEmergency.hospital_name}
                </div>
              )}
            </div>
            <StatusBadge status={activeEmergency.status} size="lg" />
          </div>

          {/* Status progression buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { status: 'en_route', label: '🚦 En Route', show: ['assigned'] },
              { status: 'at_scene', label: '📍 At Scene', show: ['en_route'] },
              { status: 'transporting', label: '🚑 Transporting', show: ['at_scene'] },
              { status: 'completed', label: '✅ Completed', show: ['transporting'] },
            ].filter(a => a.show.includes(activeEmergency.status)).map(action => (
              <button key={action.status}
                onClick={() => updateEmergencyStatus(activeEmergency.id, action.status)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: '#1e293b', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                {action.label}
              </button>
            ))}
            <Link to="/driver/navigate" style={{
              padding: '8px 16px', borderRadius: 8,
              background: '#3b82f6', color: '#fff',
              textDecoration: 'none', fontSize: 13, fontWeight: 600,
            }}>
              🗺️ Navigate
            </Link>
          </div>
        </Card>
      )}

      {/* Recent trips */}
      <Card title="Recent Trips">
        {emergencies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No trips yet</div>
        ) : (
          emergencies.slice(0, 8).map(em => (
            <div key={em.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px solid #f1f5f9',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{em.emergency_type}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(em.created_at).toLocaleString()}</div>
              </div>
              <StatusBadge status={em.status} />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

const btnStyle = (bg) => ({
  padding: '7px 14px', borderRadius: 7, border: 'none',
  background: bg, color: '#fff', fontSize: 12,
  fontWeight: 600, cursor: 'pointer',
});
