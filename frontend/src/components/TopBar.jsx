import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      padding: '1rem',
      backgroundColor: '#333',
      color: 'white',
      alignItems: 'center'
    }}>
      <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Fuel Distribution System</h1>
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
