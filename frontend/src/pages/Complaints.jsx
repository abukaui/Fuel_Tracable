import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');

  const fetchComplaints = async () => {
    try {
      const data = await apiClient('/api/complaints');
      setComplaints(data.complaints || []);
    } catch (err) {
      setError(err.message || 'Unable to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setRole(payload.role);
      } catch (e) {
        // ignore
      }
    }
    fetchComplaints();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await apiClient(`/api/complaints/${id}`, {
        body: { status: newStatus }
      });
      // Update local state without full refresh
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    let color = 'gray';
    if (status === 'OPEN') color = 'darkorange';
    if (status === 'REVIEWED') color = 'green';
    
    return (
      <span style={{ 
        display: 'inline-block',
        padding: '2px 8px', 
        backgroundColor: color, 
        color: 'white', 
        fontWeight: 'bold', 
        borderRadius: '4px',
        fontSize: '0.85em'
      }}>
        {status}
      </span>
    );
  };

  const formatDate = (ds) => {
    if (!ds) return 'N/A';
    const d = new Date(ds);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading complaints...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Driver Complaints</h2>

      <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.75rem' }}>Date</th>
              <th style={{ padding: '0.75rem' }}>Station</th>
              <th style={{ padding: '0.75rem' }}>Category</th>
              <th style={{ padding: '0.75rem' }}>Description</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              {role === 'GOV_REGULATOR' && <th style={{ padding: '0.75rem' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr>
                <td colSpan={role === 'GOV_REGULATOR' ? '6' : '5'} style={{ padding: '1.5rem', textAlign: 'center', color: '#666' }}>
                  No complaints found.
                </td>
              </tr>
            ) : (
              complaints.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.9em', color: '#555' }}>
                    {formatDate(row.created_at)}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <strong>{row.station_name}</strong><br />
                    <span style={{ fontSize: '0.85em', color: '#666' }}>{row.station_sid}</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{row.category}</td>
                  <td style={{ padding: '0.75rem', maxWidth: '300px' }}>{row.description}</td>
                  <td style={{ padding: '0.75rem' }}>{getStatusBadge(row.status)}</td>
                  {role === 'GOV_REGULATOR' && (
                    <td style={{ padding: '0.75rem' }}>
                      {row.status === 'OPEN' ? (
                        <select 
                          onChange={(e) => {
                            if (e.target.value) handleUpdateStatus(row.id, e.target.value);
                            e.target.value = ''; // Reset select
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Update Status</option>
                          <option value="REVIEWED">Mark REVIEWED</option>
                          <option value="DISMISSED">Mark DISMISSED</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.85em', color: '#999' }}>No actions</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
