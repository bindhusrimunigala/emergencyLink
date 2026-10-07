import React, { useState, useEffect } from 'react';
import { emergencyAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import StatusBadge from '../../components/StatusBadge';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminEmergencies() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [selected, setSelected] = useState(null);

  const fetchData = async () => {
    try {
      const res = filter === 'active'
        ? await emergencyAPI.getActive()
        : await emergencyAPI.getAll({ status: filter === 'all' ? undefined : filter });
      setEmergencies(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filter]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) socket.on('emergency:updated', fetchData);
    return () => { const s = getSocket(); if (s) s.off('emergency:updated', fetchData); };
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await emergencyAPI.updateStatus(id, { status });
      fetchData();
      setSelected(null);
    } catch (err) { console.error(err); }
  };

  const priorityColors = { critical: '#dc2626', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>🚨 Emergency Management</h1>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['active', 'all', 'pending', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: filter === f ? '2px solid #dc2626' : '1px solid #e2e8f0',
            background: filter === f ? '#fee2e2' : '#fff',
            color: filter === f ? '#991b1b' : '#64748b',
            fontSize: 13, cursor: 'pointer', fontWeight: filter === f ? 600 : 400,
            textTransform: 'capitalize',
          }}>{f}</button>
        ))}
        <span style={{ fontSize: 13, color: '#64748b', alignSelf: 'center', marginLeft: 4 }}>
          {emergencies.length} records
        </span>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: 16 }}>
          {/* Table */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Patient', 'Emergency', 'Priority', 'Status', 'Ambulance', 'Hospital', 'ETA', 'Time'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: 11, fontWeight: 600, color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      borderBottom: '1px solid #e2e8f0',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emergencies.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                    No emergencies found
                  </td></tr>
                ) : emergencies.map(em => (
                  <tr key={em.id}
                    onClick={() => setSelected(selected?.id === em.id ? null : em)}
                    style={{
                      borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                      background: selected?.id === em.id ? '#fef2f2' : '#fff',
                      borderLeft: `3px solid ${priorityColors[em.priority] || '#e2e8f0'}`,
                    }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{em.patient_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{em.patient_phone}</div>
                    </td>
                    <td style={tdStyle}><span style={{ fontSize: 13 }}>{em.emergency_type}</span></td>
                    <td style={tdStyle}><StatusBadge status={em.priority} /></td>
                    <td style={tdStyle}><StatusBadge status={em.status} /></td>
                    <td style={tdStyle}><span style={{ fontSize: 12 }}>{em.ambulance_vehicle_number || '—'}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: 12 }}>{em.hospital_name || '—'}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: 12 }}>{em.estimated_arrival_minutes ? `${em.estimated_arrival_minutes}m` : '—'}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(em.created_at).toLocaleTimeString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Detail panel */}
          {selected && (
            <Card title="Emergency Details" action={
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>✕</button>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Row label="Patient" value={`${selected.patient_name} (${selected.patient_phone})`} />
                <Row label="Emergency" value={selected.emergency_type} />
                <Row label="Priority" value={<StatusBadge status={selected.priority} />} />
                <Row label="Status" value={<StatusBadge status={selected.status} />} />
                {selected.description && <Row label="Description" value={selected.description} />}
                {selected.pickup_address && <Row label="Pickup" value={selected.pickup_address} />}
                {selected.hospital_name && <Row label="Hospital" value={selected.hospital_name} />}
                {selected.ambulance_vehicle_number && <Row label="Ambulance" value={selected.ambulance_vehicle_number} />}
                {selected.driver_name && <Row label="Driver" value={selected.driver_name} />}
                <Row label="Created" value={new Date(selected.created_at).toLocaleString()} />

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>UPDATE STATUS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['assigned', 'en_route', 'at_scene', 'transporting', 'completed', 'cancelled'].map(s => (
                      <button key={s} onClick={() => updateStatus(selected.id, s)} style={{
                        padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
                        background: selected.status === s ? '#1e293b' : '#fff',
                        color: selected.status === s ? '#fff' : '#374151',
                        fontSize: 11, cursor: 'pointer', fontWeight: 500,
                        textTransform: 'capitalize',
                      }}>{s.replace('_', ' ')}</button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

const tdStyle = { padding: '10px 14px', verticalAlign: 'middle' };
const Row = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 13, color: '#1e293b', marginTop: 2 }}>{value}</div>
  </div>
);
