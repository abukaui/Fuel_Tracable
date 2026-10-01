import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function ReconciliationDetail() {
  const { id } = useParams();
  const [reconciliation, setReconciliation] = useState(null);
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const me = await apiClient('/api/auth/me');
        if (me && me.user) setUserRole(me.user.role);
        
        const reconData = await apiClient(`/api/reconciliations/${id}`);
        const recon = reconData.reconciliation;
        setReconciliation(recon);

        if (recon && recon.station_id) {
          const stationData = await apiClient(`/api/stations/${recon.station_id}`);
          setStation(stationData.station);
        }
      } catch (err) {
        setError(err.message || 'Unable to load reconciliation detail.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading reconciliation history...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ color: 'red' }}>{error}</div>
        <Link to="/stations">← Back to Stations</Link>
      </div>
    );
  }

  if (!reconciliation) return null;

  const getReconStatusBadge = (status) => {
    let color = 'gray';
    if (status === 'OK') color = 'green';
    if (status === 'FLAGGED') color = 'darkorange';
    if (status === 'RESOLVED') color = 'blue';

    return (
      <span style={{ 
        display: 'inline-block',
        padding: '4px 12px', 
        border: `2px solid ${color}`, 
        color, 
        fontWeight: 'bold', 
        borderRadius: '6px'
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
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to={reconciliation.station_id ? `/stations/${reconciliation.station_id}` : '/stations'} style={{ textDecoration: 'none', color: '#0066cc' }}>
          ← Back to Station
        </Link>
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '2rem' }}>
        <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '1rem', marginTop: 0 }}>RECONCILIATION DETAIL</h2>

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>Station</h4>
            {station ? (
              <>
                <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{station.name}</div>
                <div style={{ color: '#555' }}>{station.sid}</div>
              </>
            ) : (
              <div>Loading station...</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>Period</h4>
            <div>{formatDate(reconciliation.period_start)}</div>
            <div style={{ color: '#aaa', margin: '0.2rem 0' }}>↓</div>
            <div>{formatDate(reconciliation.period_end)}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Tank Volume Delta</div>
              <div style={{ fontSize: '0.85em', color: '#666' }}>Measured change in ATG levels</div>
            </div>
            <div style={{ fontSize: '1.2em' }}>
              {reconciliation.tank_volume_delta != null ? `${parseFloat(reconciliation.tank_volume_delta).toLocaleString()} L` : 'N/A'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Verified Dispense Volume</div>
              <div style={{ fontSize: '0.85em', color: '#666' }}>Total recorded driver dispenses</div>
            </div>
            <div style={{ fontSize: '1.2em' }}>
              {reconciliation.verified_dispense_volume != null ? `${parseFloat(reconciliation.verified_dispense_volume).toLocaleString()} L` : 'N/A'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '6px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Variance</div>
              <div style={{ fontSize: '0.85em', color: '#666' }}>Unexplained missing/surplus fuel</div>
            </div>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>
              {reconciliation.variance != null ? `${parseFloat(reconciliation.variance).toLocaleString()} L` : 'N/A'}
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h4 style={{ margin: '0 0 1rem 0', color: '#666' }}>Status</h4>
            {getReconStatusBadge(reconciliation.status)}
          </div>
          <div>
            <h4 style={{ margin: '0 0 1rem 0', color: '#666' }}>Stock-Out Check</h4>
            {reconciliation.stock_out_flag ? (
              <span style={{ 
                display: 'inline-block',
                padding: '4px 12px', 
                border: '2px solid darkred', 
                color: 'darkred', 
                fontWeight: 'bold', 
                borderRadius: '6px'
              }}>
                [ ⚠ STOCK-OUT FLAG ]
              </span>
            ) : (
              <span style={{ color: '#888' }}>No stock-out contradiction</span>
            )}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />

        {reconciliation.status === 'RESOLVED' ? (
          <div>
            <h4 style={{ margin: '0 0 1rem 0', color: '#666' }}>Resolution details</h4>
            <div style={{ backgroundColor: '#f0f8ff', padding: '1rem', borderRadius: '6px' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Investigated By:</strong> {reconciliation.investigated_by || 'Unknown'}</p>
              <p style={{ margin: 0 }}><strong>Note:</strong> {reconciliation.investigation_note}</p>
            </div>
          </div>
        ) : (userRole === 'GOV_REGULATOR' ? (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const note = formData.get('note');
            if (!note || !note.trim()) return;

            setLoading(true);
            try {
              const res = await apiClient(`/api/reconciliations/${id}/resolve`, {
                method: 'PUT',
                body: JSON.stringify({ note })
              });
              setReconciliation(res.reconciliation);
              alert('Reconciliation resolved successfully.');
            } catch (err) {
              alert(err.message || 'Error resolving reconciliation');
            } finally {
              setLoading(false);
            }
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#666' }}>Resolution Note</h4>
            <textarea 
              name="note" 
              required
              rows="4" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '1rem' }}
              placeholder="Reviewed the ATG readings and dispensing records..."
            ></textarea>
            <div style={{ textAlign: 'right' }}>
              <button type="submit" disabled={loading} style={{ 
                padding: '0.75rem 2rem', 
                backgroundColor: loading ? '#ccc' : '#0066cc', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}>
                {loading ? 'Resolving...' : 'Resolve Reconciliation'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'right', color: '#666' }}>
            Only GOV_REGULATOR can resolve this reconciliation.
          </div>
        ))}

      </div>
    </div>
  );
}
