import React from 'react';

export default function StatCard({ label, value, icon, color = '#3b82f6', sub }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      padding: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}
