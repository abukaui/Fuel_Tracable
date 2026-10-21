import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { SkeletonRows, EmptyState } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { formatRelativeTime, formatDateTime } from '../utils/formatters';

function CategoryBadge({ cat }) {
  const map = {
    'Refused Sale': 'badge-red',
    'False Stock-Out Suspected': 'badge-orange',
    'Other': 'badge-gray',
  };
  return <span className={`badge ${map[cat] || 'badge-gray'}`}>{cat || 'General'}</span>;
}

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'OPEN' | 'REVIEWED' | 'DISMISSED'
  const [stationFilter, setStationFilter] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [updating, setUpdating] = useState({});
  const [expandedDesc, setExpandedDesc] = useState({}); // complaintId -> boolean

  // Confirm action modal state
  const [pendingAction, setPendingAction] = useState(null); // { complaintId, newStatus, title }
  const { addToast } = useToast();
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
      const [me, cData, sData] = await Promise.all([
        apiClient('/api/auth/me').catch(() => null),
        apiClient('/api/complaints'),
        apiClient('/api/stations').catch(() => ({ stations: [] })),
      ]);
      if (me?.user) setUserRole(me.user.role);
      setComplaints(cData.complaints || []);
      setStations(sData.stations || []);
    } catch (err) {
      setError(err.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const counts = useMemo(() => {
    const res = { ALL: complaints.length, OPEN: 0, REVIEWED: 0, DISMISSED: 0 };
    complaints.forEach(c => {
      if (c.status === 'OPEN') res.OPEN += 1;
      if (c.status === 'REVIEWED') res.REVIEWED += 1;
      if (c.status === 'DISMISSED') res.DISMISSED += 1;
    });
    return res;
  }, [complaints]);

  const handleMarkStatus = async (complaintId, newStatus) => {
    setUpdating(u => ({ ...u, [complaintId]: true }));
    try {
      await apiClient(`/api/complaints/${complaintId}`, {
        method: 'PUT',
        body: { status: newStatus },
      });
      setComplaints(cs =>
        cs.map(c => (c.id === complaintId ? { ...c, status: newStatus } : c))
      );
      addToast(`Complaint marked as ${newStatus.toLowerCase()}.`, 'success');
      setPendingAction(null);
    } catch (err) {
      addToast(err.message || 'Failed to update complaint status.', 'error');
    } finally {
      setUpdating(u => ({ ...u, [complaintId]: false }));
    }
  };

  const toggleExpand = (id) => {
    setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = useMemo(() => {
    let list = complaints.slice();

    // Tab filter
    if (activeTab !== 'ALL') {
      list = list.filter(c => c.status === activeTab);
    }

    // Station filter
    if (stationFilter) {
      list = list.filter(c => c.station_id === stationFilter);
    }

    // Search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(c =>
        c.station_name?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.vehicle_vid?.toLowerCase().includes(q)
      );
    }

    // Default sort: OPEN complaints first, then newest
    list.sort((a, b) => {
      if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
      if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return list;
  }, [complaints, activeTab, stationFilter, debouncedSearch]);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Complaints</h1>
          <p className="page-subtitle">Inspect citizen and driver reports regarding refusal of sale or false stock-out claims.</p>
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
          All Complaints
          <span className="filter-tab-count">{counts.ALL}</span>
        </button>
        <button
          className={`filter-tab${activeTab === 'OPEN' ? ' active' : ''}`}
          onClick={() => setActiveTab('OPEN')}
          style={{ color: activeTab === 'OPEN' ? 'var(--orange)' : undefined }}
        >
          Open
          <span className="filter-tab-count" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--orange)' }}>
            {counts.OPEN}
          </span>
        </button>
        <button
          className={`filter-tab${activeTab === 'REVIEWED' ? ' active' : ''}`}
          onClick={() => setActiveTab('REVIEWED')}
        >
          Reviewed
          <span className="filter-tab-count">{counts.REVIEWED}</span>
        </button>
        <button
          className={`filter-tab${activeTab === 'DISMISSED' ? ' active' : ''}`}
          onClick={() => setActiveTab('DISMISSED')}
        >
          Dismissed
          <span className="filter-tab-count">{counts.DISMISSED}</span>
        </button>
      </div>

      <div className="table-card">
        <div className="table-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span className="table-title">
              {activeTab === 'ALL' ? 'All Driver Complaints' : `${activeTab} Complaints`}
            </span>
            <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              ({filtered.length} {filtered.length === 1 ? 'record' : 'records'})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Station dropdown */}
            <select
              value={stationFilter}
              onChange={e => setStationFilter(e.target.value)}
              className="filter-select"
              style={{ minWidth: 160 }}
            >
              <option value="">All Stations</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.sid})
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="search-wrap">
              <span className="search-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                placeholder="Search descriptions, plates..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  ×
                </button>
              )}
            </div>

            {(search || stationFilter || activeTab !== 'ALL') && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setSearch(''); setStationFilter(''); setActiveTab('ALL'); }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>ID</th>
                <th>Station</th>
                <th>Vehicle VID</th>
                <th>Category</th>
                <th style={{ minWidth: '220px' }}>Description</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '140px' }}>Reported</th>
                {userRole === 'GOV_REGULATOR' && <th style={{ width: '180px' }}>Regulator Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={userRole === 'GOV_REGULATOR' ? 8 : 7} rows={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'GOV_REGULATOR' ? 8 : 7} style={{ padding: '2rem 0' }}>
                    <EmptyState
                      icon={activeTab === 'OPEN' ? '✅' : '💬'}
                      title={
                        activeTab === 'OPEN'
                          ? 'No pending open complaints'
                          : search
                          ? `No complaints match "${search}"`
                          : 'No complaint records found'
                      }
                      message={
                        activeTab === 'OPEN'
                          ? 'All driver reports have been investigated or dismissed.'
                          : 'Try modifying your search query or station selection.'
                      }
                      action={
                        (search || stationFilter || activeTab !== 'ALL') && (
                          <button
                            className="btn btn-outline"
                            onClick={() => { setSearch(''); setStationFilter(''); setActiveTab('ALL'); }}
                          >
                            Reset Filters
                          </button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const isLong = c.description && c.description.length > 80;
                  const isExpanded = !!expandedDesc[c.id];
                  const displayDesc = isLong && !isExpanded
                    ? `${c.description.slice(0, 80)}…`
                    : c.description;

                  return (
                    <tr key={c.id}>
                      <td className="td-muted td-bold" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        CMP-{String(c.id).slice(-4).toUpperCase()}
                      </td>

                      <td>
                        <span
                          className="td-bold td-link"
                          onClick={() => c.station_id && navigate(`/stations/${c.station_id}`)}
                        >
                          {c.station_name || c.station_id?.slice(0, 8) || '—'}
                        </span>
                      </td>

                      <td className="td-muted" style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {c.vehicle_vid || '—'}
                      </td>

                      <td>
                        <CategoryBadge cat={c.category} />
                      </td>

                      <td style={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
                        <div>{displayDesc || '—'}</div>
                        {isLong && (
                          <button
                            onClick={() => toggleExpand(c.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              padding: 0,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 500,
                              marginTop: '0.2rem',
                            }}
                          >
                            {isExpanded ? 'Show less' : 'Show full note'}
                          </button>
                        )}
                      </td>

                      <td>
                        <StatusBadge status={c.status} />
                      </td>

                      <td className="td-muted" title={formatDateTime(c.created_at)}>
                        {formatRelativeTime(c.created_at)}
                      </td>

                      {userRole === 'GOV_REGULATOR' && (
                        <td>
                          {c.status === 'OPEN' ? (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={updating[c.id]}
                                onClick={() => setPendingAction({
                                  complaintId: c.id,
                                  newStatus: 'REVIEWED',
                                  title: `Mark Complaint CMP-${String(c.id).slice(-4).toUpperCase()} as Reviewed?`,
                                })}
                              >
                                {updating[c.id] ? '…' : 'Reviewed'}
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                disabled={updating[c.id]}
                                onClick={() => setPendingAction({
                                  complaintId: c.id,
                                  newStatus: 'DISMISSED',
                                  title: `Dismiss Complaint CMP-${String(c.id).slice(-4).toUpperCase()}?`,
                                })}
                              >
                                {updating[c.id] ? '…' : 'Dismiss'}
                              </button>
                            </div>
                          ) : (
                            <span className="td-muted" style={{ fontSize: '0.75rem' }}>Resolved</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>Showing {filtered.length} of {complaints.length} complaints</span>
        </div>
      </div>

      {/* Confirmation Modal for Complaint Status Actions */}
      {pendingAction && (
        <div className="modal-backdrop" onClick={() => setPendingAction(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{pendingAction.title}</h3>
              <button className="modal-close" onClick={() => setPendingAction(null)}>×</button>
            </div>
            <p className="modal-desc" style={{ marginTop: '0.5rem' }}>
              Are you sure you want to change the status of this complaint to <strong>{pendingAction.newStatus}</strong>? This action will be recorded in the audit trail.
            </p>
            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => setPendingAction(null)}
              >
                Cancel
              </button>
              <button
                className={pendingAction.newStatus === 'DISMISSED' ? 'btn btn-outline' : 'btn btn-primary'}
                onClick={() => handleMarkStatus(pendingAction.complaintId, pendingAction.newStatus)}
              >
                Confirm {pendingAction.newStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
