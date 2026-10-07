import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'patient' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.register(form);
      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
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
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔴</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Create Account</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Join EmergencyLink as a patient</p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5',
            color: '#991b1b', padding: '10px 14px', borderRadius: 8,
            marginBottom: 16, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
            { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 9876543210' },
            { key: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                {field.label}
              </label>
              <input
                type={field.type}
                value={form[field.key]}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                required={field.key !== 'phone'}
                placeholder={field.placeholder}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', marginTop: 8,
            background: loading ? '#fca5a5' : '#dc2626',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#dc2626', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
