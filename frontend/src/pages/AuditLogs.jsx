import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { SkeletonRows, EmptyState } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

const ACTION_COLORS = {
  STATION_SUSPENDED: 'badge-orange',
  STATION_REINSTATED: 'badge-green',
  DISPENSE_VERIFIED: 'badge-blue',
  RECONCILIATION_RESOLVED: 'badge-green',
  COMPLAINT_CREATED: 'badge-gray',
  STATION_STATUS_UPDATED: 'badge-teal',
  USER_REGISTERED: 'badge-teal',
  LOGIN: 'badge-gray',
};

function ActionPill({ action }) {
  const cls = ACTION_COLORS[action] || 'badge-gray';
  return (
    <span className={`badge ${cls}`} style={{ fontSize: '11px', fontWeight: 600 }}>
      {action}
    </span>
  );
}

function RolePill({ role }) {
  const map = {
    GOV_REGULATOR: 'badge-orange',
    ADMIN: 'badge-blue',
    STATION_OPERATOR: 'badge-teal',
    DRIVER: 'badge-gray',
  };
  return (
    <span className={`badge ${map[role] || 'badge-gray'}`} style={{ fontSize: '10px' }}>
      {role}
    </span>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [expandedMeta, setExpandedMeta] = useState({}); // logId -> boolean
  const { addToast } = useToast();

  const LIMIT = 20;

  const [filters, setFilters] = useState({
    actorId: '',
    entityType: '',
    from: '',
    to: '',
  });

  const [applied, setApplied] = useState({
    actorId: '',
    entityType: '',
    from: '',
    to: '',
  });

  const fetchLogs = async (f, p = 1) => {
    setLoading(true);
    setError('');
    const offset = (p - 1) * LIMIT;
    const params = new URLSearchParams({ limit: LIMIT, offset });
    if (f.actorId?.trim()) params.set('actorId', f.actorId.trim());
    if (f.entityType?.trim()) params.set('entityType', f.entityType.trim());
    if (f.from) params.set('from', f.from);
    if (f.to) params.set('to', f.to);

    try {
      const data = await apiClient(`/api/audit-logs?${params}`);
      setLogs(data.logs || []);
      setPage(p);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(applied, 1);
  }, [applied]);

  const handleApply = (e) => {
    e?.preventDefault();
    setApplied({ ...filters });
  };

  const handleClear = () => {
    const empty = { actorId: '', entityType: '', from: '', to: '' };
    setFilters(empty);
    setApplied(empty);
  };

  const removeFilter = (key) => {
    const updated = { ...applied, [key]: '' };
    setFilters(prev => ({ ...prev, [key]: '' }));
    setApplied(updated);
  };

  const copyToClipboard = (text, label = 'Entity ID') => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      addToast(`Copied ${label} to clipboard`, 'success', 2500);
    }).catch(() => {
      addToast('Could not copy to clipboard', 'warning');
    });
  };

  const toggleMeta = (id) => {
    setExpandedMeta(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const hasActiveFilters = Object.values(applied).some(v => Boolean(v));

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Immutable security log tracking administrative interventions, station suspensions, and system events.</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => fetchLogs(applied, page)}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      <div className="table-card">
        {/* Filter form */}
        <form onSubmit={handleApply} className="filter-bar">
          <div className="filter-group">
            <label className="filter-label">Actor User ID</label>
            <input
              className="filter-input"
              placeholder="e.g. UUID..."
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
              <option value="tanks">tanks</option>
              <option value="reconciliations">reconciliations</option>
              <option value="dispense_transactions">dispense_transactions</option>
              <option value="driver_complaints">driver_complaints</option>
              <option value="vehicles">vehicles</option>
              <option value="users">users</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">From Date</label>
            <input
              type="date"
              className="filter-input"
              value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">To Date</label>
            <input
              type="date"
              className="filter-input"
              value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              Apply Filters
            </button>
            {hasActiveFilters && (
              <button type="button" className="btn btn-outline btn-sm" onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div className="active-filters-wrap">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Active Filters:
            </span>
            {applied.actorId && (
              <span className="filter-pill">
                Actor: {applied.actorId.slice(0, 8)}…
                <button type="button" onClick={() => removeFilter('actorId')}>×</button>
              </span>
            )}
            {applied.entityType && (
              <span className="filter-pill">
                Entity: {applied.entityType}
                <button type="button" onClick={() => removeFilter('entityType')}>×</button>
              </span>
            )}
            {applied.from && (
              <span className="filter-pill">
                From: {applied.from}
                <button type="button" onClick={() => removeFilter('from')}>×</button>
              </span>
            )}
            {applied.to && (
              <span className="filter-pill">
                To: {applied.to}
                <button type="button" onClick={() => removeFilter('to')}>×</button>
              </span>
            )}
          </div>
        )}

        {/* Logs Table */}
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Timestamp</th>
                <th style={{ width: '180px' }}>Actor</th>
                <th style={{ width: '170px' }}>Action</th>
                <th style={{ width: '130px' }}>Entity Type</th>
                <th style={{ width: '140px' }}>Entity ID</th>
                <th>Details & Payload</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={6} rows={8} />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2.5rem 0' }}>
                    <EmptyState
                      icon="📜"
                      title="No audit logs found"
                      message={
                        hasActiveFilters
                          ? 'No security logs matched your filter criteria. Try expanding the date range.'
                          : 'No audit events recorded yet.'
                      }
                      action={
                        hasActiveFilters && (
                          <button className="btn btn-outline" onClick={handleClear}>
                            Clear Filters
                          </button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
                  const isExpanded = !!expandedMeta[log.id];

                  return (
                    <tr key={log.id}>
                      <td
                        className="td-muted"
                        style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                        title={formatDateTime(log.occurred_at)}
                      >
                        <div>{formatRelativeTime(log.occurred_at)}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>
                          {formatDateTime(log.occurred_at).split('(')[0]}
                        </div>
                      </td>

                      <td>
                        {log.actor_name ? (
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{log.actor_name}</div>
                            <div style={{ marginTop: '0.2rem' }}>
                              <RolePill role={log.actor_role} />
                            </div>
                          </div>
                        ) : (
                          <span className="td-muted" style={{ fontStyle: 'italic', fontSize: '0.8125rem' }}>
                            System Daemon
                          </span>
                        )}
                      </td>

                      <td>
                        <ActionPill action={log.action} />
                      </td>

                      <td className="td-muted" style={{ fontSize: '0.8125rem' }}>
                        <code>{log.entity_type || '—'}</code>
                      </td>

                      <td>
                        {log.entity_id ? (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(log.entity_id, 'Entity ID')}
                            style={{
                              background: 'none',
                              border: '1px dashed var(--border)',
                              borderRadius: '4px',
                              padding: '0.15rem 0.35rem',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                            title="Click to copy full ID"
                          >
                            <span>{log.entity_id.slice(0, 8)}…</span>
                            <span style={{ fontSize: '0.6875rem' }}>📋</span>
                          </button>
                        ) : (
                          <span className="td-muted">—</span>
                        )}
                      </td>

                      <td style={{ fontSize: '0.8125rem' }}>
                        {!hasMeta ? (
                          <span className="td-muted">—</span>
                        ) : isExpanded ? (
                          <div>
                            <pre
                              style={{
                                background: '#f8fafc',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                fontSize: '0.75rem',
                                maxHeight: '160px',
                                overflow: 'auto',
                                margin: '0.25rem 0',
                              }}
                            >
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                            <button
                              type="button"
                              onClick={() => toggleMeta(log.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                            >
                              Collapse ▲
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                maxWidth: '240px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {typeof log.metadata === 'object'
                                ? Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')
                                : String(log.metadata)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleMeta(log.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, fontWeight: 500 }}
                            >
                              View JSON ▼
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="pagination">
          <span>
            Page {page} {logs.length > 0 && `(Showing ${logs.length} entries)`}
          </span>
          <div className="pagination-btns">
            <button
              className="page-btn"
              disabled={page === 1 || loading}
              onClick={() => fetchLogs(applied, page - 1)}
            >
              ‹ Previous
            </button>
            <button
              className="page-btn"
              disabled={logs.length < LIMIT || loading}
              onClick={() => fetchLogs(applied, page + 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
