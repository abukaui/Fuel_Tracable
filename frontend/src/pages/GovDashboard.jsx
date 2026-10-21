import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { SkeletonRows, EmptyState } from '../components/Skeleton';
import { formatRelativeTime, formatDateTime } from '../utils/formatters';

export default function GovDashboard() {
  const [stations, setStations] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'FLAGGED' | 'OPEN' | 'OUT_OF_STOCK' | 'SUSPENDED'
  const navigate = useNavigate();

  // Debounce search input by 300ms
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
      const [stRes, recRes] = await Promise.all([
        apiClient('/api/stations'),
        apiClient('/api/reconciliations').catch(() => ({ reconciliations: [] })),
      ]);
      setStations(stRes.stations || []);
      setReconciliations(recRes.reconciliations || []);
    } catch (err) {
      setError(err.message || 'Failed to load station data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map each station to its open flag count
  const stationFlagsMap = useMemo(() => {
    const map = {};
    for (const rec of reconciliations) {
      const isOpenFlag = (rec.status === 'FLAGGED' || rec.stock_out_flag) && rec.status !== 'RESOLVED';
      if (isOpenFlag) {
        map[rec.station_id] = (map[rec.station_id] || 0) + 1;
      }
    }
    return map;
  }, [reconciliations]);

  // Tab counts
  const counts = useMemo(() => {
    const res = {
      ALL: stations.length,
      FLAGGED: 0,
      OPEN: 0,
      OUT_OF_STOCK: 0,
      SUSPENDED: 0,
    };
    stations.forEach(s => {
      if (stationFlagsMap[s.id] > 0) res.FLAGGED += 1;
      if (s.current_status === 'OPEN') res.OPEN += 1;
      if (s.current_status === 'OUT_OF_STOCK') res.OUT_OF_STOCK += 1;
      if (s.current_status === 'SUSPENDED') res.SUSPENDED += 1;
    });
    return res;
  }, [stations, stationFlagsMap]);

  // Filter and sort stations (default: Flagged stations first)
  const filteredStations = useMemo(() => {
    let list = stations.slice();

    // 1. Tab filter
    if (activeTab === 'FLAGGED') {
      list = list.filter(s => (stationFlagsMap[s.id] || 0) > 0);
    } else if (activeTab === 'OPEN') {
      list = list.filter(s => s.current_status === 'OPEN');
    } else if (activeTab === 'OUT_OF_STOCK') {
      list = list.filter(s => s.current_status === 'OUT_OF_STOCK');
    } else if (activeTab === 'SUSPENDED') {
      list = list.filter(s => s.current_status === 'SUSPENDED');
    }

    // 2. Search filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.sid?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q)
      );
    }

    // 3. Default sort: stations with open flags first, then alphabetical by SID
    list.sort((a, b) => {
      const aFlags = stationFlagsMap[a.id] || 0;
      const bFlags = stationFlagsMap[b.id] || 0;
      if (aFlags !== bFlags) {
        return bFlags - aFlags; // highest flag count first
      }
      return (a.sid || '').localeCompare(b.sid || '');
    });

    return list;
  }, [stations, activeTab, debouncedSearch, stationFlagsMap]);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Stations</h1>
          <p className="page-subtitle">Monitor and manage all registered fuel stations and detect anomalies.</p>
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
          All Stations
          <span className="filter-tab-count">{counts.ALL}</span>
        </button>
        <button
          className={`filter-tab${activeTab === 'FLAGGED' ? ' active' : ''}`}
          onClick={() => setActiveTab('FLAGGED')}
          style={{ color: activeTab === 'FLAGGED' ? 'var(--orange)' : undefined }}
        >
          ⚠ Flagged
          <span className="filter-tab-count" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--orange)' }}>
            {counts.FLAGGED}
          </span>
        </button>
        <button
          className={`filter-tab${activeTab === 'OPEN' ? ' active' : ''}`}
          onClick={() => setActiveTab('OPEN')}
        >
          Open
          <span className="filter-tab-count">{counts.OPEN}</span>
        </button>
        <button
          className={`filter-tab${activeTab === 'OUT_OF_STOCK' ? ' active' : ''}`}
          onClick={() => setActiveTab('OUT_OF_STOCK')}
        >
          Out of Stock
          <span className="filter-tab-count">{counts.OUT_OF_STOCK}</span>
        </button>
        <button
          className={`filter-tab${activeTab === 'SUSPENDED' ? ' active' : ''}`}
          onClick={() => setActiveTab('SUSPENDED')}
        >
          Suspended
          <span className="filter-tab-count">{counts.SUSPENDED}</span>
        </button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div>
            <span className="table-title">
              {activeTab === 'ALL' ? 'All Stations' : `${activeTab.replace('_', ' ')} Stations`}
            </span>
            <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              ({filteredStations.length} {filteredStations.length === 1 ? 'station' : 'stations'})
            </span>
          </div>

          <div className="search-wrap">
            <span className="search-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              placeholder="Search by SID, name or city..."
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
                <th style={{ width: '120px' }}>SID</th>
                <th>Station Name</th>
                <th>Location</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '140px' }}>Compliance</th>
                <th style={{ width: '170px' }}>Last Declared</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={6} rows={6} />
              ) : filteredStations.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem 0' }}>
                    <EmptyState
                      icon={activeTab === 'FLAGGED' ? '✅' : '🔍'}
                      title={
                        activeTab === 'FLAGGED'
                          ? 'No flagged stations'
                          : search
                          ? `No stations match "${search}"`
                          : 'No stations found'
                      }
                      message={
                        activeTab === 'FLAGGED'
                          ? 'All monitored fuel stations are operating within normal variance thresholds.'
                          : search
                          ? 'Try adjusting your search terms or clearing the status filter.'
                          : 'There are currently no stations registered in this category.'
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
                filteredStations.map(s => {
                  const flags = stationFlagsMap[s.id] || 0;
                  return (
                    <tr
                      key={s.id}
                      className="clickable"
                      onClick={() => navigate(`/stations/${s.id}`)}
                      style={{ background: flags > 0 ? 'rgba(245, 158, 11, 0.03)' : undefined }}
                    >
                      <td className="td-bold td-link">{s.sid}</td>
                      <td className="td-bold">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="td-muted">{s.location || '—'}</td>
                      <td>
                        <StatusBadge status={s.current_status} />
                      </td>
                      <td>
                        {flags > 0 ? (
                          <span
                            className="badge badge-orange"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                            title={`${flags} unaddressed reconciliation anomaly`}
                          >
                            <span>⚠</span>
                            <span>{flags} {flags === 1 ? 'Anomaly' : 'Anomalies'}</span>
                          </span>
                        ) : (
                          <span className="badge badge-green" style={{ opacity: 0.85 }}>
                            Normal
                          </span>
                        )}
                      </td>
                      <td
                        className="td-muted"
                        title={formatDateTime(s.status_declared_at)}
                      >
                        {formatRelativeTime(s.status_declared_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>
            Showing {filteredStations.length} of {stations.length} stations
          </span>
          {activeTab !== 'ALL' && (
            <span style={{ color: 'var(--text-muted)' }}>
              (Filtered by {activeTab.replace('_', ' ')})
            </span>
          )}
        </div>
      </div>
    </>
  );
}
