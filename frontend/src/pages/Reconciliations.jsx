import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

function ReconBadge({ status }) {
  const map = { OK: 'badge-green', FLAGGED: 'badge-orange', RESOLVED: 'badge-blue', INCOMPLETE: 'badge-gray' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

export default function Reconciliations() {
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient('/api/reconciliations')
      .then(data => setReconciliations(data.reconciliations || []))
      .catch(err => setError(err.message || 'Failed to load reconciliations.'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

  const filtered = reconciliations.filter(r => {
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchSearch = !search ||
      r.station_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.sid?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalFlagged = reconciliations.filter(r => r.status === 'FLAGGED').length;
  const totalResolved = reconciliations.filter(r => r.status === 'RESOLVED').length;
  const totalOk = reconciliations.filter(r => r.status === 'OK').length;

  if (loading) return <div className="loading-screen">⏳ Loading reconciliations...</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Reconciliations</h1>
        <p className="page-subtitle">Review fuel variance reports and stock-out flags across all stations.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary cards */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="card-icon" style={{ background: '#dcfce7' }}>✅</div>
          <div className="stat-card-body">
            <div className="stat-card-label">OK</div>
            <div className="stat-card-value" style={{ color: 'var(--green)' }}>{totalOk}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-icon" style={{ background: '#ffedd5' }}>⚠️</div>
          <div className="stat-card-body">
            <div className="stat-card-label">Flagged</div>
            <div className="stat-card-value" style={{ color: 'var(--orange)' }}>{totalFlagged}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-icon" style={{ background: '#dbeafe' }}>🔍</div>
          <div className="stat-card-body">
            <div className="stat-card-label">Resolved</div>
            <div className="stat-card-value" style={{ color: 'var(--blue)' }}>{totalResolved}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-icon" style={{ background: '#f1f5f9' }}>📋</div>
          <div className="stat-card-body">
            <div className="stat-card-label">Total</div>
            <div className="stat-card-value">{reconciliations.length}</div>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Reconciliations</span>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ maxWidth: '200px' }}>
              <span className="search-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                placeholder="Search station..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              style={{ minWidth: '130px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="OK">OK</option>
              <option value="FLAGGED">FLAGGED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="INCOMPLETE">INCOMPLETE</option>
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Station</th>
              <th>Period Start</th>
              <th>Period End</th>
              <th style={{ textAlign: 'right' }}>Tank Delta</th>
              <th style={{ textAlign: 'right' }}>Verified Dispense</th>
              <th style={{ textAlign: 'right' }}>Variance</th>
              <th>Status</th>
              <th>Stock-Out Flag</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No reconciliations found.
                </td>
              </tr>
            ) : filtered.map(r => (
              <tr
                key={r.id}
                className="clickable"
                onClick={() => navigate(`/reconciliations/${r.id}`)}
                style={{ background: r.status === 'FLAGGED' ? '#fffbeb' : undefined }}
              >
                <td>
                  <div className="td-bold">{r.station_name}</div>
                  <div className="td-muted" style={{ fontSize: '11px' }}>{r.sid}</div>
                </td>
                <td className="td-muted" style={{ fontSize: '12px' }}>{fmt(r.period_start)}</td>
                <td className="td-muted" style={{ fontSize: '12px' }}>{fmt(r.period_end)}</td>
                <td style={{ textAlign: 'right' }}>
                  {r.tank_volume_delta != null ? `${parseFloat(r.tank_volume_delta).toFixed(1)} L` : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {r.verified_dispense_volume != null ? `${parseFloat(r.verified_dispense_volume).toFixed(1)} L` : '—'}
                </td>
                <td style={{
                  textAlign: 'right',
                  fontWeight: 600,
                  color: r.variance_liters != null && Math.abs(parseFloat(r.variance_liters)) > 10
                    ? 'var(--red)' : undefined
                }}>
                  {r.variance_liters != null ? `${parseFloat(r.variance_liters).toFixed(1)} L` : '—'}
                </td>
                <td><ReconBadge status={r.status} /></td>
                <td>
                  {r.stock_out_flag
                    ? <span className="badge badge-red">⚠ FLAGGED</span>
                    : <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <span>Showing {filtered.length} of {reconciliations.length} records</span>
        </div>
      </div>
    </>
  );
}
