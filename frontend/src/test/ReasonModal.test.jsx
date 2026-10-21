import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReasonModal from '../components/Modal';

describe('ReasonModal component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ReasonModal isOpen={false} title="Test Modal" onConfirm={() => {}} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('disables confirm button until reason text is entered', () => {
    const handleConfirm = vi.fn();
    render(
      <ReasonModal
        isOpen={true}
        title="Suspend Station"
        confirmText="Confirm Suspension"
        onConfirm={handleConfirm}
        onClose={() => {}}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /confirm suspension/i });
    expect(submitBtn).toBeDisabled();

    const input = screen.getByPlaceholderText(/enter reason/i);
    fireEvent.change(input, { target: { value: 'Repeated stock-out anomaly' } });

    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);
    expect(handleConfirm).toHaveBeenCalledWith('Repeated stock-out anomaly');
  });
});
