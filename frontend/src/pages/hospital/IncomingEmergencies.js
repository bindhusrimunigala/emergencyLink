import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { hospitalAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import StatusBadge from '../../components/StatusBadge';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ambIcon = L.divIcon({ html: '<div style="font-size:24px">🚑</div>', className: '', iconSize: [24, 24], iconAnchor: [12, 12] });

export default function IncomingEmergencies() {
  const [hospital, setHospital] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const hRes = await hospitalAPI.getMine();
      setHospital(hRes.data.data);
      const iRes = await hospitalAPI.getIncoming(hRes.data.data.id);
      setIncoming(iRes.data.data);
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
      socket.on('ambulance:location', (data) => {
        setIncoming(prev => prev.map(e =>
          e.assigned_ambulance_id === data.ambulanceId
            ? { ...e, ambulance_latitude: data.latitude, ambulance_longitude: data.longitude }
            : e
        ));
      });
    }
    return () => {
      const s = getSocket();
      if (s) { s.off('emergency:updated', fetchData); s.off('ambulance:location'); }
    };
  }, []);

  if (loading) return <LoadingSpinner />;

  const hospitalPos = hospital
    ? [parseFloat(hospital.latitude), parseFloat(hospital.longitude)]
    : [13.0827, 80.2707];

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...incoming].sort((a, b) =>
    (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>🚑 Incoming Emergencies</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>{hospital?.name}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, height: 'calc(100vh - 200px)' }}>
        {/* List */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                <div style={{ fontSize: 36 }}>✅</div>
                <p style={{ marginTop: 8 }}>No incoming emergencies</p>
              </div>
            </Card>
          ) : (
            sorted.map(em => (
              <div key={em.id} onClick={() => setSelected(em)} style={{
                background: '#fff', borderRadius: 10, padding: 16,
                border: selected?.id === em.id ? '2px solid #dc2626' : '1px solid #e2e8f0',
                cursor: 'pointer',
                borderLeft: `4px solid ${em.priority === 'critical' ? '#dc2626' : em.priority === 'high' ? '#f59e0b' : '#10b981'}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    {em.emergency_type}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <StatusBadge status={em.priority} />
                    <StatusBadge status={em.status} />
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#374151' }}>👤 {em.patient_name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📞 {em.patient_phone}</div>
                {em.vehicle_number && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>🚑 {em.vehicle_number} — {em.driver_name}</div>
                )}
                {em.estimated_arrival_minutes && (
                  <div style={{
                    marginTop: 8, display: 'inline-block',
                    background: '#fee2e2', color: '#dc2626',
                    padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  }}>
                    ⏱ ETA: {em.estimated_arrival_minutes} min
                  </div>
                )}
                {em.description && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>
                    {em.description}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Map */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <MapContainer center={hospitalPos} zoom={13} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© OpenStreetMap contributors'
            />
            {/* Hospital marker */}
            <Marker position={hospitalPos} icon={L.divIcon({ html: '<div style="font-size:28px">🏥</div>', className: '', iconSize: [28, 28] })}>
              <Popup>🏥 {hospital?.name}</Popup>
            </Marker>
            {/* Ambulance markers */}
            {incoming.filter(e => e.ambulance_latitude && e.ambulance_longitude).map(em => (
              <Marker
                key={em.id}
                position={[parseFloat(em.ambulance_latitude), parseFloat(em.ambulance_longitude)]}
                icon={ambIcon}
              >
                <Popup>
                  🚑 {em.vehicle_number}<br />
                  Patient: {em.patient_name}<br />
                  {em.emergency_type}
                </Popup>
              </Marker>
            ))}
            {/* Pickup markers */}
            {incoming.map(em => (
              <Marker
                key={`pickup-${em.id}`}
                position={[parseFloat(em.pickup_latitude), parseFloat(em.pickup_longitude)]}
                icon={L.divIcon({ html: '<div style="font-size:20px">📍</div>', className: '', iconSize: [20, 20] })}
              >
                <Popup>{em.patient_name} — {em.emergency_type}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
