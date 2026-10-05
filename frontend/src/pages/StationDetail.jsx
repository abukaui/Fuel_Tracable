import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

function StatusBadge({ status }) {
  const map = { OPEN: 'badge-green', CLOSED: 'badge-gray', OUT_OF_STOCK: 'badge-orange', SUSPENDED: 'badge-red' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}
function ReconBadge({ status }) {
  const map = { OK: 'badge-green', FLAGGED: 'badge-orange', RESOLVED: 'badge-blue', INCOMPLETE: 'badge-gray' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

export default function StationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [station, setStation] = useState(null);
  const [tanks, setTanks] = useState([]);
  const [readings, setReadings] = useState({});
  const [reconciliations, setReconciliations] = useState([]);
  const [dispenses, setDispenses] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reconLoading, setReconLoading] = useState(false);
  const [error, setError] = useState('');
  const [reconSuccess, setReconSuccess] = useState('');
  const [reconError, setReconError] = useState('');

  const fetchData = async () => {
    try {
      const me = await apiClient('/api/auth/me');
      if (me?.user) setUserRole(me.user.role);
      const data = await apiClient(`/api/stations/${id}`);
      setStation(data.station);
      setTanks(data.station.tanks || []);
      if (data.station.tanks) {
        const reads = {};
        for (const t of data.station.tanks) {
          try {
            const rd = await apiClient(`/api/tanks/${t.id}/readings/latest`);
            if (rd.reading) reads[t.id] = rd.reading;
          } catch {}
        }
        setReadings(reads);
      }
      const rData = await apiClient(`/api/stations/${id}/reconciliations`);
      setReconciliations(rData.reconciliations || []);
      try {
        const dData = await apiClient(`/api/stations/${id}/dispenses`);
        setDispenses(dData.dispenses || []);
      } catch {}
    } catch (err) {
      setError(err.message || 'Failed to load station.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleRunRecon = async () => {
    setReconLoading(true); setReconError(''); setReconSuccess('');
    try {
      await apiClient(`/api/stations/${id}/reconciliations/run`, { method: 'POST' });
      setReconSuccess('Reconciliation completed successfully.');
      await fetchData();
    } catch (err) {
      setReconError(err.message || 'Reconciliation failed.');
    } finally { setReconLoading(false); }
  };

  const handleSuspend = async () => {
    const reason = prompt('Reason for suspension:');
    if (!reason?.trim()) return;
    try {
      await apiClient(`/api/stations/${id}/suspend`, { method: 'PUT', body: { reason } });
      await fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleReinstate = async () => {
    const reason = prompt('Reason for reinstatement:');
    if (!reason?.trim()) return;
    try {
      await apiClient(`/api/stations/${id}/reinstate`, { method: 'PUT', body: { reason } });
      await fetchData();
    } catch (err) { alert(err.message); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

  if (loading) return <div className="loading-screen">⏳ Loading station...</div>;
  if (error) return <div className="alert alert-error">{error} <Link to="/stations">← Back</Link></div>;
  if (!station) return null;

  return (
    <>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ marginBottom: '0.25rem' }}>
            <Link to="/stations" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>← Stations</Link>
          </div>
          <h1 className="page-title">{station.name}</h1>
          <p className="page-subtitle">SID: {station.sid} · {station.location || 'No location'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <StatusBadge status={station.current_status} />
          {userRole === 'GOV_REGULATOR' && (
            station.current_status !== 'SUSPENDED'
              ? <button className="btn btn-danger btn-sm" onClick={handleSuspend}>Suspend Station</button>
              : <button className="btn btn-success btn-sm" onClick={handleReinstate}>Reinstate Station</button>
          )}
        </div>
      </div>

      {/* Tanks */}
      <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Tank / ATG Readings</h3>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {tanks.length === 0 && <p className="text-muted">No tanks registered for this station.</p>}
        {tanks.map(t => {
          const r = readings[t.id];
          const cap = parseFloat(t.capacity_liters) || 1;
          const vol = r ? parseFloat(r.volume_liters) : 0;
          const pct = Math.min(100, Math.max(0, (vol / cap) * 100));
          const fillColor = pct > 50 ? 'var(--green)' : pct > 20 ? 'var(--orange)' : 'var(--red)';
          return (
            <div key={t.id} className="card" style={{ minWidth: 240, flex: '1 1 240px', maxWidth: 320 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{t.product_type}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tank ID: {t.id.slice(0, 8)}…</div>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: fillColor }}>
                  {r ? `${parseFloat(r.volume_liters).toLocaleString()} L` : '—'}
                </div>
              </div>
              <div className="progress-wrap" style={{ marginBottom: '0.4rem' }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: fillColor }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>{pct.toFixed(1)}% full</span>
                <span>of {parseFloat(t.capacity_liters).toLocaleString()} L</span>
              </div>
              {r && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '0.5rem' }}>Last: {fmt(r.reading_time)} · {r.source}</div>}
            </div>
          );
        })}
      </div>

      {/* Dispensing History */}
      <div className="table-card" style={{ marginBottom: '2rem' }}>
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
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No dispense transactions yet.</td></tr>
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

      {/* Reconciliation */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <div className="table-title">Reconciliation History</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {reconSuccess && <span style={{ fontSize: '12px', color: 'var(--green)' }}>✓ {reconSuccess}</span>}
            {reconError && <span style={{ fontSize: '12px', color: 'var(--red)' }}>{reconError}</span>}
            <button className="btn btn-primary btn-sm" onClick={handleRunRecon} disabled={reconLoading}>
              {reconLoading ? 'Running…' : 'Run Reconciliation Now'}
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th style={{ textAlign: 'right' }}>Tank Delta</th>
              <th style={{ textAlign: 'right' }}>Verified Dispense</th>
              <th style={{ textAlign: 'right' }}>Variance</th>
              <th>Status</th>
              <th>Stock-Out Flag</th>
            </tr>
          </thead>
          <tbody>
            {reconciliations.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No reconciliations yet.</td></tr>
            ) : reconciliations.map(row => (
              <tr
                key={row.id}
                className={row.status === 'FLAGGED' || row.stock_out_flag ? 'clickable' : ''}
                onClick={() => (row.status === 'FLAGGED' || row.stock_out_flag) && navigate(`/reconciliations/${row.id}`)}
                style={{ background: row.status === 'FLAGGED' ? '#fffbeb' : undefined }}
              >
                <td className="td-muted" style={{ fontSize: '12px' }}>
                  {fmt(row.period_start)}<br />→ {fmt(row.period_end)}
                </td>
                <td style={{ textAlign: 'right' }}>{row.tank_volume_delta != null ? `${parseFloat(row.tank_volume_delta).toFixed(1)} L` : '—'}</td>
                <td style={{ textAlign: 'right' }}>{row.verified_dispense_volume != null ? `${parseFloat(row.verified_dispense_volume).toFixed(1)} L` : '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: Math.abs(row.variance_liters) > 10 ? 'var(--red)' : undefined }}>
                  {row.variance_liters != null ? `${parseFloat(row.variance_liters).toFixed(1)} L` : '—'}
                </td>
                <td><ReconBadge status={row.status} /></td>
                <td>{row.stock_out_flag ? <span className="badge badge-red">⚠ FLAGGED</span> : <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <span>Showing {reconciliations.length} record{reconciliations.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </>
  );
}
