import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ReasonModal from '../components/Modal';
import { SkeletonRows, EmptyState } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { formatNumber, formatLiters, formatDateTime, formatRelativeTime } from '../utils/formatters';

export default function StationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [station, setStation] = useState(null);
  const [tanks, setTanks] = useState([]);
  const [readings, setReadings] = useState({});
  const [reconciliations, setReconciliations] = useState([]);
  const [dispenses, setDispenses] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action states
  const [reconLoading, setReconLoading] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'SUSPEND' | 'REINSTATE' | null
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [me, data, rData, dData] = await Promise.all([
        apiClient('/api/auth/me').catch(() => null),
        apiClient(`/api/stations/${id}`),
        apiClient(`/api/stations/${id}/reconciliations`).catch(() => ({ reconciliations: [] })),
        apiClient(`/api/stations/${id}/dispenses`).catch(() => ({ dispenses: [] })),
      ]);

      if (me?.user) setUserRole(me.user.role);
      setStation(data.station);
      const tankList = data.station.tanks || [];
      setTanks(tankList);
      setReconciliations(rData.reconciliations || []);
      setDispenses(dData.dispenses || []);

      // Fetch all tank readings in parallel
      if (tankList.length > 0) {
        const readingResults = await Promise.all(
          tankList.map(t =>
            apiClient(`/api/tanks/${t.id}/readings/latest`).catch(() => null)
          )
        );
        const reads = {};
        tankList.forEach((t, i) => {
          if (readingResults[i]?.reading) reads[t.id] = readingResults[i].reading;
        });
        setReadings(reads);
      }
    } catch (err) {
      setError(err.message || 'Failed to load station details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRunRecon = async () => {
    if (reconLoading) return;
    setReconLoading(true);
    try {
      const res = await apiClient(`/api/stations/${id}/reconciliations/run`, { method: 'POST' });
      const rec = res.reconciliation;
      if (rec?.status === 'FLAGGED' || rec?.stock_out_flag) {
        addToast(
          `Reconciliation finished: ⚠ ANOMALY DETECTED (Variance: ${formatLiters(rec?.variance_liters)})`,
          'warning',
          6000
        );
      } else {
        addToast('Reconciliation completed: Telemetry matches verified sales.', 'success');
      }
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Reconciliation execution failed.', 'error');
    } finally {
      setReconLoading(false);
    }
  };

  const handleModalConfirm = async (reason) => {
    setActionLoading(true);
    try {
      if (modalMode === 'SUSPEND') {
        await apiClient(`/api/stations/${id}/suspend`, {
          method: 'PUT',
          body: { reason },
        });
        addToast(`Station ${station.sid} has been suspended.`, 'warning');
      } else if (modalMode === 'REINSTATE') {
        await apiClient(`/api/stations/${id}/reinstate`, {
          method: 'PUT',
          body: { reason },
        });
        addToast(`Station ${station.sid} has been reinstated to active service.`, 'success');
      }
      setModalMode(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="table-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton-box" style={{ width: '40%', height: '2rem' }} />
          <div className="skeleton-box" style={{ width: '60%', height: '1.25rem' }} />
          <div style={{ height: '2rem' }} />
          <div className="skeleton-box" style={{ width: '100%', height: '10rem' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ margin: '2rem 0' }}>
        <span>{error}</span>
        <div style={{ marginTop: '0.75rem' }}>
          <Link to="/stations" className="btn btn-outline btn-sm">← Back to Stations</Link>
        </div>
      </div>
    );
  }

  if (!station) return null;

  return (
    <>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link to="/stations" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>←</span>
              <span>Back to Stations</span>
            </Link>
          </div>
          <h1 className="page-title">{station.name}</h1>
          <p className="page-subtitle">
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>SID: {station.sid}</span>
            <span style={{ margin: '0 0.5rem' }}>·</span>
            <span>{station.location || 'Location unassigned'}</span>
            {station.status_declared_at && (
              <>
                <span style={{ margin: '0 0.5rem' }}>·</span>
                <span title={formatDateTime(station.status_declared_at)}>
                  Status declared {formatRelativeTime(station.status_declared_at)}
                </span>
              </>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusBadge status={station.current_status} />
          {userRole === 'GOV_REGULATOR' && (
            station.current_status !== 'SUSPENDED' ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setModalMode('SUSPEND')}
              >
                Suspend Station
              </button>
            ) : (
              <button
                className="btn btn-success btn-sm"
                onClick={() => setModalMode('REINSTATE')}
              >
                Reinstate Station
              </button>
            )
          )}
        </div>
      </div>

      {/* Confirmation Modal for Suspend / Reinstate */}
      <ReasonModal
        isOpen={modalMode !== null}
        title={modalMode === 'SUSPEND' ? `Suspend Station: ${station.name}` : `Reinstate Station: ${station.name}`}
        description={
          modalMode === 'SUSPEND'
            ? 'Suspending this station locks pump dispensing and marks the station non-compliant in regulatory audits. Please provide an official justification.'
            : 'Reinstating this station restores operating permissions and normal dispensing checks.'
        }
        placeholder={modalMode === 'SUSPEND' ? 'Reason for suspension (e.g. repeated unaccounted variance)...' : 'Reason for reinstatement (e.g. audit resolved)...'}
        confirmText={modalMode === 'SUSPEND' ? 'Confirm Suspension' : 'Confirm Reinstatement'}
        confirmVariant={modalMode === 'SUSPEND' ? 'danger' : 'success'}
        loading={actionLoading}
        onClose={() => setModalMode(null)}
        onConfirm={handleModalConfirm}
      />

      {/* Tanks / ATG Telemetry */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text)' }}>
          Tank Telemetry & ATG Status
        </h3>

        {tanks.length === 0 ? (
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tanks registered for this station.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {tanks.map(t => {
              const r = readings[t.id];
              const cap = parseFloat(t.capacity_liters) || 1;
              const vol = r ? parseFloat(r.volume_liters) : 0;
              const pct = Math.min(100, Math.max(0, (vol / cap) * 100));
              const fillColor = pct > 40 ? 'var(--green)' : pct > 15 ? 'var(--orange)' : 'var(--red)';

              return (
                <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>
                        {t.product_type}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Tank {t.id.slice(0, 8)}…
                      </div>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: fillColor }}>
                      {r ? formatLiters(r.volume_liters) : '—'}
                    </div>
                  </div>

                  <div className="progress-wrap">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: fillColor }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <span>{pct.toFixed(1)}% full</span>
                    <span>Capacity: {formatLiters(t.capacity_liters, 0)}</span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      {r ? (
                        <>Reading: {formatRelativeTime(r.recorded_at || r.reading_time)}</>
                      ) : (
                        <span style={{ color: 'var(--orange)' }}>No readings yet</span>
                      )}
                    </span>
                    {r?.source && (
                      <span className="badge badge-gray" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.35rem' }}>
                        {r.source}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dispensing History */}
      <div className="table-card" style={{ marginBottom: '2rem' }}>
        <div className="table-header">
          <div>
            <span className="table-title">Dispensing History</span>
            <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              ({dispenses.length} verified {dispenses.length === 1 ? 'sale' : 'sales'})
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Plate Number</th>
                <th>Vehicle Type</th>
                <th>Fuel Type</th>
                <th style={{ textAlign: 'right' }}>Requested</th>
                <th style={{ textAlign: 'right' }}>Dispensed</th>
                <th>Transaction Time</th>
              </tr>
            </thead>
            <tbody>
              {dispenses.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem 0' }}>
                    <EmptyState
                      icon="⛽"
                      title="No dispensing transactions"
                      message="No verified vehicle refuels have been recorded at this station yet."
                    />
                  </td>
                </tr>
              ) : (
                dispenses.slice(0, 20).map(d => (
                  <tr key={d.id}>
                    <td className="td-bold td-link" style={{ fontFamily: 'monospace' }}>
                      {d.plate_number}
                    </td>
                    <td className="td-muted">{d.vehicle_type || '—'}</td>
                    <td>
                      <span className="badge badge-gray">{d.fuel_type || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatLiters(d.requested_liters)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatLiters(d.liters_dispensed)}
                    </td>
                    <td className="td-muted" title={formatDateTime(d.occurred_at)}>
                      {formatRelativeTime(d.occurred_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {dispenses.length > 20 && (
          <div className="pagination">
            <span>Showing latest 20 of {dispenses.length} transactions</span>
          </div>
        )}
      </div>

      {/* Reconciliation History */}
      <div className="table-card">
        <div className="table-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span className="table-title">Reconciliation History</span>
            <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              ({reconciliations.length} check{reconciliations.length !== 1 ? 's' : ''})
            </span>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleRunRecon}
            disabled={reconLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {reconLoading ? (
              <>
                <span className="spinner-sm" />
                <span>Running Audit…</span>
              </>
            ) : (
              <>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Run Reconciliation Now</span>
              </>
            )}
          </button>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Audit Period</th>
                <th style={{ textAlign: 'right' }}>Tank Delta</th>
                <th style={{ textAlign: 'right' }}>Verified Sales</th>
                <th style={{ textAlign: 'right' }}>Variance</th>
                <th>Status</th>
                <th>Stock-Out Audit</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem 0' }}>
                    <EmptyState
                      icon="📊"
                      title="No reconciliations yet"
                      message="Click 'Run Reconciliation Now' above or wait for the hourly automated audit job to run."
                    />
                  </td>
                </tr>
              ) : (
                reconciliations.map(row => {
                  const isAnomaly = row.status === 'FLAGGED' || row.stock_out_flag;
                  const varVal = row.variance_liters != null ? parseFloat(row.variance_liters) : null;
                  const isHighVar = varVal !== null && Math.abs(varVal) > 10;

                  return (
                    <tr
                      key={row.id}
                      className={isAnomaly ? 'clickable' : ''}
                      onClick={() => isAnomaly && navigate(`/reconciliations/${row.id}`)}
                      style={{
                        background: row.status === 'FLAGGED' ? 'rgba(245, 158, 11, 0.05)' : undefined,
                        cursor: isAnomaly ? 'pointer' : 'default',
                      }}
                      title={isAnomaly ? 'Click to inspect anomaly details and resolve' : undefined}
                    >
                      <td className="td-muted" style={{ fontSize: '0.8125rem' }}>
                        <span title={formatDateTime(row.period_start)}>
                          {formatRelativeTime(row.period_start)}
                        </span>
                        <span style={{ margin: '0 0.35rem', color: 'var(--text-light)' }}>→</span>
                        <span title={formatDateTime(row.period_end)}>
                          {formatRelativeTime(row.period_end)}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {row.tank_volume_delta != null ? formatLiters(row.tank_volume_delta) : '—'}
                      </td>

                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {row.verified_dispense_volume != null ? formatLiters(row.verified_dispense_volume) : '—'}
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
                        <StatusBadge status={row.status} />
                      </td>

                      <td>
                        {row.stock_out_flag ? (
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
          <span>Showing {reconciliations.length} reconciliation {reconciliations.length === 1 ? 'record' : 'records'}</span>
        </div>
      </div>
    </>
  );
}
