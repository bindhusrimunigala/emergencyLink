import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const navByRole = {
  patient: [
    { to: '/patient', label: '🏠 Dashboard' },
    { to: '/patient/emergency', label: '🚨 New Emergency' },
    { to: '/patient/history', label: '📋 History' },
  ],
  driver: [
    { to: '/driver', label: '🏠 Dashboard' },
    { to: '/driver/navigate', label: '🗺️ Navigate' },
  ],
  hospital_staff: [
    { to: '/hospital', label: '🏠 Dashboard' },
    { to: '/hospital/incoming', label: '🚑 Incoming' },
    { to: '/hospital/capacity', label: '🛏️ Capacity' },
  ],
  admin: [
    { to: '/admin', label: '🏠 Dashboard' },
    { to: '/admin/emergencies', label: '🚨 Emergencies' },
    { to: '/admin/ambulances', label: '🚑 Ambulances' },
    { to: '/admin/hospitals', label: '🏥 Hospitals' },
    { to: '/admin/users', label: '👥 Users' },
  ],
};

const roleColors = {
  patient: '#3b82f6',
  driver: '#10b981',
  hospital_staff: '#8b5cf6',
  admin: '#dc2626',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navLinks = navByRole[user?.role] || [];
  const accentColor = roleColors[user?.role] || '#dc2626';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 64,
        background: '#1e293b',
        transition: 'width 0.2s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
        }} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>🔴</span>
          {sidebarOpen && (
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
              EmergencyLink
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {navLinks.map(link => {
            const active = location.pathname === link.to;
            return (
              <Link key={link.to} to={link.to} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                color: active ? '#fff' : '#94a3b8',
                textDecoration: 'none',
                background: active ? accentColor : 'transparent',
                borderRadius: 8,
                margin: '2px 8px',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{link.label.split(' ')[0]}</span>
                {sidebarOpen && (
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>
                    {link.label.split(' ').slice(1).join(' ')}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: 12, borderTop: '1px solid #334155' }}>
          {sidebarOpen ? (
            <div>
              <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                {user?.name}
              </div>
              <div style={{
                display: 'inline-block',
                background: accentColor,
                color: '#fff',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                marginBottom: 8,
              }}>
                {user?.role?.replace('_', ' ')}
              </div>
              <button onClick={handleLogout} style={{
                display: 'block',
                width: '100%',
                padding: '8px',
                background: '#334155',
                color: '#f1f5f9',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}>
                Sign out
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 20,
              padding: 4,
            }} title="Sign out">🚪</button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 10, height: 10,
              borderRadius: '50%',
              background: accentColor,
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 14, color: '#64748b', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ')} Portal
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <NotificationBell />
            <span style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
