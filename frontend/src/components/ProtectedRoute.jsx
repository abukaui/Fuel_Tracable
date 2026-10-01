import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar, { TopBar } from './Sidebar';
import { apiClient } from '../api/client';

export default function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  let tokenRole = null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    tokenRole = payload.role;
  } catch {
    return <Navigate to="/login" replace />;
  }

  if (tokenRole === 'DRIVER') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '3rem', borderRadius: '16px', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Drivers use USSD</h2>
          <p style={{ color: 'var(--text-muted)' }}>This dashboard is for regulators, admins, and operators. Drivers access services via the USSD shortcode.</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(tokenRole)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '3rem', borderRadius: '16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
          <h2>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <AuthenticatedLayout role={tokenRole} />;
}

function AuthenticatedLayout({ role }) {
  const [user, setUser] = useState({ name: '', role });

  useEffect(() => {
    apiClient('/api/auth/me')
      .then(data => {
        if (data.user) setUser({ name: data.user.full_name, role: data.user.role });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="app-layout">
      <Sidebar role={user.role || role} userName={user.name} />
      <div className="main-content">
        <TopBar userName={user.name} role={user.role || role} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
