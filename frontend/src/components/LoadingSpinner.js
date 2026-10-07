import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 48, gap: 16,
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #dc2626',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#64748b', fontSize: 14 }}>{message}</p>
    </div>
  );
}
