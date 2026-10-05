import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';

function ReconBadge({ status }) {
  const map = { OK: 'badge-green', FLAGGED: 'badge-orange', RESOLVED: 'badge-blue', INCOMPLETE: 'badge-gray' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

export default function ReconciliationDetail() {
  const { id } = useParams();
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
        apiClient('/api/auth/me'),
        apiClient(`/api/reconciliations/${id}`),
      ]);
      if (me?.user) setUserRole(me.user.role);
      setRec(d.reconciliation);
      if (d.reconciliation?.station_id) {
        const [sd, dd] = await Promise.all([
          apiClient(`/api/stations/${d.reconciliation.station_id}`),
          apiClient(`/api/stations/${d.reconciliation.station_id}/dispenses`).catch(() => ({ dispenses: [] })),
        ]);
        setStation(sd.station);
        setDispenses(dd.dispenses || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setResolving(true); setResolveError('');
    try {
      const res = await apiClient(`/api/reconciliations/${id}/resolve`, {
        method: 'PUT', body: { note }
      });
      setRec(res.reconciliation);
      setNote('');
    } catch (err) {
      setResolveError(err.message || 'Failed to resolve.');
    } finally { setResolving(false); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

  if (loading) return <div className="loading-screen">⏳ Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!rec) return null;

  return (
    <>
      <div className="page-header">
        <div style={{ marginBottom: '0.25rem' }}>
          <Link to={station ? `/stations/${station.id}` : '/stations'} style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>
            ← {station?.name || 'Back to Station'}
          </Link>
        </div>
        <h1 className="page-title">Reconciliation Detail</h1>
        <p className="page-subtitle">
          Period: {fmt(rec.period_start)} → {fmt(rec.period_end)}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Status card */}
        <div className="card">
          <div className="card-title">Status</div>
          <div style={{ marginTop: '0.5rem' }}><ReconBadge status={rec.status} /></div>
          {rec.stock_out_flag && (
            <div style={{ marginTop: '0.75rem' }}>
              <span className="badge badge-red">⚠ Stock-Out Contradiction Detected</span>
            </div>
          )}
        </div>
        {/* Station card */}
        <div className="card">
          <div className="card-title">Station</div>
          {station ? (
            <>
              <div style={{ fontWeight: 600 }}>{station.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>SID: {station.sid}</div>
            </>
          ) : <div className="text-muted">—</div>}
        </div>
      </div>

      {/* Volume evidence */}
      <div className="table-card" style={{ marginBottom: '1.5rem' }}>
        <div className="table-header"><span className="table-title">Volume Evidence</span></div>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th style={{ textAlign: 'right' }}>Value</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="td-bold">Tank Volume Delta</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                {rec.tank_volume_delta != null ? `${parseFloat(rec.tank_volume_delta).toFixed(2)} L` : 'N/A'}
              </td>
              <td className="td-muted">Measured change in ATG tank levels</td>
            </tr>
            <tr>
              <td className="td-bold">Verified Dispense Volume</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                {rec.verified_dispense_volume != null ? `${parseFloat(rec.verified_dispense_volume).toFixed(2)} L` : 'N/A'}
              </td>
              <td className="td-muted">Total OTP-verified driver dispenses</td>
            </tr>
            <tr style={{ background: '#fafafa' }}>
              <td className="td-bold">Variance</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: Math.abs(parseFloat(rec.variance_liters || 0)) > 10 ? 'var(--red)' : 'var(--text)' }}>
                {rec.variance_liters != null ? `${parseFloat(rec.variance_liters).toFixed(2)} L` : 'N/A'}
              </td>
              <td className="td-muted">Unexplained fuel difference</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dispensing History for this period */}
      <div className="table-card" style={{ marginBottom: '1.5rem' }}>
        <div className="table-header">
          <span className="table-title">Dispensing History</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dispenses.length} transaction{dispenses.length !== 1 ? 's' : ''}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Plate Number</th>
              <th>Vehicle Type</th>
              <th>Fuel Type</th>
              <th style={{ textAlign: 'right' }}>Requested</th>
              <th style={{ textAlign: 'right' }}>Dispensed</th>
              <th>Date / Time</th>
            </tr>
          </thead>
          <tbody>
            {dispenses.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No dispense transactions found.</td></tr>
            ) : dispenses.map(d => (
              <tr key={d.id}>
                <td className="td-bold">{d.plate_number}</td>
                <td>{d.vehicle_type || '—'}</td>
                <td>{d.fuel_type || '—'}</td>
                <td style={{ textAlign: 'right' }}>{parseFloat(d.requested_liters).toFixed(1)} L</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{parseFloat(d.liters_dispensed).toFixed(1)} L</td>
                <td className="td-muted" style={{ fontSize: '12px' }}>{fmt(d.occurred_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resolution */}
      <div className="card">
        {rec.status === 'RESOLVED' ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>✅ Resolution Details</div>
            <div className="alert alert-success">
              <div>
                <strong>Investigated By:</strong> {rec.investigated_by || 'Unknown'}<br />
                <strong>Note:</strong> {rec.investigation_note}
              </div>
            </div>
          </>
        ) : userRole === 'GOV_REGULATOR' ? (
          <form onSubmit={handleResolve}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Resolve This Reconciliation</div>
            {resolveError && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{resolveError}</div>}
            <div className="form-group">
              <label className="form-label">Investigation Note</label>
              <textarea
                className="form-textarea"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Reviewed the ATG readings and dispensing records. Discrepancy explained..."
                required
              />
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="submit" className="btn btn-primary" disabled={resolving}>
                {resolving ? 'Resolving…' : 'Resolve Reconciliation'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>
            Only GOV_REGULATOR can resolve this reconciliation.
          </div>
        )}
      </div>
    </>
  );
}
