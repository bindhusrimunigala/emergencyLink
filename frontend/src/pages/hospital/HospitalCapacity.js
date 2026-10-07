import React, { useState, useEffect } from 'react';
import { hospitalAPI } from '../../services/api';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function HospitalCapacity() {
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    hospitalAPI.getMine().then(res => {
      const h = res.data.data;
      setHospital(h);
      setForm({
        available_beds: h.available_beds,
        has_icu: h.has_icu,
        has_trauma_center: h.has_trauma_center,
        phone: h.phone,
        specializations: (h.specializations || []).join(', '),
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await hospitalAPI.update(hospital.id, {
        ...form,
        available_beds: parseInt(form.available_beds),
        specializations: form.specializations
          ? form.specializations.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      });
      setHospital(res.data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!hospital) return <div style={{ padding: 24, color: '#64748b' }}>No hospital assigned.</div>;

  const occupancy = hospital.total_beds > 0
    ? Math.round(((hospital.total_beds - hospital.available_beds) / hospital.total_beds) * 100)
    : 0;

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>🛏️ Capacity Management</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>{hospital.name}</p>
      </div>

      {/* Occupancy visualizer */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Bed Occupancy</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: occupancy > 80 ? '#dc2626' : '#10b981' }}>
              {occupancy}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Available / Total</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
              {hospital.available_beds} / {hospital.total_beds}
            </div>
          </div>
        </div>
        <div style={{ background: '#f1f5f9', borderRadius: 8, height: 16, overflow: 'hidden' }}>
          <div style={{
            width: `${occupancy}%`, height: '100%', borderRadius: 8,
            background: occupancy > 80 ? '#dc2626' : occupancy > 60 ? '#f59e0b' : '#10b981',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>0%</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>100%</span>
        </div>
      </Card>

      {/* Edit form */}
      <Card title="Update Hospital Information">
        {saved && (
          <div style={{
            background: '#d1fae5', border: '1px solid #6ee7b7',
            color: '#065f46', padding: '10px 14px',
            borderRadius: 7, marginBottom: 14, fontSize: 13,
          }}>
            ✅ Information updated successfully
          </div>
        )}
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Available Beds</label>
            <input
              type="number"
              min="0"
              max={hospital.total_beds}
              value={form.available_beds ?? ''}
              onChange={e => setForm({ ...form, available_beds: e.target.value })}
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
              Max: {hospital.total_beds} total beds
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Contact Phone</label>
            <input
              type="tel"
              value={form.phone ?? ''}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Specializations (comma separated)</label>
            <input
              type="text"
              value={form.specializations ?? ''}
              onChange={e => setForm({ ...form, specializations: e.target.value })}
              style={inputStyle}
              placeholder="e.g. cardiology, trauma, neurology"
            />
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.has_icu ?? false}
                onChange={e => setForm({ ...form, has_icu: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 14, color: '#374151' }}>ICU Available</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.has_trauma_center ?? false}
                onChange={e => setForm({ ...form, has_trauma_center: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 14, color: '#374151' }}>Trauma Center</span>
            </label>
          </div>

          <button type="submit" disabled={saving} style={{
            padding: '10px 24px', background: saving ? '#94a3b8' : '#8b5cf6',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </form>
      </Card>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 };
const inputStyle = {
  width: '100%', padding: '9px 11px',
  border: '1px solid #d1d5db', borderRadius: 7,
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
