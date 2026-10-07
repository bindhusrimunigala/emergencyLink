import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const redirects = {
        patient: '/patient',
        driver: '/driver',
        hospital_staff: '/hospital',
        admin: '/admin',
      };
      navigate(redirects[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b 0%, #dc2626 100%)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 40,
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔴</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>EmergencyLink</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Emergency Coordination Platform</p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5',
            color: '#991b1b', padding: '10px 14px',
            borderRadius: 8, marginBottom: 16, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              placeholder="your@email.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px',
            background: loading ? '#fca5a5' : '#dc2626',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            New patient?{' '}
            <Link to="/register" style={{ color: '#dc2626', fontWeight: 600 }}>
              Create account
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div style={{
          marginTop: 24, padding: 14,
          background: '#f8fafc', borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}>
          <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>DEMO CREDENTIALS</p>
          {[
            ['Admin', 'admin@emergencylink.com'],
            ['Driver', 'driver1@emergencylink.com'],
            ['Hospital', 'hospital1@emergencylink.com'],
            ['Patient', 'patient@emergencylink.com'],
          ].map(([role, email]) => (
            <div key={role} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{role}:</span>
              <button onClick={() => setForm({ email, password: 'password123' })} style={{
                background: 'none', border: 'none', color: '#3b82f6',
                fontSize: 11, cursor: 'pointer', padding: 0,
              }}>{email}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px',
  border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};
