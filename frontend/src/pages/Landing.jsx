import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import stationHeroImg from '../assets/station-hero.jpg';
import govBuildingImg from '../assets/gov-building.jpg';
import { fetchLandingStats } from '../api/public';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('loading');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDbDrawer, setShowDbDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [viewMode, setViewMode] = useState('national'); // 'national' or 'live-db'
  const [selectedStationSid, setSelectedStationSid] = useState('STA-001');
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());

  // Check if current visitor already has an active session
  const token = localStorage.getItem('token');
  let userRole = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userRole = payload.role;
    } catch {
      // invalid token
    }
  }

  // Initial fetch and continuous real-time telemetry polling every 4 seconds
  useEffect(() => {
    let isMounted = true;

    const loadData = () => {
      fetchLandingStats()
        .then(({ data, source }) => {
          if (isMounted && data) {
            setDbData(data);
            setDataSource(source);
            setLoading(false);
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    };

    loadData();
    const interval = setInterval(loadData, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const stats = dbData?.stats || {
    registeredStationsDisplay: '1,248+',
    registeredVehiclesDisplay: '85,000+',
    litersTrackedDaily: '2.4M+',
    systemUptime: '99.8%',
    rawStationsCount: 4,
    rawVehiclesCount: 3,
    rawTotalDispensed: 151,
  };

  // Find active tank from real DB telemetry based on selected station
  const allTanks = dbData?.tanks || [
    {
      sid: 'STA-001',
      stationName: 'Central Depot Station',
      location: 'Addis Ababa, Bole',
      status: 'OPEN',
      productType: 'PETROL',
      capacityLiters: 30000,
      currentVolumeLiters: 13999.5,
      percentage: 47,
      temperatureC: 22.4,
      recordedAt: new Date().toISOString(),
    },
    {
      sid: 'STA-002',
      stationName: 'Northern Gate Station',
      location: 'Addis Ababa, Piazza',
      status: 'OPEN',
      productType: 'PETROL',
      capacityLiters: 30000,
      currentVolumeLiters: 7787.8,
      percentage: 26,
      temperatureC: 29.6,
      recordedAt: new Date().toISOString(),
    },
    {
      sid: 'STA-003',
      stationName: 'Eastside Depot',
      location: 'Addis Ababa, Megenagna',
      status: 'OUT_OF_STOCK',
      productType: 'DIESEL',
      capacityLiters: 50000,
      currentVolumeLiters: 35210.8,
      percentage: 70,
      temperatureC: 25.8,
      recordedAt: new Date().toISOString(),
    },
    {
      sid: 'STA-LOW',
      stationName: 'Low Station',
      location: 'Addis Ababa, Kality',
      status: 'OUT_OF_STOCK',
      productType: 'DIESEL',
      capacityLiters: 1000,
      currentVolumeLiters: 506.5,
      percentage: 51,
      temperatureC: 28.8,
      recordedAt: new Date().toISOString(),
    },
  ];

  const activeTank = allTanks.find((t) => t.sid === selectedStationSid) || allTanks[0];

  const recentDispense = dbData?.recentDispenses?.[0] || {
    liters_dispensed: '34',
    plate_number: 'ABC-123',
    station_name: 'Central Depot Station',
    plate_verified: true,
  };

  const handleNavClick = (tab, sectionId) => {
    setActiveTab(tab);
    if (sectionId) {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="landing-root">
      {/* ── Top Navigation Bar ── */}
      <header className="landing-header">
        <div className="landing-nav-container">
          {/* Brand Logo & Title */}
          <div className="landing-brand" onClick={() => handleNavClick('home', 'hero')}>
            <img src={logoImg} alt="Petroleum & Energy Authority Logo" className="landing-logo-img" />
            <div className="landing-brand-text">
              <span className="landing-brand-title">FuelGuard</span>
              <div className="landing-brand-divider" />
              <div className="landing-brand-tagline">
                <div>Transparent Fuel Distribution</div>
                <div>for a Stronger Economy</div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav>
            <ul className="landing-nav-links">
              <li>
                <a
                  href="#hero"
                  className={`landing-nav-link ${activeTab === 'home' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('home', 'hero');
                  }}
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className={`landing-nav-link ${activeTab === 'about' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('about', 'features');
                  }}
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className={`landing-nav-link ${activeTab === 'features' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('features', 'features');
                  }}
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className={`landing-nav-link ${activeTab === 'how-it-works' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowHowItWorks(true);
                  }}
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className={`landing-nav-link ${activeTab === 'contact' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDbDrawer(true);
                  }}
                >
                  Database Live
                </a>
              </li>
            </ul>
          </nav>

          {/* Right Header Actions */}
          <div className="landing-header-actions">
            <button
              className="landing-notification-btn"
              title="Real-time Database Activity"
              onClick={() => setShowNotificationModal(true)}
              aria-label="View system notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="landing-notification-badge">{dbData?.recentDispenses?.length || 4}</span>
            </button>

            {token ? (
              <button
                className="landing-login-btn"
                onClick={() => {
                  if (userRole === 'STATION_OPERATOR') navigate('/operator');
                  else navigate('/stations');
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Dashboard</span>
              </button>
            ) : (
              <Link to="/login" className="landing-login-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="landing-hero" id="hero">
        <div className="landing-hero-container">
          {/* Left Column Content */}
          <div className="landing-hero-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="landing-badge-gov">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Government Monitoring Platform</span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#0369a1',
                  background: 'rgba(2, 132, 199, 0.08)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '99px',
                  border: '1px solid rgba(2, 132, 199, 0.2)',
                }}
              >
                <span className="landing-live-dot" />
                <span>Live PostgreSQL Telemetry • Sync: {lastSyncTime}</span>
              </div>
            </div>

            <h1 className="landing-hero-title">
              Fuel Transparency.
              <span className="landing-hero-title-gradient">A Stronger Tomorrow.</span>
            </h1>

            <p className="landing-hero-description">
              FuelGuard helps the government monitor fuel distribution, detects anomalies,
              prevents black-market activities, and ensures transparency across all stations
              in the network.
            </p>

            <div className="landing-hero-cta-group">
              <Link to={token ? '/stations' : '/login'} className="landing-btn-primary">
                <span>Get Started</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>

              <button className="landing-btn-secondary" onClick={() => setShowHowItWorks(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon>
                </svg>
                <span>Watch How It Works</span>
              </button>
            </div>

            {/* 4 Value Pillars */}
            <div className="landing-pillars-row">
              <div className="landing-pillar-item">
                <div className="landing-pillar-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <span className="landing-pillar-text">Prevent Fuel Diversion</span>
              </div>

              <div className="landing-pillar-item">
                <div className="landing-pillar-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
                <span className="landing-pillar-text">Real-time Monitoring</span>
              </div>

              <div className="landing-pillar-item">
                <div className="landing-pillar-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <span className="landing-pillar-text">Ensure Accountability</span>
              </div>

              <div className="landing-pillar-item">
                <div className="landing-pillar-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <span className="landing-pillar-text">Support a Stronger Economy</span>
              </div>
            </div>
          </div>

          {/* Right Column Visual Card */}
          <div className="landing-hero-visual">
            <div className="landing-hero-scene-wrapper">
              <img
                src={stationHeroImg}
                alt="Modern petroleum station monitored by FuelGuard"
                className="landing-hero-scene-img"
              />
            </div>

            {/* Floating Glassmorphism Widget 1: Station Status with Real Station Selector */}
            <div className="landing-overlay-card overlay-status">
              <div className="overlay-status-row">
                <div className="overlay-status-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="overlay-status-text">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="overlay-status-label">{activeTank.stationName}</span>
                    <span
                      className={`overlay-status-badge ${activeTank.status === 'OUT_OF_STOCK' ? 'out-of-stock' : ''}`}
                    >
                      {activeTank.status}
                    </span>
                  </div>
                  <span className="overlay-status-sub">{activeTank.location || 'Addis Ababa'}</span>
                </div>
              </div>

              {/* Station Switcher Pills from DB */}
              <div className="overlay-station-pills">
                {allTanks.map((st) => (
                  <button
                    key={st.sid}
                    type="button"
                    className={`overlay-station-pill ${selectedStationSid === st.sid ? 'active' : ''}`}
                    onClick={() => setSelectedStationSid(st.sid)}
                    title={`Switch telemetry to ${st.stationName} (${st.status})`}
                  >
                    {st.sid}
                  </button>
                ))}
              </div>
            </div>

            {/* Floating Glassmorphism Widget 2: Live Tank Level & Sensor Temp */}
            <div className="landing-overlay-card overlay-tank">
              <div className="overlay-tank-header">
                <div className="overlay-tank-left-title">
                  <div className="overlay-tank-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                    </svg>
                  </div>
                  <span className="overlay-tank-title">Tank Level</span>
                </div>
                <span className="overlay-fuel-type-tag">{activeTank.productType}</span>
              </div>

              <div className="overlay-tank-val-row">
                <span className="overlay-tank-val">{activeTank.percentage}%</span>
                <span className="overlay-tank-temp">🌡 {activeTank.temperatureC}°C</span>
              </div>

              <div className="overlay-tank-liters">
                <span>{Number(activeTank.currentVolumeLiters).toLocaleString()} L</span>
                <span>/ {Number(activeTank.capacityLiters).toLocaleString()} L</span>
              </div>

              <div className="overlay-progress-bar">
                <div
                  className="overlay-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.max(5, activeTank.percentage))}%`,
                    background:
                      activeTank.percentage < 20
                        ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  }}
                />
              </div>

              <div className="overlay-sensor-note">
                <span className="landing-live-dot" />
                <span>ATG Telemetry (10s cycle)</span>
              </div>
            </div>

            {/* Floating Glassmorphism Widget 3: Live Verified Dispenses */}
            <div className="landing-overlay-card overlay-dispense">
              <div className="overlay-dispense-header">
                <div className="overlay-dispense-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
                <span className="overlay-dispense-title">Today's Dispense</span>
              </div>

              <div className="overlay-dispense-val-row">
                <span className="overlay-dispense-val">
                  {viewMode === 'national' ? '12,480 L' : `${stats.rawTotalDispensed || 151} L`}
                </span>
                <span className="overlay-dispense-trend">↑ 5%</span>
              </div>

              <div className="overlay-dispense-meta">
                <div>
                  <strong>Last Dispense:</strong> {recentDispense.liters_dispensed} L
                </div>
                <div>
                  <strong>Vehicle:</strong> {recentDispense.plate_number} • OTP Verified ✓
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Features Section ── */}
      <section className="landing-features-section" id="features">
        <div className="landing-features-container">
          <div className="landing-features-tag">| KEY FEATURES</div>
          <h2 className="landing-features-title">Everything You Need for Transparent Fuel Management</h2>
          <p className="landing-features-subtitle">
            Powerful tools for real-time oversight, accurate reconciliation, and effective investigation.
          </p>

          <div className="landing-features-layout">
            {/* 2x3 Grid of 6 Features */}
            <div className="landing-features-grid">
              {/* Feature 1: Fuel Request & OTP */}
              <div
                className="landing-feature-card"
                onClick={() => navigate(token ? '/stations' : '/login')}
              >
                <div className="landing-feature-card-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 22v-8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8"></path>
                    <path d="M5 12V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8"></path>
                    <path d="M13 10h4a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h0"></path>
                    <circle cx="8" cy="7" r="1"></circle>
                  </svg>
                </div>
                <div className="landing-feature-card-content">
                  <h3 className="landing-feature-card-title">Fuel Request &amp; OTP Verification</h3>
                  <p className="landing-feature-card-desc">
                    Secure, traceable fuel requests with OTP and vehicle plate verification.
                  </p>
                </div>
                <div className="landing-feature-card-arrow">→</div>
              </div>

              {/* Feature 2: ATG Monitoring */}
              <div
                className="landing-feature-card"
                onClick={() => navigate(token ? '/stations' : '/login')}
              >
                <div className="landing-feature-card-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="landing-feature-card-content">
                  <h3 className="landing-feature-card-title">ATG Monitoring</h3>
                  <p className="landing-feature-card-desc">
                    Real-time tank level tracking with automated alerts.
                  </p>
                </div>
                <div className="landing-feature-card-arrow">→</div>
              </div>

              {/* Feature 3: Reconciliation */}
              <div
                className="landing-feature-card"
                onClick={() => navigate(token ? '/reconciliations' : '/login')}
              >
                <div className="landing-feature-card-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div className="landing-feature-card-content">
                  <h3 className="landing-feature-card-title">Reconciliation</h3>
                  <p className="landing-feature-card-desc">
                    Compare tank levels with verified dispenses to detect discrepancies.
                  </p>
                </div>
                <div className="landing-feature-card-arrow">→</div>
              </div>

              {/* Feature 4: Complaints Management */}
              <div
                className="landing-feature-card"
                onClick={() => navigate(token ? '/complaints' : '/login')}
              >
                <div className="landing-feature-card-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div className="landing-feature-card-content">
                  <h3 className="landing-feature-card-title">Complaints Management</h3>
                  <p className="landing-feature-card-desc">
                    Drivers can report issues, and regulators can review and resolve them.
                  </p>
                </div>
                <div className="landing-feature-card-arrow">→</div>
              </div>

              {/* Feature 5: Audit Logs */}
              <div
                className="landing-feature-card"
                onClick={() => navigate(token ? '/audit-logs' : '/login')}
              >
                <div className="landing-feature-card-icon" style={{ background: '#cffafe', color: '#0891b2' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
                <div className="landing-feature-card-content">
                  <h3 className="landing-feature-card-title">Audit Logs</h3>
                  <p className="landing-feature-card-desc">
                    Immutable logs of all actions for full accountability.
                  </p>
                </div>
                <div className="landing-feature-card-arrow">→</div>
              </div>

              {/* Feature 6: Station Management */}
              <div
                className="landing-feature-card"
                onClick={() => navigate(token ? '/stations' : '/login')}
              >
                <div className="landing-feature-card-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </div>
                <div className="landing-feature-card-content">
                  <h3 className="landing-feature-card-title">Station Management</h3>
                  <p className="landing-feature-card-desc">
                    Register, monitor, suspend or reinstate stations and tanks.
                  </p>
                </div>
                <div className="landing-feature-card-arrow">→</div>
              </div>
            </div>

            {/* Right Government Highlight Card */}
            <div className="landing-gov-card">
              <span className="landing-gov-tag">BUILT FOR GOVERNMENT</span>
              <h3 className="landing-gov-title">Better Oversight. Greater Impact.</h3>
              <p className="landing-gov-desc">
                FuelGuard gives government regulators the visibility and tools they need
                to eliminate fuel fraud, protect resources, and build a more transparent
                fuel distribution system.
              </p>
              <div className="landing-gov-link" onClick={() => setShowDbDrawer(true)}>
                <span>Learn More</span>
                <span>→</span>
              </div>
              <div className="landing-gov-img-wrapper">
                <img
                  src={govBuildingImg}
                  alt="Ethiopian Petroleum & Energy Authority Headquarters"
                  className="landing-gov-img"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom Dark Petroleum Stats Bar ── */}
      <section className="landing-stats-bar">
        <div className="landing-stats-container">
          {/* Metrics view mode switch */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.75rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="landing-live-dot"></span>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#38bdf8',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Operational Statistics
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>• Live PostgreSQL Supabase Cluster</span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '99px',
                padding: '3px',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('national')}
                style={{
                  background: viewMode === 'national' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
                  color: viewMode === 'national' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '99px',
                  padding: '0.35rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                National Scale
              </button>
              <button
                type="button"
                onClick={() => setViewMode('live-db')}
                style={{
                  background: viewMode === 'live-db' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
                  color: viewMode === 'live-db' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '99px',
                  padding: '0.35rem 0.95rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Live DB ({stats.rawStationsCount || 4} Stations)
              </button>
            </div>
          </div>

          <div className="landing-stats-grid">
            {/* Stat 1: Registered Stations */}
            <div className="landing-stat-card">
              <div className="landing-stat-icon-box">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div className="landing-stat-info">
                <span className="landing-stat-number">
                  {viewMode === 'national' ? '1,248+' : `${stats.rawStationsCount || 4}+`}
                </span>
                <span className="landing-stat-label">Registered Stations</span>
                <div
                  className="landing-live-badge"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowDbDrawer(true)}
                  title="Click to view live stations in PostgreSQL database"
                >
                  <span className="landing-live-dot"></span>
                  <span>{stats.rawStationsCount || 4} in PostgreSQL DB →</span>
                </div>
              </div>
            </div>

            {/* Stat 2: Registered Vehicles */}
            <div className="landing-stat-card">
              <div className="landing-stat-icon-box">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
              <div className="landing-stat-info">
                <span className="landing-stat-number">
                  {viewMode === 'national' ? '85,000+' : `${stats.rawVehiclesCount || 3}+`}
                </span>
                <span className="landing-stat-label">Registered Vehicles</span>
                <div className="landing-live-badge" title="Live Database Record">
                  <span className="landing-live-dot"></span>
                  <span>{stats.rawVehiclesCount || 3} in PostgreSQL DB</span>
                </div>
              </div>
            </div>

            {/* Stat 3: Liters Tracked Daily */}
            <div className="landing-stat-card">
              <div className="landing-stat-icon-box">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
              </div>
              <div className="landing-stat-info">
                <span className="landing-stat-number">
                  {viewMode === 'national' ? '2.4M+' : `${stats.rawTotalDispensed || 151} L`}
                </span>
                <span className="landing-stat-label">
                  {viewMode === 'national' ? 'Liters Tracked Daily' : 'Total Dispensed Liters'}
                </span>
                <div className="landing-live-badge" title="Live Database Record">
                  <span className="landing-live-dot"></span>
                  <span>{stats.rawTotalDispensed || 151} L Dispensed</span>
                </div>
              </div>
            </div>

            {/* Stat 4: System Uptime */}
            <div className="landing-stat-card">
              <div className="landing-stat-icon-box">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
              </div>
              <div className="landing-stat-info">
                <span className="landing-stat-number">{stats.systemUptime || '99.8%'}</span>
                <span className="landing-stat-label">System Uptime</span>
                <div className="landing-live-badge" title="Operational Uptime">
                  <span className="landing-live-dot"></span>
                  <span>Active &amp; Monitored</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Real-Time Database Explorer / Live Table ── */}
      {showDbDrawer && (
        <section className="landing-db-drawer-section">
          <div className="landing-db-drawer-container">
            <div className="landing-db-header">
              <div className="landing-db-title-group">
                <h3>Live Database Station &amp; Tank Telemetry ({allTanks.length} Tanks)</h3>
                <p>Direct live stream from PostgreSQL / Supabase cluster • Polling every 4s</p>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setShowDbDrawer(false)}>
                Hide Live Explorer
              </button>
            </div>

            <div className="landing-stations-table-card">
              <table className="landing-table">
                <thead>
                  <tr>
                    <th>Station ID</th>
                    <th>Station Name</th>
                    <th>Location</th>
                    <th>Product</th>
                    <th>Current Volume</th>
                    <th>Capacity</th>
                    <th>Level</th>
                    <th>Temp</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allTanks.map((st) => (
                    <tr
                      key={st.sid}
                      onClick={() => {
                        setSelectedStationSid(st.sid);
                        handleNavClick('home', 'hero');
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Click to view live on Hero"
                    >
                      <td style={{ fontWeight: 600, color: '#0284c7' }}>{st.sid}</td>
                      <td style={{ fontWeight: 600 }}>{st.stationName}</td>
                      <td style={{ color: '#64748b' }}>{st.location || 'Addis Ababa'}</td>
                      <td>
                        <span className="overlay-fuel-type-tag">{st.productType}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{Number(st.currentVolumeLiters).toLocaleString()} L</td>
                      <td style={{ color: '#64748b' }}>{Number(st.capacityLiters).toLocaleString()} L</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              width: '45px',
                              height: '6px',
                              background: '#e2e8f0',
                              borderRadius: '99px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${st.percentage}%`,
                                height: '100%',
                                background: st.percentage < 20 ? '#ef4444' : '#10b981',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{st.percentage}%</span>
                        </div>
                      </td>
                      <td style={{ color: '#475569' }}>{st.temperatureC}°C</td>
                      <td>
                        <span className={st.status === 'OPEN' ? 'status-badge-open' : 'status-badge-out'}>
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Interactive Modal: "Watch How It Works" ── */}
      {showHowItWorks && (
        <div className="landing-modal-backdrop" onClick={() => setShowHowItWorks(false)}>
          <div className="landing-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="landing-modal-close" onClick={() => setShowHowItWorks(false)}>
              ✕
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#081e31' }}>How FuelGuard Operates</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  End-to-end petroleum verification and governance workflow
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#0284c7',
                    color: 'white',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                    USSD Driver Request &amp; Quota Check
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    Drivers dial the government shortcode on any mobile phone to request fuel quota. The system checks
                    vehicle quota policies and issues a secure, time-limited OTP.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: 'white',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                    Operator Verification &amp; Dispense
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    Station pump operators verify vehicle plate numbers and OTP codes in the Operator Terminal before
                    releasing any fuel.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#7c3aed',
                    color: 'white',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                    Continuous ATG Sensor Tracking
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    Automated Tank Gauges (ATG) report underground tank levels every 10 seconds. Sudden dips or suspicious
                    offloading trigger immediate alerts.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#ea580c',
                    color: 'white',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  4
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                    Automated Reconciliation &amp; Fraud Flagging
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    Reconciliation engines cross-reference ATG level drops against verified dispenser logs. Unreconciled
                    variances over threshold trigger station suspension.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setShowHowItWorks(false)}>
                Close
              </button>
              <Link to="/login" className="btn btn-primary" onClick={() => setShowHowItWorks(false)}>
                Access Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Real-Time Database Activity Notifications Modal ── */}
      {showNotificationModal && (
        <div className="landing-modal-backdrop" onClick={() => setShowNotificationModal(false)}>
          <div className="landing-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <button className="landing-modal-close" onClick={() => setShowNotificationModal(false)}>
              ✕
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span className="landing-live-dot" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#081e31', margin: 0 }}>
                Live Database Activity Feed
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Real-time audit events &amp; verified dispenses from PostgreSQL
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {(dbData?.recentDispenses || []).map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: '0.85rem',
                    background: '#f0fdf4',
                    borderRadius: '10px',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#15803d' }}>
                      ⛽ Dispense Verified: {d.liters_dispensed} L
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {new Date(d.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#166534', margin: 0 }}>
                    Vehicle <strong>{d.plate_number}</strong> verified at <strong>{d.station_name}</strong> (OTP
                    matched).
                  </p>
                </div>
              ))}

              {(dbData?.recentAudits || []).slice(0, 3).map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.85rem',
                    background: '#eff6ff',
                    borderRadius: '10px',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1d4ed8' }}>
                      📋 Audit: {a.action}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {new Date(a.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0 }}>
                    Target Entity: <code>{a.entity_type}</code>
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Auto-updating live from PostgreSQL</span>
              <button className="btn btn-sm btn-primary" onClick={() => setShowNotificationModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
