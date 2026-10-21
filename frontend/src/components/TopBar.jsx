import React from 'react';

export default function TopBar({ userName, role }) {
  const roleLabel = {
    GOV_REGULATOR: 'Gov Regulator',
    ADMIN: 'Administrator',
    STATION_OPERATOR: 'Station Operator',
    DRIVER: 'Driver',
  }[role] || role;

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FG';

  return (
    <header className="topbar">
      <div style={{ flex: 1 }} />
      <div className="topbar-user">
        <div className="topbar-avatar">{initials}</div>
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{userName || roleLabel}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
          {roleLabel}
        </span>
      </div>
    </header>
  );
}
