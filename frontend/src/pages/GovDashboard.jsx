import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

function StatusBadge({ status }) {
  const map = {
    OPEN: 'badge-green',
    CLOSED: 'badge-gray',
    OUT_OF_STOCK: 'badge-orange',
    SUSPENDED: 'badge-red',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

export default function GovDashboard() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient('/api/stations')
      .then(data => { setStations(data.stations || []); setLoading(false); })
      .catch(() => { setError('Failed to load stations.'); setLoading(false); });
  }, []);

  const filtered = stations.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.sid?.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-screen">⏳ Loading stations...</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Stations</h1>
        <p className="page-subtitle">Monitor and manage all registered fuel stations.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Stations</span>
          <div className="search-wrap">
            <span className="search-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              placeholder="Search by name, SID or location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>SID</th>
              <th>Station Name</th>
              <th>Location</th>
              <th>Status</th>
              <th>Declared At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No stations found.</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="clickable" onClick={() => navigate(`/stations/${s.id}`)}>
                <td className="td-bold td-link">{s.sid}</td>
                <td className="td-bold">{s.name}</td>
                <td className="td-muted">{s.location || '—'}</td>
                <td><StatusBadge status={s.current_status} /></td>
                <td className="td-muted">{s.status_declared_at ? new Date(s.status_declared_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <span>Showing {filtered.length} of {stations.length} stations</span>
        </div>
      </div>
    </>
  );
}
