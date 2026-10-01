import { Navigate, Outlet } from 'react-router-dom';
import TopBar from './TopBar';

export default function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Very basic decoding for UI purposes only
  let role = null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    role = payload.role;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'DRIVER') {
    return (
      <div>
        <TopBar />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>This dashboard is for government regulators, administrators, and station operators.</h2>
          <p>Drivers should use the USSD service to access fuel services.</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div>
        <TopBar />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>You do not have access to this dashboard.</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar />
      <Outlet />
    </div>
  );
}
