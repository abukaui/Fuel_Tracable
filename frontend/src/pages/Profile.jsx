import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

export default function Profile() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Personal Info form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoFieldErrors, setInfoFieldErrors] = useState({});

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await apiClient('/api/v1/me');
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
    } catch (err) {
      setFetchError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ── Handle Personal Info Update ───────────────────────────────────────────
  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setInfoError('');
    setInfoFieldErrors({});

    const fieldErrs = {};
    if (!fullName.trim()) fieldErrs.fullName = 'Full name cannot be empty.';
    if (!phone.trim()) fieldErrs.phone = 'Phone number is required.';
    else if (phone.trim().length < 7) fieldErrs.phone = 'Phone number must be at least 7 characters.';

    if (Object.keys(fieldErrs).length > 0) {
      setInfoFieldErrors(fieldErrs);
      return;
    }

    setInfoSaving(true);
    try {
      const updated = await apiClient('/api/v1/me', {
        method: 'PATCH',
        body: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      });
      setProfile(prev => ({ ...prev, ...updated }));
      addToast('Personal information updated successfully.', 'success');
    } catch (err) {
      setInfoError(err.message || 'Failed to update personal information.');
    } finally {
      setInfoSaving(false);
    }
  };

  // ── Handle Password Change ────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordFieldErrors({});

    const fieldErrs = {};
    if (!currentPassword) fieldErrs.currentPassword = 'Enter your current password.';
    if (!newPassword) fieldErrs.newPassword = 'Enter a new password.';
    else if (newPassword.length < 10) fieldErrs.newPassword = 'New password must be at least 10 characters long.';
    else if (newPassword === currentPassword) fieldErrs.newPassword = 'New password must be different from current password.';

    // Confirm password is validated strictly on client side; never sent to server
    if (confirmPassword !== newPassword) {
      fieldErrs.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(fieldErrs).length > 0) {
      setPasswordFieldErrors(fieldErrs);
      return;
    }

    setPasswordSaving(true);
    // Keep local copies for API request and immediately wipe component state
    const payloadCurrent = currentPassword;
    const payloadNew = newPassword;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    try {
      const res = await apiClient('/api/v1/me/change-password', {
        method: 'POST',
        body: {
          currentPassword: payloadCurrent,
          newPassword: payloadNew,
        },
      });

      // Update session token so active session continues seamlessly with the new token_version
      if (res.token) {
        localStorage.setItem('token', res.token);
      }

      setProfile(prev => ({ ...prev, must_change_password: false }));
      const msg = res.message || 'Password changed successfully. All other active sessions have been invalidated.';
      setPasswordSuccess(msg);
      addToast(msg, 'success', 5000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
      addToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const isInfoModified = profile && (
    fullName.trim() !== (profile.full_name || '') ||
    phone.trim() !== (profile.phone || '')
  );

  if (loading) {
    return (
      <div className="table-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton-box" style={{ width: '35%', height: '2rem' }} />
          <div className="skeleton-box" style={{ width: '55%', height: '1.25rem' }} />
          <div style={{ height: '1.5rem' }} />
          <div className="skeleton-box" style={{ width: '100%', height: '14rem' }} />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="alert alert-error" style={{ margin: '2rem 0' }}>
        <span>{fetchError}</span>
        <div style={{ marginTop: '0.75rem' }}>
          <button className="btn btn-outline btn-sm" onClick={fetchProfile}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your government regulatory credentials and personal contact details.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <StatusBadge status={profile?.role || 'REGULATOR'} />
        </div>
      </div>

      {/* Forced Password Change Notice */}
      {profile?.must_change_password && (
        <div
          className="alert alert-error"
          style={{
            marginBottom: '1.75rem',
            borderLeft: '4px solid var(--red)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
            ⚠ Action Required: Temporary Password Detected
          </div>
          <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
            An administrator created your account with a temporary password. You must set a new permanent password below before accessing monitoring stations, audit logs, or reconciliation data.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* SECTION 1: Personal Information */}
        <div className="card">
          <div className="card-title" style={{ fontSize: '1.0625rem', marginBottom: '0.25rem' }}>
            Personal Information
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Update your public government contact details. Sensitive jurisdictional assignments are read-only.
          </p>

          {infoError && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {infoError}
            </div>
          )}

          <form onSubmit={handleUpdateInfo}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Full Name <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Abebe Bikila"
                disabled={infoSaving}
                required
              />
              {infoFieldErrors.fullName && (
                <div style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {infoFieldErrors.fullName}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Phone Number <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +251911223344"
                disabled={infoSaving}
                required
              />
              {infoFieldErrors.phone && (
                <div style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {infoFieldErrors.phone}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Official Email Address
              </label>
              <input
                type="email"
                className="form-input"
                value={profile?.email || 'unassigned@energy.gov.et'}
                disabled
                style={{ background: '#f8fafc', color: 'var(--text-muted)', cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)', marginTop: '0.2rem', display: 'block' }}>
                Managed by system administrator (immutable).
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Assigned Office / Regulatory Region
              </label>
              <input
                type="text"
                className="form-input"
                value={profile?.office || 'Federal Energy Authority — Headquarters'}
                disabled
                style={{ background: '#f8fafc', color: 'var(--text-muted)', cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)', marginTop: '0.2rem', display: 'block' }}>
                Assigned regulatory jurisdiction.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Login</span>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text)', marginTop: '0.15rem' }}>
                  {profile?.last_login_at ? formatRelativeTime(profile.last_login_at) : 'First Session'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Member Since</span>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text)', marginTop: '0.15rem' }}>
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={infoSaving || !isInfoModified}
              >
                {infoSaving ? 'Saving Changes…' : 'Save Personal Information'}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: Change Password */}
        <div className="card">
          <div className="card-title" style={{ fontSize: '1.0625rem', marginBottom: '0.25rem' }}>
            Change Password
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Set a new secure password. Changing your password immediately invalidates all other active sessions across devices.
          </p>

          {passwordSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600 }}>✓ Password Updated</div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.2rem' }}>{passwordSuccess}</div>
              {profile && !profile.must_change_password && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate('/stations')}
                  >
                    Go to Stations Dashboard →
                  </button>
                </div>
              )}
            </div>
          )}

          {passwordError && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Current Password <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                type="password"
                className="form-input"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={passwordSaving}
                autoComplete="current-password"
                required
              />
              {passwordFieldErrors.currentPassword && (
                <div style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {passwordFieldErrors.currentPassword}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                New Password <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 10 characters..."
                disabled={passwordSaving}
                autoComplete="new-password"
                required
              />
              {passwordFieldErrors.newPassword && (
                <div style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {passwordFieldErrors.newPassword}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Confirm New Password <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password..."
                disabled={passwordSaving}
                autoComplete="new-password"
                required
              />
              {passwordFieldErrors.confirmPassword && (
                <div style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {passwordFieldErrors.confirmPassword}
                </div>
              )}
            </div>

            {/* Password security criteria */}
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '1.25rem', fontSize: '0.75rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Password Security Checklist:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-light)', lineHeight: 1.6 }}>
                <li style={{ color: newPassword.length >= 10 ? 'var(--green)' : undefined }}>
                  {newPassword.length >= 10 ? '✓' : '•'} Minimum 10 characters in length
                </li>
                <li style={{ color: newPassword && newPassword !== currentPassword ? 'var(--green)' : undefined }}>
                  {newPassword && newPassword !== currentPassword ? '✓' : '•'} Different from your current password
                </li>
                <li style={{ color: confirmPassword && confirmPassword === newPassword ? 'var(--green)' : undefined }}>
                  {confirmPassword && confirmPassword === newPassword ? '✓' : '•'} Confirmation password matches
                </li>
                <li>
                  • Avoid common weak passwords (dictionary terms, sequential digits)
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordSaving ? 'Updating Password…' : 'Update Password & Revoke Sessions'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
