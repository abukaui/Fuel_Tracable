import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = await apiClient('/api/auth/login', {
        body: { phone, password }
      });
      
      const token = data.result?.token;
      if (!token) throw new Error('Invalid phone number or password.');
      
      localStorage.setItem('token', token);

      // Decode token for routing
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.role;

      if (role === 'GOV_REGULATOR' || role === 'ADMIN') {
        navigate('/stations');
      } else if (role === 'STATION_OPERATOR') {
        navigate('/operator');
      } else {
        // Just send drivers to / to trigger the catch-all protected route message
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Invalid phone number or password.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Login</h2>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block' }}>Phone</label>
          <input 
            type="text" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            style={{ width: '100%', padding: '0.5rem' }} 
            required 
          />
        </div>
        <div>
          <label style={{ display: 'block' }}>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '100%', padding: '0.5rem' }} 
            required 
          />
        </div>
        <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px' }}>
          Login
        </button>
      </form>
    </div>
  );
}
