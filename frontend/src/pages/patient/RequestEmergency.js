import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { emergencyAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useGeolocation from '../../hooks/useGeolocation';
import Card from '../../components/Card';

const EMERGENCY_TYPES = [
  '🚗 Road Accident', '❤️ Cardiac Arrest', '🧠 Stroke',
  '🩸 Severe Bleeding', '🔥 Burns', '😮‍💨 Breathing Difficulty',
  '🤕 Head Injury', '🦴 Fracture', '🤰 Pregnancy Emergency', '🌡️ Other Medical',
];

export default function RequestEmergency() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location, error: geoError, loading: geoLoading } = useGeolocation();

  const [form, setForm] = useState({
    patient_name: user?.name || '',
    patient_phone: user?.phone || '',
    emergency_type: '',
    description: '',
    pickup_latitude: '',
    pickup_longitude: '',
    pickup_address: '',
    priority: 'high',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location) {
      setForm(prev => ({
        ...prev,
        pickup_latitude: location.latitude,
        pickup_longitude: location.longitude,
        pickup_address: `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
      }));
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.emergency_type) { setError('Please select an emergency type'); return; }
    if (!form.pickup_latitude || !form.pickup_longitude) { setError('Location is required'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await emergencyAPI.create(form);
      navigate(`/patient/track/${res.data.data.id}`, {
        state: { message: res.data.message }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create emergency request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>🚨 Request Emergency</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Fill in the details. An ambulance will be dispatched immediately.
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5',
          color: '#991b1b', padding: '12px 16px', borderRadius: 8,
          marginBottom: 16, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Emergency type */}
        <Card title="Emergency Type" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {EMERGENCY_TYPES.map(type => (
              <button key={type} type="button"
                onClick={() => setForm({ ...form, emergency_type: type.split(' ').slice(1).join(' ') })}
                style={{
                  padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                  border: form.emergency_type === type.split(' ').slice(1).join(' ')
                    ? '2px solid #dc2626' : '1px solid #e2e8f0',
                  background: form.emergency_type === type.split(' ').slice(1).join(' ')
                    ? '#fee2e2' : '#fff',
                  cursor: 'pointer', fontSize: 13,
                  color: form.emergency_type === type.split(' ').slice(1).join(' ') ? '#991b1b' : '#374151',
                }}>
                {type}
              </button>
            ))}
          </div>
        </Card>

        {/* Patient info */}
        <Card title="Patient Information" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Patient Name *</label>
              <input value={form.patient_name}
                onChange={e => setForm({ ...form, patient_name: e.target.value })}
                required style={inputStyle} placeholder="Full name" />
            </div>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input value={form.patient_phone}
                onChange={e => setForm({ ...form, patient_phone: e.target.value })}
                required style={inputStyle} placeholder="Mobile number" />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Priority</label>
            <select value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              style={inputStyle}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3} style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Describe the emergency situation..." />
          </div>
        </Card>

        {/* Location */}
        <Card title="Pickup Location" style={{ marginBottom: 20 }}>
          {geoLoading && (
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
              📍 Getting your location...
            </div>
          )}
          {geoError && (
            <div style={{
              background: '#fef3c7', border: '1px solid #fde68a',
              color: '#92400e', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 12,
            }}>
              ⚠️ Could not get location automatically. Please enter manually.
            </div>
          )}
          {location && (
            <div style={{
              background: '#d1fae5', border: '1px solid #6ee7b7',
              color: '#065f46', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 12,
            }}>
              ✅ Location detected: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Latitude *</label>
              <input type="number" step="any" value={form.pickup_latitude}
                onChange={e => setForm({ ...form, pickup_latitude: e.target.value })}
                required style={inputStyle} placeholder="13.0827" />
            </div>
            <div>
              <label style={labelStyle}>Longitude *</label>
              <input type="number" step="any" value={form.pickup_longitude}
                onChange={e => setForm({ ...form, pickup_longitude: e.target.value })}
                required style={inputStyle} placeholder="80.2707" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Address (optional)</label>
            <input value={form.pickup_address}
              onChange={e => setForm({ ...form, pickup_address: e.target.value })}
              style={inputStyle} placeholder="Street address or landmark" />
          </div>
        </Card>

        <button type="submit" disabled={submitting} style={{
          width: '100%', padding: '14px',
          background: submitting ? '#fca5a5' : '#dc2626',
          color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 16, fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
        }}>
          {submitting ? '🚑 Dispatching Ambulance...' : '🚨 Request Ambulance Now'}
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };
const inputStyle = {
  width: '100%', padding: '9px 11px',
  border: '1px solid #d1d5db', borderRadius: 7,
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
