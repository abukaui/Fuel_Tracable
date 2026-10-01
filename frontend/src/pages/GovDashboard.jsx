import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function GovDashboard() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient('/api/stations')
      .then(data => {
        setStations(data.stations || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load stations.');
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'green';
      case 'CLOSED': return 'gray';
      case 'OUT_OF_STOCK': return 'red';
      case 'SUSPENDED': return 'darkred';
      default: return 'black';
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Government & Admin Dashboard</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem', borderBottom: '1px solid #ccc' }}>SID</th>
            <th style={{ padding: '0.5rem', borderBottom: '1px solid #ccc' }}>Station Name</th>
            <th style={{ padding: '0.5rem', borderBottom: '1px solid #ccc' }}>Location</th>
            <th style={{ padding: '0.5rem', borderBottom: '1px solid #ccc' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {stations.map(station => (
            <tr 
              key={station.id} 
              onClick={() => navigate(`/stations/${station.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{station.sid}</td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{station.name}</td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{station.location_name}</td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', color: getStatusColor(station.current_status), fontWeight: 'bold' }}>
                {station.current_status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
