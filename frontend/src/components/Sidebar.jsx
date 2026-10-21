import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import logo from '../assets/logo.png';

const icons = {
  dashboard: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  stations: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  reconciliations: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  complaints: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  auditLogs: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  operator: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  profile: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  logout: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  bell: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
};

export default function Sidebar({ role, userName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const dashboardLabel = role === 'STATION_OPERATOR' ? 'Fuel Distribution System' : 'Government Dashboard';

  // Check if current path starts with a given prefix for sub-page highlighting
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isStationsActive = location.pathname.startsWith('/stations') || location.pathname.startsWith('/reconciliations');

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="Petroleum and Energy Authority Logo" className="sidebar-logo-img" />
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">FuelGuard</div>
          <div className="sidebar-logo-sub">{dashboardLabel}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {role === 'STATION_OPERATOR' ? (
          <>
            <NavLink to="/operator" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {icons.operator} Operator Dashboard
            </NavLink>
          </>
        ) : (
          <>
            <div className="sidebar-section-label">Overview</div>
            <NavLink to="/stations" end className={() => `nav-item${isStationsActive ? ' active' : ''}`}>
              {icons.stations} Stations
            </NavLink>
            <div className="sidebar-section-label">Monitoring</div>
            <NavLink to="/reconciliations" end className={({ isActive }) => `nav-item${isActive || location.pathname.startsWith('/reconciliations/') ? ' active' : ''}`}>
              {icons.reconciliations} Reconciliations
            </NavLink>
            <NavLink to="/complaints" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {icons.complaints} Complaints
            </NavLink>
            <NavLink to="/audit-logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {icons.auditLogs} Audit Logs
            </NavLink>
          </>
        )}

        <div style={{ flex: 1 }} />
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-item" style={{ color: '#94a3b8' }}>
          {icons.profile}
          <span style={{ flex: 1 }}>{userName || 'Profile'}</span>
        </button>
        <button className="nav-item" onClick={handleLogout} style={{ color: '#94a3b8' }}>
          {icons.logout}
          <span style={{ flex: 1 }}>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export function TopBar({ userName, role }) {
  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const roleLabel = {
    GOV_REGULATOR: 'Gov Regulator',
    ADMIN: 'Admin',
    STATION_OPERATOR: 'Station Operator',
    DRIVER: 'Driver',
  }[role] || role;

  return (
    <header className="topbar">
      <span className="topbar-bell">{icons.bell}</span>
      <div className="topbar-user">
        <div className="topbar-avatar">{initials}</div>
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{roleLabel}</span>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </header>
  );
}
