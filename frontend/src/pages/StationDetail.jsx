import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function StationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [station, setStation] = useState(null);
  const [tanks, setTanks] = useState([]);
  const [readings, setReadings] = useState({});
  const [reconciliations, setReconciliations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [reconLoading, setReconLoading] = useState(false);
  const [error, setError] = useState('');
  const [reconError, setReconError] = useState('');
  const [reconSuccess, setReconSuccess] = useState('');

  const [userRole, setUserRole] = useState(null);

  const fetchStationData = async () => {
    try {
      const me = await apiClient('/api/auth/me');
      if (me && me.user) setUserRole(me.user.role);

      const data = await apiClient(`/api/stations/${id}`);
      setStation(data.station);
      setTanks(data.station.tanks || []);

      // Fetch tank readings
      if (data.station.tanks) {
        const reads = {};
        for (const t of data.station.tanks) {
          try {
            const rd = await apiClient(`/api/tanks/${t.id}/readings/latest`);
            if (rd.reading) reads[t.id] = rd.reading;
          } catch (e) {
            console.error(`Failed to load reading for tank ${t.id}`, e);
          }
        }
        setReadings(reads);
      }

      // Fetch reconciliation history
      const rData = await apiClient(`/api/stations/${id}/reconciliations`);
      setReconciliations(rData.reconciliations || []);

    } catch (err) {
      setError(err.message || 'Unable to load station details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStationData();
  }, [id]);

  const handleRunReconciliation = async () => {
    if (reconLoading) return;
    setReconLoading(true);
    setReconError('');
    setReconSuccess('');

    try {
      await apiClient(`/api/stations/${id}/reconciliations/run`, { method: 'POST' });
      setReconSuccess('Reconciliation completed successfully.');
      await fetchStationData(); // Refresh history
    } catch (err) {
      setReconError(err.message || 'Unable to run reconciliation. Please try again.');
    } finally {
      setReconLoading(false);
    }
  };

  const handleSuspend = async () => {
    const reason = prompt('Reason for suspension:');
    if (!reason || !reason.trim()) return;
    try {
      await apiClient(`/api/stations/${id}/suspend`, {
        method: 'PUT',
        body: { reason }
      });
      alert('Station suspended successfully.');
      await fetchStationData();
    } catch (err) {
      alert(err.message || 'Failed to suspend station');
    }
  };

  const handleReinstate = async () => {
    const reason = prompt('Reason for reinstatement:');
    if (!reason || !reason.trim()) return;
    try {
      await apiClient(`/api/stations/${id}/reinstate`, {
        method: 'PUT',
        body: { reason }
      });
      alert('Station reinstated successfully.');
      await fetchStationData();
    } catch (err) {
      alert(err.message || 'Failed to reinstate station');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading station...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ color: 'red' }}>{error}</div>
        <Link to="/stations">← Back to Stations</Link>
      </div>
    );
  }

  if (!station) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'green';
      case 'CLOSED': return 'gray';
      case 'OUT_OF_STOCK': return 'red';
      case 'SUSPENDED': return 'darkred';
      default: return 'black';
    }
  };

  const getReconStatusBadge = (status) => {
    let color = 'gray';
    if (status === 'OK') color = 'green';
    if (status === 'FLAGGED') color = 'darkorange';
    if (status === 'RESOLVED') color = 'blue';

    return (
      <span style={{ 
        display: 'inline-block',
        padding: '2px 8px', 
        border: `1px solid ${color}`, 
        color, 
        fontWeight: 'bold', 
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        [ {status} ]
      </span>
    );
  };

  const formatDate = (ds) => {
    if (!ds) return 'N/A';
    const d = new Date(ds);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/stations" style={{ textDecoration: 'none', color: '#0066cc' }}>← Back to Stations</Link>
      </div>

      <div style={{ 
        border: '1px solid #ccc', 
        borderRadius: '8px', 
        padding: '1.5rem', 
        marginBottom: '2rem',
        backgroundColor: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 1rem 0' }}>Station: {station.name}</h2>
            <div style={{ color: '#555', marginBottom: '1rem' }}>SID: {station.sid}</div>
            
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <strong>Status:</strong> <span style={{ color: getStatusColor(station.current_status), fontWeight: 'bold' }}>{station.current_status}</span>
              </div>
              <div>
                <strong>Declared:</strong> {formatDate(station.status_declared_at || station.created_at)}
              </div>
              <div>
                <strong>Location:</strong> {station.location || 'N/A'}
              </div>
            </div>
          </div>
          
          {userRole === 'GOV_REGULATOR' && (
            <div>
              {station.current_status !== 'SUSPENDED' ? (
                <button onClick={handleSuspend} style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'darkred',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                  Suspend Station
                </button>
              ) : (
                <button onClick={handleReinstate} style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'green',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                  Reinstate Station
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>Tank / ATG Readings</h3>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
        {tanks.length === 0 && <p>No tanks found for this station.</p>}
        {tanks.map(t => {
          const reading = readings[t.id];
          const capacity = parseFloat(t.capacity_liters) || 1;
          const currentVol = reading ? parseFloat(reading.volume_liters) : 0;
          let pct = (currentVol / capacity) * 100;
          if (pct < 0) pct = 0;
          if (pct > 100) pct = 100;

          return (
            <div key={t.id} style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '1rem', 
              width: '300px',
              backgroundColor: '#fff'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>TANK {t.id}</h4>
              <div style={{ marginBottom: '0.5rem' }}><strong>Fuel:</strong> {t.product_type}</div>
              
              {reading ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span>Current Volume</span>
                    <strong>{parseFloat(reading.volume_liters).toLocaleString()} L</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#666', fontSize: '0.9em' }}>
                    <span>Capacity</span>
                    <span>{parseFloat(t.capacity_liters).toLocaleString()} L</span>
                  </div>

                  <div style={{ height: '10px', backgroundColor: '#eee', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div style={{ width: `${pct}%`, backgroundColor: '#0066cc', height: '100%' }}></div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 'bold', marginBottom: '1rem', color: '#0066cc' }}>
                    {pct.toFixed(1)}% Full
                  </div>

                  <div style={{ fontSize: '0.85em', color: '#666' }}>
                    <div><strong>Latest Reading:</strong> {formatDate(reading.reading_time)}</div>
                    <div><strong>Source:</strong> {reading.source}</div>
                  </div>
                </>
              ) : (
                <div style={{ color: '#888', fontStyle: 'italic', padding: '1rem 0' }}>No ATG reading available</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Reconciliation History</h3>
        <div>
          <button 
            onClick={handleRunReconciliation}
            disabled={reconLoading}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: reconLoading ? '#ccc' : '#0066cc', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: reconLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {reconLoading ? 'Running reconciliation...' : 'Run Reconciliation Now'}
          </button>
        </div>
      </div>

      {reconError && <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>{reconError}</div>}
      {reconSuccess && <div style={{ color: 'green', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#e6ffe6', borderRadius: '4px' }}>{reconSuccess}</div>}

      <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.75rem' }}>Period</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Tank Vol Delta</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Verified Dispense</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Variance</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Stock-Out Check</th>
            </tr>
          </thead>
          <tbody>
            {reconciliations.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: '#666' }}>
                  No reconciliations available for this station.
                </td>
              </tr>
            ) : (
              reconciliations.map(row => {
                const isFlagged = row.status === 'FLAGGED' || row.stock_out_flag;
                return (
                  <tr 
                    key={row.id} 
                    onClick={() => isFlagged ? navigate(`/reconciliations/${row.id}`) : null}
                    style={{ 
                      borderBottom: '1px solid #eee', 
                      cursor: isFlagged ? 'pointer' : 'default',
                      backgroundColor: isFlagged ? '#fffdf5' : '#fff'
                    }}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.85em', color: '#555' }}>
                        {formatDate(row.period_start)}
                        <br/>→ {formatDate(row.period_end)}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {row.tank_volume_delta ? `${parseFloat(row.tank_volume_delta).toLocaleString()} L` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {row.verified_dispense_volume ? `${parseFloat(row.verified_dispense_volume).toLocaleString()} L` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {row.variance != null ? `${parseFloat(row.variance).toLocaleString()} L` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {getReconStatusBadge(row.status)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {row.stock_out_flag ? (
                        <span style={{ color: 'darkred', fontWeight: 'bold' }}>[ ⚠ STOCK-OUT FLAG ]</span>
                      ) : (
                        <span style={{ color: '#888', fontSize: '0.9em' }}>No stock-out contradiction</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
