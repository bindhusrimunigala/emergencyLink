import React, { useState, useEffect } from 'react';
import { ambulanceAPI, adminAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminAmbulances() {
  const [ambulances, setAmbulances] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_number: '', driver_id: '', equipment: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    const [ambRes, userRes] = await Promise.all([
      ambulanceAPI.getAll(),
      adminAPI.getUsers({ role: 'driver' }),
    ]);
    setAmbulances(ambRes.data.data);
    setUsers(userRes.data.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ambulanceAPI.create({
        ...form,
        equipment: form.equipment ? form.equipment.split(',').map(s => s.trim()) : [],
      });
      setForm({ vehicle_number: '', driver_id: '', equipment: '' });
      setShowForm(false);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const filtered = filter === 'all' ? ambulances : ambulances.filter(a => a.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>🚑 Ambulance Fleet</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{ambulances.length} vehicles total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '9px 18px', background: '#dc2626', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          + Add Ambulance
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card style={{ marginBottom: 16 }} title="Add New Ambulance">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Vehicle Number *</label>
                <input value={form.vehicle_number}
                  onChange={e => setForm({ ...form, vehicle_number: e.target.value })}
                  required style={inputStyle} placeholder="TN01AB1234" />
              </div>
              <div>
                <label style={labelStyle}>Assign Driver</label>
                <select value={form.driver_id}
                  onChange={e => setForm({ ...form, driver_id: e.target.value })}
                  style={inputStyle}>
                  <option value="">-- Unassigned --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Equipment (comma-separated)</label>
                <input value={form.equipment}
                  onChange={e => setForm({ ...form, equipment: e.target.value })}
                  style={inputStyle} placeholder="oxygen, stretcher" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{
                padding: '8px 18px', background: '#10b981', color: '#fff',
                border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{saving ? 'Saving...' : '✅ Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                padding: '8px 18px', background: '#f1f5f9', color: '#64748b',
                border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'available', 'dispatched', 'en_route', 'maintenance', 'offline'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12,
            border: filter === s ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            background: filter === s ? '#dbeafe' : '#fff',
            color: filter === s ? '#1e40af' : '#64748b',
            cursor: 'pointer', textTransform: 'capitalize',
          }}>{s}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map(amb => (
          <Card key={amb.id} style={{ borderLeft: `4px solid ${amb.status === 'available' ? '#10b981' : amb.status === 'dispatched' || amb.status === 'en_route' ? '#dc2626' : '#f59e0b'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>🚑 {amb.vehicle_number}</div>
              <StatusBadge status={amb.status} />
            </div>
            <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
              {amb.driver_name ? `👤 ${amb.driver_name}` : '👤 No driver assigned'}
            </div>
            {amb.driver_phone && (
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>📞 {amb.driver_phone}</div>
            )}
            {amb.current_latitude && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                📍 {parseFloat(amb.current_latitude).toFixed(4)}, {parseFloat(amb.current_longitude).toFixed(4)}
              </div>
            )}
            {amb.equipment?.length > 0 && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                🩺 {amb.equipment.join(', ')}
              </div>
            )}
            {amb.last_location_update && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Last update: {new Date(amb.last_location_update).toLocaleTimeString()}
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: '#94a3b8' }}>
            No ambulances found
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
