import React from 'react';

export default function Card({ children, style = {}, title, action }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9',
        }}>
          {title && <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
