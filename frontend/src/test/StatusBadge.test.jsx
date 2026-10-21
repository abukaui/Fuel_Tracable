import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge component', () => {
  it('renders green badge for OPEN and OK', () => {
    const { container: c1 } = render(<StatusBadge status="OPEN" />);
    expect(c1.firstChild).toHaveClass('badge-green');
    expect(screen.getByText('OPEN')).toBeInTheDocument();

    const { container: c2 } = render(<StatusBadge status="OK" />);
    expect(c2.firstChild).toHaveClass('badge-green');
  });

  it('renders orange badge for FLAGGED and OUT_OF_STOCK', () => {
    const { container: c1 } = render(<StatusBadge status="FLAGGED" />);
    expect(c1.firstChild).toHaveClass('badge-orange');

    const { container: c2 } = render(<StatusBadge status="OUT_OF_STOCK" />);
    expect(c2.firstChild).toHaveClass('badge-orange');
  });

  it('renders red badge for SUSPENDED', () => {
    const { container } = render(<StatusBadge status="SUSPENDED" />);
    expect(container.firstChild).toHaveClass('badge-red');
  });

  it('renders red badge for isStockOut', () => {
    const { container } = render(<StatusBadge isStockOut={true} />);
    expect(container.firstChild).toHaveClass('badge-red');
    expect(screen.getByText(/FALSE STOCK-OUT/)).toBeInTheDocument();
  });
});
