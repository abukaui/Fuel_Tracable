import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../pages/Profile';
import { ToastProvider } from '../context/ToastContext';

// Mock apiClient
vi.mock('../api/client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '../api/client';

describe('Profile component', () => {
  const mockProfile = {
    id: 'user-123-uuid',
    full_name: 'Abebe Rega',
    phone: '+251911223344',
    email: 'abebe@energy.gov.et',
    office: 'Federal Energy Authority',
    role: 'GOV_REGULATOR',
    last_login_at: '2026-10-21T12:00:00Z',
    created_at: '2026-01-01T12:00:00Z',
    must_change_password: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders profile personal information and password sections after loading', async () => {
    apiClient.mockResolvedValueOnce(mockProfile);

    render(
      <MemoryRouter>
        <ToastProvider>
          <Profile />
        </ToastProvider>
      </MemoryRouter>
    );

    // Shows personal info fields
    await waitFor(() => {
      expect(screen.getByDisplayValue('Abebe Rega')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+251911223344')).toBeInTheDocument();
      expect(screen.getByDisplayValue('abebe@energy.gov.et')).toBeInTheDocument();
    });

    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('validates client-side that confirm password matches new password', async () => {
    apiClient.mockResolvedValueOnce(mockProfile);

    render(
      <MemoryRouter>
        <ToastProvider>
          <Profile />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Abebe Rega')).toBeInTheDocument();
    });

    const currentInput = screen.getByPlaceholderText('••••••••••••');
    const newInput = screen.getByPlaceholderText(/at least 10 characters/i);
    const confirmInput = screen.getByPlaceholderText(/re-enter new password/i);
    const submitBtn = screen.getByRole('button', { name: /update password/i });

    fireEvent.change(currentInput, { target: { value: 'CurrentPass123!' } });
    fireEvent.change(newInput, { target: { value: 'BrandNewPassword456!' } });
    fireEvent.change(confirmInput, { target: { value: 'MismatchPassword789!' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });

    // apiClient was NOT called for change-password because client validation stopped it
    expect(apiClient).toHaveBeenCalledTimes(1); // only the initial getProfile
  });

  it('submits change-password with only currentPassword and newPassword, wiping inputs', async () => {
    apiClient
      .mockResolvedValueOnce(mockProfile) // GET /api/v1/me
      .mockResolvedValueOnce({ message: 'Password changed successfully.', token: 'new-token' }); // POST change-password

    render(
      <MemoryRouter>
        <ToastProvider>
          <Profile />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Abebe Rega')).toBeInTheDocument();
    });

    const currentInput = screen.getByPlaceholderText('••••••••••••');
    const newInput = screen.getByPlaceholderText(/at least 10 characters/i);
    const confirmInput = screen.getByPlaceholderText(/re-enter new password/i);
    const submitBtn = screen.getByRole('button', { name: /update password/i });

    fireEvent.change(currentInput, { target: { value: 'CurrentPass123!' } });
    fireEvent.change(newInput, { target: { value: 'BrandNewPassword456!' } });
    fireEvent.change(confirmInput, { target: { value: 'BrandNewPassword456!' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith('/api/v1/me/change-password', {
        method: 'POST',
        body: {
          currentPassword: 'CurrentPass123!',
          newPassword: 'BrandNewPassword456!',
        },
      });
    });

    // Inputs are immediately wiped from state
    expect(currentInput.value).toBe('');
    expect(newInput.value).toBe('');
    expect(confirmInput.value).toBe('');
  });
});
