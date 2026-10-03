import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

function StatusBadge({ status }) {
  const map = { OPEN: 'badge-green', CLOSED: 'badge-gray', OUT_OF_STOCK: 'badge-orange', SUSPENDED: 'badge-red' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

function DispenseBadge({ status }) {
  const map = { DISPENSED: 'badge-green', PENDING: 'badge-orange', USED: 'badge-blue', EXPIRED: 'badge-red' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

export default function OperatorDashboard() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpForm, setOtpForm] = useState({ otpCode: '', plateNumber: '' });
  const [previewData, setPreviewData] = useState(null);
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [dispenseError, setDispenseError] = useState('');
  const [dispenseSuccess, setDispenseSuccess] = useState('');

  useEffect(() => {
    apiClient('/api/stations')
      .then(data => setStations(data.stations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalStations = stations.length;
  const openCount = stations.filter(s => s.current_status === 'OPEN').length;
  const suspendedCount = stations.filter(s => s.current_status === 'SUSPENDED').length;
  const outOfStockCount = stations.filter(s => s.current_status === 'OUT_OF_STOCK').length;

  const handlePreview = async (e) => {
    e.preventDefault();
    setDispenseError('');
    setDispenseSuccess('');
    setDispenseLoading(true);

    try {
      const data = await apiClient('/api/dispense/preview', { method: 'POST', body: { otpCode: otpForm.otpCode } });
      const plateMatch = data.preview.matchedRequest.plate_number.trim().toUpperCase() === otpForm.plateNumber.trim().toUpperCase();
      
      if (!plateMatch) {
        throw new Error('Plate number does not match. Please verify the vehicle.');
      }
      
      setPreviewData(data.preview);
    } catch (err) {
      setDispenseError(err.message || 'OTP verification failed.');
    } finally {
      setDispenseLoading(false);
    }
  };

  const handleConfirm = async () => {
    setDispenseError('');
    setDispenseLoading(true);

    try {
      const payload = {
        otpCode: otpForm.otpCode,
        plateNumber: otpForm.plateNumber,
        litersDispensed: parseFloat(previewData.matchedRequest.requested_liters)
      };
      await apiClient('/api/dispense/verify', { method: 'POST', body: payload });
      setDispenseSuccess(`Successfully verified and dispensed ${payload.litersDispensed} liters!`);
      setOtpForm({ otpCode: '', plateNumber: '' });
      setPreviewData(null);
    } catch (err) {
      setDispenseError(err.message || 'Dispense failed.');
    } finally {
      setDispenseLoading(false);
    }
  };

  const cancelPreview = () => {
    setPreviewData(null);
    setOtpForm({ otpCode: '', plateNumber: '' });
  };

  if (loading) return <div className="loading-screen">⏳ Loading dashboard...</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Operator Dashboard</h1>
        <p className="page-subtitle">Manage fuel dispensing operations and view station status.</p>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="card-icon" style={{ background: '#dbeafe' }}>🏪</div>
          <div className="stat-card-body">
            <div className="stat-card-label">Total Stations</div>
            <div className="stat-card-value">{totalStations}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-icon" style={{ background: '#dcfce7' }}>✅</div>
          <div className="stat-card-body">
            <div className="stat-card-label">Open</div>
            <div className="stat-card-value" style={{ color: 'var(--green)' }}>{openCount}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-icon" style={{ background: '#ffedd5' }}>⛽</div>
          <div className="stat-card-body">
            <div className="stat-card-label">Out of Stock</div>
            <div className="stat-card-value" style={{ color: 'var(--orange)' }}>{outOfStockCount}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-icon" style={{ background: '#fee2e2' }}>🔒</div>
          <div className="stat-card-body">
            <div className="stat-card-label">Suspended</div>
            <div className="stat-card-value" style={{ color: 'var(--red)' }}>{suspendedCount}</div>
          </div>
        </div>
      </div>

      {/* OTP Verification Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Verify OTP & Dispense Fuel</h3>
        {dispenseError && <div className="alert alert-error">{dispenseError}</div>}
        {dispenseSuccess && <div className="alert alert-success">{dispenseSuccess}</div>}
        
        {!previewData ? (
          <form onSubmit={handlePreview} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label">OTP Code</label>
              <input 
                className="form-input" 
                type="text" 
                placeholder="e.g. 123456" 
                value={otpForm.otpCode} 
                onChange={e => setOtpForm({...otpForm, otpCode: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label">Plate Number</label>
              <input 
                className="form-input" 
                type="text" 
                placeholder="e.g. AB-12345" 
                value={otpForm.plateNumber} 
                onChange={e => setOtpForm({...otpForm, plateNumber: e.target.value})} 
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={dispenseLoading} style={{ height: '38px' }}>
              {dispenseLoading ? 'Checking...' : 'Check Request'}
            </button>
          </form>
        ) : (
          <div style={{ padding: '1rem', background: 'var(--bg-lighter)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ marginBottom: '1rem' }}>Vehicle Information Confirmed</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Plate Number</div>
                <div style={{ fontWeight: 600 }}>{previewData.matchedRequest.plate_number}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vehicle Type</div>
                <div style={{ fontWeight: 600 }}>{previewData.vehicleDetails.vehicle_type || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Requested Fuel</div>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{previewData.matchedRequest.requested_liters} L ({previewData.vehicleDetails.fuel_type || 'N/A'})</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Remaining Quota</div>
                <div style={{ fontWeight: 600 }}>
                  {previewData.dailyLimit != null 
                    ? Math.max(0, previewData.dailyLimit - previewData.usedLiters).toFixed(2) + ' L' 
                    : 'No Limit'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleConfirm} className="btn btn-primary" disabled={dispenseLoading}>
                {dispenseLoading ? 'Dispensing...' : `Confirm & Dispense ${previewData.matchedRequest.requested_liters} L`}
              </button>
              <button onClick={cancelPreview} className="btn btn-secondary" disabled={dispenseLoading}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Station Status Table */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Station Status</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Use USSD to declare status changes</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>SID</th>
              <th>Station Name</th>
              <th>Location</th>
              <th>Status</th>
              <th>Declared At</th>
            </tr>
          </thead>
          <tbody>
            {stations.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No stations found.</td></tr>
            ) : stations.map(s => (
              <tr key={s.id}>
                <td className="td-bold td-link">{s.sid}</td>
                <td className="td-bold">{s.name}</td>
                <td className="td-muted">{s.location || '—'}</td>
                <td><StatusBadge status={s.current_status} /></td>
                <td className="td-muted" style={{ fontSize: '12px' }}>
                  {s.status_declared_at ? new Date(s.status_declared_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <span>Showing {stations.length} station{stations.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* USSD Info */}
      <div className="card" style={{ marginTop: '1.5rem', background: 'var(--sidebar-bg)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '2rem' }}>📱</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '0.35rem' }}>USSD Operations</div>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              Use the USSD shortcode to declare station status, verify OTP codes, and process fuel dispenses. 
              Dispensing operations must be completed via USSD for security compliance.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
