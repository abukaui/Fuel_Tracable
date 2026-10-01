import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

function CategoryBadge({ cat }) {
  const map = {
    'Refused Sale': 'badge-red',
    'False Stock-Out Suspected': 'badge-orange',
    'Other': 'badge-gray',
  };
  return <span className={`badge ${map[cat] || 'badge-gray'}`}>{cat}</span>;
}

function StatusBadge({ status }) {
  const map = { OPEN: 'badge-green', REVIEWED: 'badge-blue', DISMISSED: 'badge-gray' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    Promise.all([
      apiClient('/api/auth/me'),
      apiClient('/api/complaints'),
    ]).then(([me, data]) => {
      if (me?.user) setUserRole(me.user.role);
      setComplaints(data.complaints || []);
    }).catch(() => setError('Failed to load complaints.'))
      .finally(() => setLoading(false));
  }, []);

  const handleMark = async (complaintId, newStatus) => {
    setUpdating(u => ({ ...u, [complaintId]: true }));
    try {
      const res = await apiClient(`/api/complaints/${complaintId}`, {
        method: 'PUT', body: { status: newStatus }
      });
      setComplaints(cs => cs.map(c => c.id === complaintId ? { ...c, status: newStatus } : c));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(u => ({ ...u, [complaintId]: false }));
    }
  };

  const filtered = complaints.filter(c => {
    const matchSearch = !search ||
      c.station_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="loading-screen">⏳ Loading complaints...</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Complaints</h1>
        <p className="page-subtitle">View and manage driver complaints about stations.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Complaints</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-wrap">
              <span className="search-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                placeholder="Search by station, category or description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="filter-select"
              style={{ minWidth: 130 }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="DISMISSED">DISMISSED</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>Reset</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Station</th>
              <th>Vehicle ID</th>
              <th>Category</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created At</th>
              {userRole === 'GOV_REGULATOR' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No complaints found.</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id}>
                <td className="td-muted td-bold" style={{ fontSize: '12px' }}>CMP-{String(c.id).slice(-4).toUpperCase()}</td>
                <td className="td-link td-bold">{c.station_name || c.station_id?.slice(0, 8) || '—'}</td>
                <td className="td-muted">{c.vehicle_vid || c.vehicle_id?.slice(0, 8) || '—'}</td>
                <td><CategoryBadge cat={c.category} /></td>
                <td style={{ maxWidth: 240, fontSize: '13px' }}>{c.description}</td>
                <td><StatusBadge status={c.status} /></td>
                <td className="td-muted" style={{ fontSize: '12px' }}>{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
                {userRole === 'GOV_REGULATOR' && (
                  <td>
                    {c.status === 'OPEN' ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={updating[c.id]}
                          onClick={() => handleMark(c.id, 'REVIEWED')}
                        >
                          Reviewed
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={updating[c.id]}
                          onClick={() => handleMark(c.id, 'DISMISSED')}
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <span className="td-muted" style={{ fontSize: '12px' }}>—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <span>Showing {filtered.length} of {complaints.length} complaints</span>
        </div>
      </div>
    </>
  );
}
