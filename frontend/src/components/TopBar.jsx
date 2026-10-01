import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function TopBar() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: '', role: '' });

  useEffect(() => {
    apiClient('/api/auth/me')
      .then(data => {
        if (data.user) {
          setUser({ name: data.user.full_name, role: data.user.role });
        }
      })
      .catch(console.error);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const renderNavLinks = () => {
    if (user.role === 'GOV_REGULATOR' || user.role === 'ADMIN') {
      return (
        <nav style={{ display: 'flex', gap: '1rem', marginLeft: '2rem' }}>
          <Link to="/stations" style={{ color: 'white', textDecoration: 'none' }}>Stations</Link>
          <Link to="/complaints" style={{ color: 'white', textDecoration: 'none' }}>Complaints</Link>
          <Link to="/audit-logs" style={{ color: 'white', textDecoration: 'none' }}>Audit Logs</Link>
        </nav>
      );
    }
    if (user.role === 'STATION_OPERATOR') {
      return (
        <nav style={{ display: 'flex', gap: '1rem', marginLeft: '2rem' }}>
          <Link to="/operator" style={{ color: 'white', textDecoration: 'none' }}>Operator Dashboard</Link>
        </nav>
      );
    }
    return null;
  };

  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      padding: '1rem',
      backgroundColor: '#333',
      color: 'white',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Fuel Distribution System</h1>
        {renderNavLinks()}
      </div>
      <div>
        {user.name ? (
          <>
            <span style={{ marginRight: '1rem' }}>User: {user.name}</span>
            <span style={{ marginRight: '1rem' }}>Role: {user.role}</span>
          </>
        ) : (
          <span style={{ marginRight: '1rem' }}>Loading...</span>
        )}
        <button onClick={handleLogout} style={{ padding: '0.3rem 0.8rem' }}>Logout</button>
      </div>
    </header>
  );
}
