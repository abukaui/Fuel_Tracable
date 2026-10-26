import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import logo from '../assets/logo.png';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiClient('/api/auth/login', { body: { phone, password } });
      const token = data.result?.token;
      if (!token) throw new Error('Invalid credentials.');
      localStorage.setItem('token', token);
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.role;
      if (role === 'GOV_REGULATOR' || role === 'ADMIN') navigate('/stations');
      else if (role === 'STATION_OPERATOR') navigate('/operator');
      else navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid phone number or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Top Left Global Back to Home */}
      <Link
        to="/"
        style={{
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#e2e8f0',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 600,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          padding: '0.45rem 0.95rem',
          borderRadius: '99px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)';
          e.currentTarget.style.transform = 'translateX(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Home</span>
      </Link>

      <div className="login-card">
        {/* Back to Home Button */}
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0284c7',
            textDecoration: 'none',
            marginBottom: '1rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '8px',
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.16)';
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.08)';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Home</span>
        </Link>

        <div className="login-logo">
          <img src={logo} alt="Petroleum and Energy Authority Logo" className="login-logo-img" />
          <div className="login-logo-title">FuelGuard</div>
          <div className="login-logo-sub">Fuel Traceability &amp; Control System</div>
        </div>

        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text)' }}>
          Sign in to your account
        </h2>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              className="form-input"
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+251911000000"
              required
            />
          </div>


          <div className="form-group">
            <label className="form-label">Password</label>

            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingRight: '45px' }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  backgroundColor: 'transparent',
                  opacity: 0.4,
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '4px'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', fontSize: '14px', marginTop: '0.5rem' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '12px', color: 'var(--text-muted)' }}>
          Drivers access fuel services via USSD shortcode
        </p>
      </div>
    </div>
  );
}
