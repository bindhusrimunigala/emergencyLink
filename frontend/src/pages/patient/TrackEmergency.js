import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { emergencyAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import StatusBadge from '../../components/StatusBadge';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ambulanceIcon = L.divIcon({
  html: '<div style="font-size:28px;line-height:1">🚑</div>',
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
});
const patientIcon = L.divIcon({
  html: '<div style="font-size:28px;line-height:1">📍</div>',
  className: '', iconSize: [28, 28], iconAnchor: [14, 28],
});
const hospitalIcon = L.divIcon({
  html: '<div style="font-size:28px;line-height:1">🏥</div>',
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
});

export default function TrackEmergency() {
  const { id } = useParams();
  const [emergency, setEmergency] = useState(null);
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEmergency = async () => {
    try {
      const res = await emergencyAPI.getById(id);
      const data = res.data.data;
      setEmergency(data);
      if (data.ambulance_latitude && data.ambulance_longitude) {
        setAmbulancePos([parseFloat(data.ambulance_latitude), parseFloat(data.ambulance_longitude)]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergency();
    const socket = getSocket();
    if (socket) {
      socket.emit('emergency:track', id);
      socket.on('ambulance:location', (data) => {
        if (emergency?.assigned_ambulance_id === data.ambulanceId) {
          setAmbulancePos([data.latitude, data.longitude]);
        }
      });
      socket.on('emergency:updated', (data) => {
        if (data.emergencyId === id) fetchEmergency();
      });
    }
    const interval = setInterval(fetchEmergency, 15000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading emergency details..." />;
  if (!emergency) return <div style={{ color: '#dc2626', padding: 20 }}>Emergency not found.</div>;

  const pickupPos = [parseFloat(emergency.pickup_latitude), parseFloat(emergency.pickup_longitude)];
  const hospitalPos = emergency.hospital_latitude && emergency.hospital_longitude
    ? [parseFloat(emergency.hospital_latitude), parseFloat(emergency.hospital_longitude)]
    : null;

  const statusSteps = ['pending', 'assigned', 'en_route', 'at_scene', 'transporting', 'completed'];
  const currentStep = statusSteps.indexOf(emergency.status);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
          🚑 Tracking Emergency
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
          ID: {emergency.id.slice(0, 8)}...
        </p>
      </div>

      {/* Status timeline */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {statusSteps.map((step, i) => (
            <React.Fragment key={step}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i <= currentStep ? '#dc2626' : '#e2e8f0',
                  color: i <= currentStep ? '#fff' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <div style={{
                  fontSize: 10, color: i <= currentStep ? '#dc2626' : '#94a3b8',
                  marginTop: 4, textAlign: 'center', textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                }}>
                  {step.replace('_', ' ')}
                </div>
              </div>
              {i < statusSteps.length - 1 && (
                <div style={{
                  flex: 1, height: 2,
                  background: i < currentStep ? '#dc2626' : '#e2e8f0',
                  marginBottom: 16, minWidth: 20,
                }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Map */}
        <Card style={{ padding: 0, overflow: 'hidden', height: 400 }}>
          <MapContainer
            center={pickupPos}
            zoom={14}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© OpenStreetMap contributors'
            />
            <Marker position={pickupPos} icon={patientIcon}>
              <Popup>📍 Pickup: {emergency.pickup_address || 'Emergency Location'}</Popup>
            </Marker>
            {ambulancePos && (
              <Marker position={ambulancePos} icon={ambulanceIcon}>
                <Popup>🚑 Ambulance: {emergency.vehicle_number}</Popup>
              </Marker>
            )}
            {hospitalPos && (
              <Marker position={hospitalPos} icon={hospitalIcon}>
                <Popup>🏥 {emergency.hospital_name}</Popup>
              </Marker>
            )}
            {ambulancePos && (
              <Polyline
                positions={[ambulancePos, pickupPos]}
                color="#dc2626" dashArray="6"
              />
            )}
          </MapContainer>
        </Card>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Status</div>
            <StatusBadge status={emergency.status} size="lg" />
            <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>Emergency Type</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{emergency.emergency_type}</div>
            {emergency.estimated_arrival_minutes && (
              <>
                <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>Est. Arrival</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
                  {emergency.estimated_arrival_minutes} min
                </div>
              </>
            )}
          </Card>

          {emergency.vehicle_number && (
            <Card>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>🚑 Ambulance</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{emergency.vehicle_number}</div>
              {emergency.driver_name && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Driver: {emergency.driver_name}
                </div>
              )}
              {emergency.driver_phone && (
                <a href={`tel:${emergency.driver_phone}`} style={{
                  display: 'inline-block', marginTop: 8,
                  background: '#d1fae5', color: '#065f46',
                  padding: '6px 12px', borderRadius: 6,
                  textDecoration: 'none', fontSize: 13, fontWeight: 500,
                }}>
                  📞 Call Driver
                </a>
              )}
            </Card>
          )}

          {emergency.hospital_name && (
            <Card>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>🏥 Hospital</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{emergency.hospital_name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{emergency.hospital_address}</div>
              {emergency.hospital_phone && (
                <a href={`tel:${emergency.hospital_phone}`} style={{
                  display: 'inline-block', marginTop: 8,
                  background: '#dbeafe', color: '#1e40af',
                  padding: '6px 12px', borderRadius: 6,
                  textDecoration: 'none', fontSize: 13, fontWeight: 500,
                }}>
                  📞 Call Hospital
                </a>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
