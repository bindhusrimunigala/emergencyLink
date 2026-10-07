import React, { useState, useEffect } from 'react';
import { adminAPI, hospitalAPI } from '../../services/api';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';

const roleColors = {
  patient: '#3b82f6', driver: '#10b981',
  hospital_staff: '#8b5cf6', admin: '#dc2626',
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'patient', hospital_id: '' });

  const fetchData = async () => {
    const [userRes, hospRes] = await Promise.all([
      adminAPI.getUsers(roleFilter !== 'all' ? { role: roleFilter } : {}),
      hospitalAPI.getAll(),
    ]);
    setUsers(userRes.data.data);
    setHospitals(hospRes.data.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [roleFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.createUser(form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', phone: '', role: 'patient', hospital_id: '' });
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to create user'); }
    finally { setSaving(false); }
  };

  const toggleUser = async (id) => {
    await adminAPI.toggleUser(id);
    fetchData();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>👥 User Management</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{users.length} users</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '9px 18px', background: '#3b82f6', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>+ Add User</button>
      </div>

      {/* Add user form */}
      {showForm && (
        <Card title="Create New User" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { key: 'name', label: 'Full Name *', type: 'text', placeholder: 'John Doe' },
                { key: 'email', label: 'Email *', type: 'email', placeholder: 'john@example.com' },
                { key: 'password', label: 'Password *', type: 'password', placeholder: 'Min 6 chars' },
                { key: 'phone', label: 'Phone', type: 'tel', placeholder: '9876543210' },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type} value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.label.includes('*')} style={inputStyle} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Role *</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
                  {['patient', 'driver', 'hospital_staff', 'admin'].map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              {form.role === 'hospital_staff' && (
                <div>
                  <label style={labelStyle}>Assign Hospital</label>
                  <select value={form.hospital_id} onChange={e => setForm({ ...form, hospital_id: e.target.value })} style={inputStyle}>
                    <option value="">-- Select Hospital --</option>
                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{ padding: '8px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Creating...' : '✅ Create User'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 18px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Role filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'patient', 'driver', 'hospital_staff', 'admin'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12,
            border: roleFilter === r ? `2px solid ${roleColors[r] || '#64748b'}` : '1px solid #e2e8f0',
            background: roleFilter === r ? `${roleColors[r]}18` || '#f1f5f9' : '#fff',
            color: roleFilter === r ? roleColors[r] || '#374151' : '#64748b',
            cursor: 'pointer', textTransform: 'capitalize',
          }}>{r.replace('_', ' ')}</button>
        ))}
      </div>

      {/* User table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}><span style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</span></td>
                <td style={tdStyle}><span style={{ fontSize: 12, color: '#64748b' }}>{u.email}</span></td>
                <td style={tdStyle}><span style={{ fontSize: 12, color: '#64748b' }}>{u.phone || '—'}</span></td>
                <td style={tdStyle}>
                  <span style={{ background: `${roleColors[u.role]}18`, color: roleColors[u.role], padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ background: u.is_active ? '#d1fae5' : '#fee2e2', color: u.is_active ? '#065f46' : '#991b1b', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle}><span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString()}</span></td>
                <td style={tdStyle}>
                  <button onClick={() => toggleUser(u.id)} style={{
                    padding: '4px 12px', borderRadius: 6, border: 'none',
                    background: u.is_active ? '#fee2e2' : '#d1fae5',
                    color: u.is_active ? '#dc2626' : '#10b981',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>{u.is_active ? 'Deactivate' : 'Activate'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const tdStyle = { padding: '10px 14px', verticalAlign: 'middle' };
