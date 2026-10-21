import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import {
  formatLiters,
  formatDateTime,
  formatRelativeTime,
  formatReconciliationEquation,
} from '../utils/formatters';

export default function ReconciliationDetail() {
  const { id } = useParams();
  const { addToast } = useToast();

  const [rec, setRec] = useState(null);
  const [station, setStation] = useState(null);
  const [dispenses, setDispenses] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const fetchData = async () => {
    try {
      const [me, d] = await Promise.all([
        apiClient('/api/auth/me').catch(() => null),
        apiClient(`/api/reconciliations/${id}`),
      ]);

      if (me?.user) setUserRole(me.user.role);
      setRec(d.reconciliation);

      if (d.reconciliation?.station_id) {
        const [sd, dd] = await Promise.all([
          apiClient(`/api/stations/${d.reconciliation.station_id}`).catch(() => null),
          apiClient(`/api/stations/${d.reconciliation.station_id}/dispenses`).catch(() => ({ dispenses: [] })),
        ]);
        if (sd?.station) setStation(sd.station);
        setDispenses(dd.dispenses || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load reconciliation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!note.trim() || resolving) return;
    setResolving(true);
    setResolveError('');
    try {
      const res = await apiClient(`/api/reconciliations/${id}/resolve`, {
        method: 'PUT',
        body: { note: note.trim() },
      });
      setRec(res.reconciliation);
      setNote('');
      addToast('Reconciliation has been successfully resolved.', 'success');
    } catch (err) {
      setResolveError(err.message || 'Failed to resolve reconciliation.');
      addToast(err.message || 'Failed to resolve reconciliation.', 'error');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="table-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton-box" style={{ width: '40%', height: '2rem' }} />
          <div className="skeleton-box" style={{ width: '60%', height: '1.25rem' }} />
          <div style={{ height: '2rem' }} />
          <div className="skeleton-box" style={{ width: '100%', height: '12rem' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ margin: '2rem 0' }}>
        <span>{error}</span>
        <div style={{ marginTop: '0.75rem' }}>
          <Link to="/reconciliations" className="btn btn-outline btn-sm">
            ← Back to Reconciliations
          </Link>
        </div>
      </div>
    );
  }

  if (!rec) return null;

  const isAnomaly = rec.status === 'FLAGGED' || rec.stock_out_flag;
  const isResolved = rec.status === 'RESOLVED';
  const equationText = formatReconciliationEquation(
    rec.tank_volume_delta,
    rec.verified_dispense_volume,
    rec.variance_liters
  );

  return (
    <>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ marginBottom: '0.4rem', display: 'flex', gap: '0.75rem', fontSize: '13px' }}>
            <Link to="/reconciliations" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              ← Reconciliations
            </Link>
            {station && (
              <>
                <span style={{ color: 'var(--text-light)' }}>/</span>
                <Link to={`/stations/${station.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                  {station.name} ({station.sid})
                </Link>
              </>
            )}
          </div>
          <h1 className="page-title">Reconciliation Audit</h1>
          <p className="page-subtitle">
            <span>Audit Window: {formatDateTime(rec.period_start)} → {formatDateTime(rec.period_end)}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <StatusBadge status={rec.status} />
          {rec.stock_out_flag && <StatusBadge isStockOut={true} />}
        </div>
      </div>

      {/* Arithmetic Equation Banner */}
      <div
        className="card"
        style={{
          background: isAnomaly && !isResolved ? 'rgba(245, 158, 11, 0.08)' : 'var(--card-bg)',
          borderColor: isAnomaly && !isResolved ? 'rgba(245, 158, 11, 0.3)' : 'var(--border)',
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>
          Reconciliation Balance Equation
        </div>
        <div
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: isAnomaly && !isResolved ? 'var(--orange)' : 'var(--text)',
            fontFamily: 'monospace',
          }}
        >
          {equationText}
        </div>
      </div>

      {/* Stock-Out Contradiction Alert */}
      {rec.stock_out_flag && (
        <div
          className="alert alert-error"
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            borderLeft: '4px solid var(--red)',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
            ⚠ False Stock-Out Contradiction Detected
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            Station operator declared status as <strong>OUT_OF_STOCK</strong> during this period, but automated tank sensors (ATG) confirm fuel remained in the storage tank. This indicates potential black-market hoarding or unauthorized distribution.
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-title">Station Details</div>
          {station ? (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{station.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                SID: <strong>{station.sid}</strong> · {station.location || 'Location unassigned'}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <Link to={`/stations/${station.id}`} className="btn btn-outline btn-sm">
                  View Station Dashboard →
                </Link>
              </div>
            </div>
          ) : (
            <div className="td-muted">No station linked.</div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Audit Status & Variance</div>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StatusBadge status={rec.status} />
              {rec.stock_out_flag && <StatusBadge isStockOut={true} />}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Variance Tolerance: <strong>10.0 L</strong>
            </div>
            <div style={{ fontSize: '0.875rem', color: Math.abs(parseFloat(rec.variance_liters || 0)) > 10 ? 'var(--red)' : 'var(--text-muted)' }}>
              Actual Variance: <strong>{formatLiters(rec.variance_liters)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Evidence Breakdown */}
      <div className="table-card" style={{ marginBottom: '1.5rem' }}>
        <div className="table-header">
          <span className="table-title">Audit Volume Telemetry</span>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Telemetry Metric</th>
                <th style={{ textAlign: 'right' }}>Measured Volume</th>
                <th>Source & Verification Rationale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td-bold">Physical Tank Delta</td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {rec.tank_volume_delta != null ? formatLiters(rec.tank_volume_delta) : '—'}
                </td>
                <td className="td-muted">
                  Difference in automated ATG gauge levels between window start and end.
                </td>
              </tr>
              <tr>
                <td className="td-bold">Verified Dispensed Volume</td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {rec.verified_dispense_volume != null ? formatLiters(rec.verified_dispense_volume) : '—'}
                </td>
                <td className="td-muted">
                  Sum of all driver OTP transactions officially authorized and pumped in this window.
                </td>
              </tr>
              <tr style={{ background: isAnomaly ? 'rgba(245, 158, 11, 0.05)' : undefined }}>
                <td className="td-bold">Unaccounted Variance</td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: Math.abs(parseFloat(rec.variance_liters || 0)) > 10 ? 'var(--red)' : 'var(--green)',
                  }}
                >
                  {rec.variance_liters != null ? formatLiters(rec.variance_liters) : '—'}
                </td>
                <td className="td-muted">
                  {Math.abs(parseFloat(rec.variance_liters || 0)) <= 10
                    ? 'Within legal meter tolerance threshold (≤ 10 L).'
                    : 'Exceeds legal tolerance. Fuel exited physical tank without recorded OTP transactions.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispenses during audit window */}
      <div className="table-card" style={{ marginBottom: '1.5rem' }}>
        <div className="table-header">
          <div>
            <span className="table-title">Dispense Transactions at Station</span>
            <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              ({dispenses.length} verified transactions)
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
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No dispense transactions recorded at this station.
                  </td>
                </tr>
              ) : (
                dispenses.slice(0, 10).map(d => (
                  <tr key={d.id}>
                    <td className="td-bold" style={{ fontFamily: 'monospace' }}>{d.plate_number}</td>
                    <td className="td-muted">{d.vehicle_type || '—'}</td>
                    <td><span className="badge badge-gray">{d.fuel_type || '—'}</span></td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatLiters(d.requested_liters)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{formatLiters(d.liters_dispensed)}</td>
                    <td className="td-muted" title={formatDateTime(d.occurred_at)}>{formatRelativeTime(d.occurred_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {dispenses.length > 10 && (
          <div className="pagination">
            <span>Showing latest 10 of {dispenses.length} transactions</span>
          </div>
        )}
      </div>

      {/* Resolution Section */}
      <div className="card">
        {isResolved ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--green)', marginBottom: '0.75rem' }}>
              <span>✓</span>
              <span>Reconciliation Resolved</span>
            </div>
            <div className="alert alert-success" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <strong>Investigated / Resolved By:</strong> {rec.investigated_by || 'Government Regulator'}
              </div>
              <div>
                <strong>Investigation Finding Note:</strong>
                <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                  {rec.investigation_note || 'Audit verified and dismissed.'}
                </p>
              </div>
            </div>
          </div>
        ) : rec.status === 'FLAGGED' || rec.stock_out_flag ? (
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>
              Resolve Regulatory Anomaly
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              As a regulatory officer, after conducting field inspection or reviewing delivery waybills, submit your findings to clear this flag.
            </p>

            {resolveError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {resolveError}
              </div>
            )}

            <form onSubmit={handleResolve}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">
                  Official Investigation Note <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="E.g., Inspected calibration log. Tank recalibrated by weights & measures on scheduled audit..."
                  required
                  disabled={resolving}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!note.trim() || resolving}
                >
                  {resolving ? 'Submitting Resolution…' : 'Resolve Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--green)', marginBottom: '0.25rem' }}>
              Normal Audit Record
            </div>
            <p style={{ fontSize: '0.875rem' }}>
              Physical telemetry matches recorded fuel dispensing within tolerance. No regulator resolution required.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
