import { useState } from 'react';
import { apiClient } from '../api/client';

const ACTION_COLORS = {
  STATION_SUSPENDED: 'badge-orange',
  STATION_REINSTATED: 'badge-green',
  DISPENSE_VERIFIED: 'badge-blue',
  RECONCILIATION_RESOLVED: 'badge-purple',
  COMPLAINT_CREATED: 'badge-gray',
  STATION_STATUS_UPDATED: 'badge-teal',
  USER_REGISTERED: 'badge-teal',
  LOGIN: 'badge-gray',
};

function ActionPill({ action }) {
  const cls = ACTION_COLORS[action] || 'badge-gray';
  return <span className={`badge ${cls}`} style={{ fontSize: '11px', fontWeight: 600 }}>{action}</span>;
}

function RolePill({ role }) {
  const map = {
    GOV_REGULATOR: 'badge-purple',
    ADMIN: 'badge-blue',
    STATION_OPERATOR: 'badge-teal',
    DRIVER: 'badge-gray',
  };
  return <span className={`badge ${map[role] || 'badge-gray'}`} style={{ fontSize: '10px' }}>{role}</span>;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const [filters, setFilters] = useState({ actorId: '', entityType: '', from: '', to: '' });
  const [applied, setApplied] = useState({ actorId: '', entityType: '', from: '', to: '' });

  const fetchLogs = async (f, p = 1) => {
    setLoading(true); setError('');
    const offset = (p - 1) * LIMIT;
    const params = new URLSearchParams({ limit: LIMIT, offset });
    if (f.actorId) params.set('actorId', f.actorId);
    if (f.entityType) params.set('entityType', f.entityType);
    if (f.from) params.set('from', f.from);
    if (f.to) params.set('to', f.to);
    try {
      const data = await apiClient(`/api/audit-logs?${params}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setLoaded(true);
      setPage(p);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally { setLoading(false); }
  };

  const handleApply = () => { setApplied({ ...filters }); fetchLogs(filters, 1); };
  const handleClear = () => {
    const empty = { actorId: '', entityType: '', from: '', to: '' };
    setFilters(empty); setApplied(empty); fetchLogs(empty, 1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Load on first render
  if (!loaded && !loading) fetchLogs(applied, 1);

  const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">View system activity and important actions.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        {/* Filter bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <label className="filter-label">Actor</label>
            <input
              className="filter-input"
              placeholder="All Actors"
              value={filters.actorId}
              onChange={e => setFilters(f => ({ ...f, actorId: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Entity Type</label>
            <select
              className="filter-select"
              value={filters.entityType}
              onChange={e => setFilters(f => ({ ...f, entityType: e.target.value }))}
            >
              <option value="">All Entity Types</option>
              <option value="stations">stations</option>
              <option value="reconciliations">reconciliations</option>
              <option value="dispense_transactions">dispense_transactions</option>
              <option value="driver_complaints">driver_complaints</option>
              <option value="vehicles">vehicles</option>
              <option value="users">users</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">From</label>
            <input type="date" className="filter-input" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div className="filter-group">
            <label className="filter-label">To</label>
            <input type="date" className="filter-input" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleApply} disabled={loading}>
              Apply Filters
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleClear}>Clear</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No audit logs found.</td></tr>
            ) : logs.map(log => (
              <tr key={log.id}>
                <td className="td-muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{fmt(log.occurred_at)}</td>
                <td>
                  {log.actor_name ? (
                    <>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>{log.actor_name}</div>
                      <RolePill role={log.actor_role} />
                    </>
                  ) : <span className="td-muted">System</span>}
                </td>
                <td><ActionPill action={log.action} /></td>
                <td className="td-muted" style={{ fontSize: '12px' }}>{log.entity_type}</td>
                <td className="td-muted" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                  {log.entity_id ? log.entity_id.slice(0, 12) + '…' : '—'}
                </td>
                <td style={{ maxWidth: 280, fontSize: '12px', color: 'var(--text-muted)' }}>
                  {log.metadata ? (
                    typeof log.metadata === 'object'
                      ? Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')
                      : String(log.metadata)
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <span>Showing {logs.length} of {total} logs</span>
          {totalPages > 1 && (
            <div className="pagination-btns">
              <button className="page-btn" disabled={page === 1} onClick={() => fetchLogs(applied, page - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => fetchLogs(applied, p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page >= totalPages} onClick={() => fetchLogs(applied, page + 1)}>›</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
