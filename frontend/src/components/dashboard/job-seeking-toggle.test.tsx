import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobSeekingToggle } from './job-seeking-toggle';

describe('JobSeekingToggle', () => {
  it('renders inactive state by default', () => {
    render(<JobSeekingToggle />);
    expect(screen.getByText(/inactive/i)).toBeInTheDocument();
  });

  it('renders active state when initialActive is true', () => {
    render(<JobSeekingToggle initialActive={true} />);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText(/ai is matching/i)).toBeInTheDocument();
  });

  it('shows confirmation dialog when activating (OFF → ON)', async () => {
    const user = userEvent.setup();
    render(<JobSeekingToggle />);

    // Click the toggle button
    await user.click(screen.getByRole('button'));

    // Confirmation dialog should appear
    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('activates after confirming', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<JobSeekingToggle onToggle={onToggle} />);

    // Click toggle, then confirm
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Activate'));

    expect(onToggle).toHaveBeenCalledWith(true);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('cancels activation dialog', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<JobSeekingToggle onToggle={onToggle} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Cancel'));

    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.queryByText('Activate')).not.toBeInTheDocument();
  });

  it('deactivates immediately without confirmation (ON → OFF)', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<JobSeekingToggle initialActive={true} onToggle={onToggle} />);

    await user.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledWith(false);
    expect(screen.getByText(/inactive/i)).toBeInTheDocument();
  });
});
