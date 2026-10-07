import React, { useState, useEffect } from 'react';
import { hospitalAPI } from '../../services/api';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', phone: '',
    latitude: '', longitude: '',
    total_beds: '', available_beds: '',
    has_icu: false, has_trauma_center: false,
    specializations: '',
  });

  const fetchHospitals = () => {
    hospitalAPI.getAll().then(res => setHospitals(res.data.data))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchHospitals(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await hospitalAPI.create({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        total_beds: parseInt(form.total_beds),
        available_beds: parseInt(form.available_beds || form.total_beds),
        specializations: form.specializations ? form.specializations.split(',').map(s => s.trim()) : [],
      });
      setShowForm(false);
      setForm({ name: '', address: '', phone: '', latitude: '', longitude: '', total_beds: '', available_beds: '', has_icu: false, has_trauma_center: false, specializations: '' });
      fetchHospitals();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>🏥 Hospitals</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{hospitals.length} registered hospitals</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '9px 18px', background: '#8b5cf6', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>+ Add Hospital</button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card title="Add New Hospital" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { key: 'name', label: 'Hospital Name *', placeholder: 'City General Hospital' },
                { key: 'phone', label: 'Phone *', placeholder: '044-12345678' },
                { key: 'latitude', label: 'Latitude *', placeholder: '13.0827' },
                { key: 'longitude', label: 'Longitude *', placeholder: '80.2707' },
                { key: 'total_beds', label: 'Total Beds *', placeholder: '200' },
                { key: 'available_beds', label: 'Available Beds', placeholder: 'Same as total' },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.label.includes('*')} style={inputStyle} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Address *</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                required style={inputStyle} placeholder="Full address" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Specializations (comma-separated)</label>
              <input value={form.specializations} onChange={e => setForm({ ...form, specializations: e.target.value })}
                style={inputStyle} placeholder="cardiology, trauma, neurology" />
            </div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.has_icu}
                  onChange={e => setForm({ ...form, has_icu: e.target.checked })} />
                <span style={{ fontSize: 13 }}>ICU Available</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.has_trauma_center}
                  onChange={e => setForm({ ...form, has_trauma_center: e.target.checked })} />
                <span style={{ fontSize: 13 }}>Trauma Center</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{ padding: '8px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving...' : '✅ Create Hospital'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 18px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Hospital list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {hospitals.map(h => {
          const occupancy = h.total_beds > 0
            ? Math.round(((h.total_beds - h.available_beds) / h.total_beds) * 100) : 0;
          return (
            <Card key={h.id} style={{ borderLeft: `4px solid ${h.available_beds > 10 ? '#10b981' : '#f59e0b'}` }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 6 }}>🏥 {h.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{h.address}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>📞 {h.phone}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, background: h.has_icu ? '#d1fae5' : '#fee2e2', color: h.has_icu ? '#065f46' : '#991b1b', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  {h.has_icu ? '✅ ICU' : '❌ ICU'}
                </span>
                <span style={{ fontSize: 11, background: h.has_trauma_center ? '#d1fae5' : '#fee2e2', color: h.has_trauma_center ? '#065f46' : '#991b1b', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  {h.has_trauma_center ? '✅ Trauma' : '❌ Trauma'}
                </span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  <span>Bed occupancy</span>
                  <span>{h.available_beds} / {h.total_beds} available</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${occupancy}%`, height: '100%', background: occupancy > 80 ? '#dc2626' : '#10b981', borderRadius: 4 }} />
                </div>
              </div>
              {h.specializations?.length > 0 && (
                <div style={{ fontSize: 11, color: '#94a3b8' }}>🩺 {h.specializations.join(', ')}</div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
