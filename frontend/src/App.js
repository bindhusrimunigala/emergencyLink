import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';

// Patient pages
import PatientDashboard from './pages/patient/PatientDashboard';
import RequestEmergency from './pages/patient/RequestEmergency';
import TrackEmergency from './pages/patient/TrackEmergency';
import EmergencyHistory from './pages/patient/EmergencyHistory';

// Driver pages
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverNavigate from './pages/driver/DriverNavigate';

// Hospital pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import IncomingEmergencies from './pages/hospital/IncomingEmergencies';
import HospitalCapacity from './pages/hospital/HospitalCapacity';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEmergencies from './pages/admin/AdminEmergencies';
import AdminAmbulances from './pages/admin/AdminAmbulances';
import AdminHospitals from './pages/admin/AdminHospitals';
import AdminUsers from './pages/admin/AdminUsers';

// Protected route — requires auth + optional role check
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner message="Loading session..." />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to the user's home based on their actual role
    const homeByRole = {
      patient: '/patient',
      driver: '/driver',
      hospital_staff: '/hospital',
      admin: '/admin',
    };
    return <Navigate to={homeByRole[user.role] || '/'} replace />;
  }

  return <Layout>{children}</Layout>;
}

// Root redirect based on role
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  const redirects = {
    patient: '/patient',
    driver: '/driver',
    hospital_staff: '/hospital',
    admin: '/admin',
  };
  return <Navigate to={redirects[user.role] || '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Patient routes */}
      <Route path="/patient" element={
        <ProtectedRoute roles={['patient']}>
          <PatientDashboard />
        </ProtectedRoute>
      } />
      <Route path="/patient/emergency" element={
        <ProtectedRoute roles={['patient']}>
          <RequestEmergency />
        </ProtectedRoute>
      } />
      <Route path="/patient/track/:id" element={
        <ProtectedRoute roles={['patient', 'admin']}>
          <TrackEmergency />
        </ProtectedRoute>
      } />
      <Route path="/patient/history" element={
        <ProtectedRoute roles={['patient']}>
          <EmergencyHistory />
        </ProtectedRoute>
      } />

      {/* Driver routes */}
      <Route path="/driver" element={
        <ProtectedRoute roles={['driver']}>
          <DriverDashboard />
        </ProtectedRoute>
      } />
      <Route path="/driver/navigate" element={
        <ProtectedRoute roles={['driver']}>
          <DriverNavigate />
        </ProtectedRoute>
      } />

      {/* Hospital routes */}
      <Route path="/hospital" element={
        <ProtectedRoute roles={['hospital_staff']}>
          <HospitalDashboard />
        </ProtectedRoute>
      } />
      <Route path="/hospital/incoming" element={
        <ProtectedRoute roles={['hospital_staff']}>
          <IncomingEmergencies />
        </ProtectedRoute>
      } />
      <Route path="/hospital/capacity" element={
        <ProtectedRoute roles={['hospital_staff']}>
          <HospitalCapacity />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/emergencies" element={
        <ProtectedRoute roles={['admin']}>
          <AdminEmergencies />
        </ProtectedRoute>
      } />
      <Route path="/admin/ambulances" element={
        <ProtectedRoute roles={['admin']}>
          <AdminAmbulances />
        </ProtectedRoute>
      } />
      <Route path="/admin/hospitals" element={
        <ProtectedRoute roles={['admin']}>
          <AdminHospitals />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute roles={['admin']}>
          <AdminUsers />
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
