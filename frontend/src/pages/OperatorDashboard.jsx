import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export default function OperatorDashboard() {
  const [user, setUser] = useState({ name: '' });
  
  // NOTE: Backend does not yet have operator-to-station assignment.
  // This is just a scaffold for Day 16.
  const [stationInfo, setStationInfo] = useState({
    name: 'Placeholder Station',
    sid: 'STA-XXX',
    status: 'UNKNOWN'
  });

  useEffect(() => {
    apiClient('/api/auth/me')
      .then(data => {
        if (data.user) {
          setUser({ name: data.user.full_name });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Station Operator Dashboard</h2>
      <p>Welcome, {user.name || 'Operator'}</p>

      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h3>My Station</h3>
        <hr style={{ margin: '1rem 0' }} />
        <p><strong>Station:</strong> {stationInfo.name}</p>
        <p><strong>SID:</strong> {stationInfo.sid}</p>
        <p><strong>Current Status:</strong> {stationInfo.status}</p>
        
        <p style={{ marginTop: '1rem', fontStyle: 'italic', color: '#666' }}>
          Note: Station assignment lookup requires a future backend update.
        </p>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h3>Available Operations</h3>
        <hr style={{ margin: '1rem 0' }} />
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li style={{ marginBottom: '1rem' }}>
            <strong>Fuel Requests</strong>
            <div style={{ color: '#666' }}>Coming Day 18</div>
          </li>
          <li style={{ marginBottom: '1rem' }}>
            <strong>Tank / ATG Status</strong>
            <div style={{ color: '#666' }}>Coming Day 17</div>
          </li>
          <li style={{ marginBottom: '1rem' }}>
            <strong>Declare Station Status</strong>
            <div style={{ color: '#666' }}>Coming Day 17</div>
          </li>
        </ul>
      </div>
    </div>
  );
}
