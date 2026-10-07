import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ambulanceAPI, emergencyAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import useGeolocation from '../../hooks/useGeolocation';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const meIcon = L.divIcon({ html: '<div style="font-size:28px">🚑</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
const pickupIcon = L.divIcon({ html: '<div style="font-size:28px">📍</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 28] });
const hospitalIcon = L.divIcon({ html: '<div style="font-size:28px">🏥</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 14] });

export default function DriverNavigate() {
  const [ambulance, setAmbulance] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(true);
  const { location } = useGeolocation(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ambRes = await ambulanceAPI.getMine();
        setAmbulance(ambRes.data.data);
        const emRes = await emergencyAPI.getAll();
        const active = emRes.data.data.find(e => !['completed', 'cancelled'].includes(e.status));
        setActiveEmergency(active || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Broadcast GPS every 5 seconds
  useEffect(() => {
    if (!location || !broadcasting) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('location:update', {
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed,
    });
  }, [location, broadcasting]);

  const updateStatus = async (status) => {
    if (!activeEmergency) return;
    try {
      await emergencyAPI.updateStatus(activeEmergency.id, { status });
      setActiveEmergency(prev => ({ ...prev, status }));
    } catch (err) { console.error(err); }
  };

  if (loading) return <LoadingSpinner />;

  const myPos = location ? [location.latitude, location.longitude] : null;
  const pickupPos = activeEmergency
    ? [parseFloat(activeEmergency.pickup_latitude), parseFloat(activeEmergency.pickup_longitude)]
    : null;
  const hospitalPos = activeEmergency?.hospital_latitude
    ? [parseFloat(activeEmergency.hospital_latitude), parseFloat(activeEmergency.hospital_longitude)]
    : null;

  const mapCenter = myPos || pickupPos || [13.0827, 80.2707];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>🗺️ Navigation</h1>
        <button onClick={() => setBroadcasting(!broadcasting)} style={{
          padding: '8px 16px', borderRadius: 20, border: 'none',
          background: broadcasting ? '#dc2626' : '#10b981',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          {broadcasting ? '⏹ Stop GPS' : '▶ Broadcast GPS'}
        </button>
      </div>

      {/* Active emergency info bar */}
      {activeEmergency ? (
        <div style={{
          background: '#fff', borderRadius: 10, padding: '12px 16px',
          border: '1px solid #e2e8f0', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>
            <span style={{ fontWeight: 600, color: '#dc2626' }}>{activeEmergency.emergency_type}</span>
            <span style={{ color: '#64748b', fontSize: 13, marginLeft: 12 }}>
              {activeEmergency.patient_name} • {activeEmergency.patient_phone}
            </span>
            {activeEmergency.pickup_address && (
              <span style={{ color: '#64748b', fontSize: 13, marginLeft: 12 }}>
                📍 {activeEmergency.pickup_address}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={activeEmergency.status} />
            {[
              { status: 'en_route', label: '🚦 En Route', show: ['assigned'] },
              { status: 'at_scene', label: '📍 At Scene', show: ['en_route'] },
              { status: 'transporting', label: '🚑 Transporting', show: ['at_scene'] },
              { status: 'completed', label: '✅ Done', show: ['transporting'] },
            ].filter(a => a.show.includes(activeEmergency.status)).map(a => (
              <button key={a.status} onClick={() => updateStatus(a.status)} style={{
                padding: '6px 12px', borderRadius: 7, border: 'none',
                background: '#1e293b', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{a.label}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          background: '#d1fae5', borderRadius: 10, padding: '12px 16px',
          border: '1px solid #6ee7b7', color: '#065f46', fontSize: 13, fontWeight: 500,
        }}>
          ✅ No active dispatch. You are available.
        </div>
      )}

      {/* Full-screen map */}
      <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <MapContainer center={mapCenter} zoom={14} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© OpenStreetMap contributors'
          />
          {myPos && (
            <Marker position={myPos} icon={meIcon}>
              <Popup>🚑 You are here<br />{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Popup>
            </Marker>
          )}
          {pickupPos && (
            <Marker position={pickupPos} icon={pickupIcon}>
              <Popup>📍 Pickup: {activeEmergency?.pickup_address || 'Emergency location'}</Popup>
            </Marker>
          )}
          {hospitalPos && (
            <Marker position={hospitalPos} icon={hospitalIcon}>
              <Popup>🏥 {activeEmergency?.hospital_name}</Popup>
            </Marker>
          )}
          {myPos && pickupPos && (
            <Polyline positions={[myPos, pickupPos]} color="#dc2626" weight={3} dashArray="6" />
          )}
          {pickupPos && hospitalPos && (
            <Polyline positions={[pickupPos, hospitalPos]} color="#3b82f6" weight={3} />
          )}
        </MapContainer>
      </div>

      {/* GPS status bar */}
      <div style={{
        background: '#1e293b', borderRadius: 8, padding: '8px 14px',
        color: '#94a3b8', fontSize: 12, display: 'flex', gap: 20,
      }}>
        <span>📍 {myPos ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Acquiring GPS...'}</span>
        {location?.speed != null && <span>⚡ {(location.speed * 3.6).toFixed(0)} km/h</span>}
        <span style={{ color: broadcasting ? '#4ade80' : '#f87171' }}>
          {broadcasting ? '● Broadcasting' : '○ GPS off'}
        </span>
      </div>
    </div>
  );
}
