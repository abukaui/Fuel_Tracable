import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { SkeletonRows, EmptyState } from '../components/Skeleton';
import { formatLiters, formatDateTime, formatRelativeTime } from '../utils/formatters';

export default function Reconciliations() {
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'FLAGGED' | 'OK' | 'INCOMPLETE' | 'RESOLVED'
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient('/api/reconciliations');
      setReconciliations(data.reconciliations || []);
    } catch (err) {
      setError(err.message || 'Failed to load reconciliations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Counts for tabs
  const counts = useMemo(() => {
    const res = {
      ALL: reconciliations.length,
      FLAGGED: 0,
      OK: 0,
      INCOMPLETE: 0,
      RESOLVED: 0,
    };
    reconciliations.forEach(r => {
      if (r.status === 'FLAGGED' || (r.stock_out_flag && r.status !== 'RESOLVED')) res.FLAGGED += 1;
      if (r.status === 'OK') res.OK += 1;
      if (r.status === 'INCOMPLETE') res.INCOMPLETE += 1;
      if (r.status === 'RESOLVED') res.RESOLVED += 1;
    });
    return res;
  }, [reconciliations]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = reconciliations.slice();

    // Tab filter
    if (activeTab === 'FLAGGED') {
      list = list.filter(r => r.status === 'FLAGGED' || (r.stock_out_flag && r.status !== 'RESOLVED'));
    } else if (activeTab === 'OK') {
      list = list.filter(r => r.status === 'OK');
    } else if (activeTab === 'INCOMPLETE') {
      list = list.filter(r => r.status === 'INCOMPLETE');
    } else if (activeTab === 'RESOLVED') {
      list = list.filter(r => r.status === 'RESOLVED');
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(r =>
        r.station_name?.toLowerCase().includes(q) ||
        r.sid?.toLowerCase().includes(q)
      );
    }

    // Sort: Flagged & unresolved first, then newest period_end
    list.sort((a, b) => {
      const aFlagged = (a.status === 'FLAGGED' || a.stock_out_flag) && a.status !== 'RESOLVED' ? 1 : 0;
      const bFlagged = (b.status === 'FLAGGED' || b.stock_out_flag) && b.status !== 'RESOLVED' ? 1 : 0;
      if (aFlagged !== bFlagged) return bFlagged - aFlagged;

      const dateA = new Date(a.period_end || a.created_at || 0).getTime();
      const dateB = new Date(b.period_end || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return list;
  }, [reconciliations, activeTab, debouncedSearch]);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Reconciliations</h1>
          <p className="page-subtitle">Review automated fuel balance audits, black-market variance alerts, and false stock-out flags.</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={fetchData}
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

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab${activeTab === 'ALL' ? ' active' : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          All Audits
          <span className="filter-tab-count">{counts.ALL}</span>
        </button>
        <button
          className={`filter-tab${activeTab === 'FLAGGED' ? ' active' : ''}`}
          onClick={() => setActiveTab('FLAGGED')}
          style={{ color: activeTab === 'FLAGGED' ? 'var(--orange)' : undefined }}
        >
          ⚠ Flagged / Discrepancy
          <span className="filter-tab-count" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--orange)' }}>
            {counts.FLAGGED}
          </span>
        </button>
        <button
          className={`filter-tab${activeTab === 'OK' ? ' active' : ''}`}
          onClick={() => setActiveTab('OK')}
        >
          Normal (OK)
          <span className="filter-tab-count">{counts.OK}</span>
        </button>
        <button
          className={`filter-tab${activeTab === 'RESOLVED' ? ' active' : ''}`}
          onClick={() => setActiveTab('RESOLVED')}
        >
          Resolved
          <span className="filter-tab-count">{counts.RESOLVED}</span>
        </button>
        <button
          className={`filter-tab${activeTab === 'INCOMPLETE' ? ' active' : ''}`}
          onClick={() => setActiveTab('INCOMPLETE')}
        >
          Incomplete
          <span className="filter-tab-count">{counts.INCOMPLETE}</span>
        </button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div>
            <span className="table-title">
              {activeTab === 'ALL' ? 'All Reconciliation Records' : `${activeTab.replace('_', ' ')} Records`}
            </span>
            <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              ({filtered.length} {filtered.length === 1 ? 'record' : 'records'})
            </span>
          </div>

          <div className="search-wrap">
            <span className="search-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              placeholder="Search station or SID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Station</th>
                <th>Audit Period</th>
                <th style={{ textAlign: 'right' }}>Tank Drop</th>
                <th style={{ textAlign: 'right' }}>Verified Sales</th>
                <th style={{ textAlign: 'right' }}>Variance</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '150px' }}>Stock-Out Flag</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} rows={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem 0' }}>
                    <EmptyState
                      icon={activeTab === 'FLAGGED' ? '✅' : '🔍'}
                      title={
                        activeTab === 'FLAGGED'
                          ? 'No flagged reconciliations'
                          : search
                          ? `No reconciliations match "${search}"`
                          : 'No reconciliation records found'
                      }
                      message={
                        activeTab === 'FLAGGED'
                          ? 'Zero anomalies detected. All physical tank volume drops match verified sales.'
                          : 'No reconciliation audits match your selected filter criteria.'
                      }
                      action={
                        (search || activeTab !== 'ALL') && (
                          <button
                            className="btn btn-outline"
                            onClick={() => { setSearch(''); setActiveTab('ALL'); }}
                          >
                            Reset Filters
                          </button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const isAnomaly = r.status === 'FLAGGED' || (r.stock_out_flag && r.status !== 'RESOLVED');
                  const varVal = r.variance_liters != null ? parseFloat(r.variance_liters) : null;
                  const isHighVar = varVal !== null && Math.abs(varVal) > 10;

                  return (
                    <tr
                      key={r.id}
                      className="clickable"
                      onClick={() => navigate(`/reconciliations/${r.id}`)}
                      style={{
                        background: isAnomaly ? 'rgba(245, 158, 11, 0.05)' : undefined,
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span
                            className="td-bold td-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (r.station_id) navigate(`/stations/${r.station_id}`);
                            }}
                          >
                            {r.station_name || 'Station'}
                          </span>
                          <span className="td-muted" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {r.sid}
                          </span>
                        </div>
                      </td>

                      <td className="td-muted" style={{ fontSize: '0.8125rem' }}>
                        <span title={formatDateTime(r.period_start)}>{formatRelativeTime(r.period_start)}</span>
                        <span style={{ margin: '0 0.35rem', color: 'var(--text-light)' }}>→</span>
                        <span title={formatDateTime(r.period_end)}>{formatRelativeTime(r.period_end)}</span>
                      </td>

                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {r.tank_volume_delta != null ? formatLiters(r.tank_volume_delta) : '—'}
                      </td>

                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {r.verified_dispense_volume != null ? formatLiters(r.verified_dispense_volume) : '—'}
                      </td>

                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          color: isHighVar ? 'var(--red)' : undefined,
                        }}
                      >
                        {varVal != null ? formatLiters(varVal) : '—'}
                      </td>

                      <td>
                        <StatusBadge status={r.status} />
                      </td>

                      <td>
                        {r.stock_out_flag ? (
                          <StatusBadge isStockOut={true} />
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontSize: '0.8125rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>Showing {filtered.length} of {reconciliations.length} records</span>
          {activeTab !== 'ALL' && (
            <span style={{ color: 'var(--text-muted)' }}>(Filtered by {activeTab.replace('_', ' ')})</span>
          )}
        </div>
      </div>
    </>
  );
}
