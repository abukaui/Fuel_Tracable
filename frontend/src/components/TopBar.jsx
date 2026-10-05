import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export default function TopBar() {
  const [user, setUser] = useState({ name: '', role: '' });

  useEffect(() => {
    apiClient('/api/auth/me')
      .then(data => {
        if (data.user) {
          setUser({ name: data.user.full_name, role: data.user.role });
        }
      })
      .catch(() => {});
  }, []);

  const roleLabel = {
    GOV_REGULATOR: 'Gov Regulator',
    ADMIN: 'Admin',
    STATION_OPERATOR: 'Station Operator',
    DRIVER: 'Driver',
  }[user.role] || user.role;

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="topbar">
      <span className="topbar-bell">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </span>
      <div className="topbar-user">
        <div className="topbar-avatar">{initials}</div>
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{user.name || roleLabel}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
          {roleLabel}
        </span>
      </div>
    </header>
  );
}
