import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { apiClient } from '../api/client';

export default function ProtectedRoute({ allowedRoles }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  let tokenRole = null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    tokenRole = payload.role;
  } catch {
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  // Clear role restriction screen for DRIVER or STATION_OPERATOR attempting gov dashboard
  if (allowedRoles && !allowedRoles.includes(tokenRole)) {
    const isOperator = tokenRole === 'STATION_OPERATOR';
    const isDriver = tokenRole === 'DRIVER';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '1rem' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '3rem 2rem', borderRadius: '16px', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
            {isDriver ? '📱' : '⛽'}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)' }}>
            Dashboard Restricted
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {isDriver
              ? 'This dashboard is for fuel regulators and administrators. Drivers access fuel requests and quotas via the USSD mobile shortcode.'
              : 'This dashboard is for government regulators and administrators. Station operators manage pump dispenses in the Operator Terminal.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {isOperator && (
              <button className="btn btn-primary" onClick={() => navigate('/operator')}>
                Go to Operator Terminal
              </button>
            )}
            <button
              className="btn btn-outline"
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/login');
              }}
            >
              Sign Out
            </button>
          </div>
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
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
