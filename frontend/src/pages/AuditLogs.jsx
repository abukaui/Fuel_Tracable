import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actorId, setActorId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchLogs = async (currentPage) => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;
      let query = `?limit=${limit}&offset=${offset}`;
      
      if (actorId) query += `&actorId=${encodeURIComponent(actorId)}`;
      if (entityType) query += `&entityType=${encodeURIComponent(entityType)}`;
      if (fromDate) query += `&from=${encodeURIComponent(fromDate)}`;
      if (toDate) query += `&to=${encodeURIComponent(toDate)}`;

      const data = await apiClient(`/api/audit-logs${query}`);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message || 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    if (page !== 1) {
      setPage(1); // Effect will trigger fetch
    } else {
      fetchLogs(1);
    }
  };

  const handleClearFilters = () => {
    setActorId('');
    setEntityType('');
    setFromDate('');
    setToDate('');
    if (page !== 1) setPage(1);
    else fetchLogs(1);
  };

  const formatDate = (ds) => {
    if (!ds) return 'N/A';
    const d = new Date(ds);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Audit Logs</h2>

      <form 
        onSubmit={handleApplyFilters} 
        style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem', 
          padding: '1rem', 
          backgroundColor: '#fff', 
          border: '1px solid #ccc', 
          borderRadius: '8px',
          alignItems: 'flex-end',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Actor ID</label>
          <input type="text" value={actorId} onChange={e => setActorId(e.target.value)} placeholder="UUID..." />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Entity Type</label>
          <input type="text" value={entityType} onChange={e => setEntityType(e.target.value)} placeholder="e.g. DISPENSE" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.85em', fontWeight: 'bold' }}>From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.85em', fontWeight: 'bold' }}>To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px' }}>Apply Filters</button>
          <button type="button" onClick={handleClearFilters} style={{ padding: '0.5rem 1rem', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>Clear</button>
        </div>
      </form>

      {error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : loading ? (
        <div>Loading complaints... (fetching logs)</div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '0.75rem' }}>Time</th>
                <th style={{ padding: '0.75rem' }}>Actor</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
                <th style={{ padding: '0.75rem' }}>Entity Type</th>
                <th style={{ padding: '0.75rem' }}>Entity ID</th>
                <th style={{ padding: '0.75rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: '#666' }}>
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.85em', color: '#555' }}>{formatDate(log.occurred_at)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {log.actor_name ? (
                        <><strong>{log.actor_name}</strong><br /><span style={{fontSize: '0.8em', color:'#666'}}>{log.actor_id}</span></>
                      ) : (
                        <span style={{ fontSize: '0.85em', color: '#666' }}>{log.actor_id}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{log.action}</td>
                    <td style={{ padding: '0.75rem' }}>{log.entity_type}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85em', color: '#666' }}>{log.entity_id}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85em' }}>
                      {log.details ? <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: '200px' }}>{JSON.stringify(log.details, null, 2)}</pre> : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={page === 1}
          style={{ padding: '0.5rem 1rem', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
        >
          ← Previous
        </button>
        <span>Page {page}</span>
        <button 
          onClick={() => setPage(p => p + 1)} 
          disabled={logs.length < limit}
          style={{ padding: '0.5rem 1rem', cursor: logs.length < limit ? 'not-allowed' : 'pointer' }}
        >
          Next →
        </button>
      </div>

    </div>
  );
}
