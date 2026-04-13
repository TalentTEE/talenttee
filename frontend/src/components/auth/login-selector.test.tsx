import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginSelector } from './login-selector';

// Track router.push calls
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock auth
const mockLogin = vi.fn();
const mockLoginWithNear = vi.fn();
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithNear: mockLoginWithNear,
    user: null,
    logout: vi.fn(),
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// USE_DUMMY is evaluated at module level (import time) and will be false in tests.
// So the component takes the loginWithNear path with hardcoded near accounts.
describe('LoginSelector', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockLogin.mockClear();
    mockLoginWithNear.mockClear();
    mockLogin.mockResolvedValue(undefined);
    mockLoginWithNear.mockResolvedValue(undefined);
  });

  it('renders Seeker and Employer cards', () => {
    render(<LoginSelector />);
    expect(screen.getByText('Alice Kim')).toBeInTheDocument();
    expect(screen.getByText('Bob Park')).toBeInTheDocument();
    expect(screen.getByText('Login as Seeker')).toBeInTheDocument();
    expect(screen.getByText('Login as Employer')).toBeInTheDocument();
  });

  it('calls loginWithNear and navigates to seeker dashboard on SEEKER card click', async () => {
    const user = userEvent.setup();
    render(<LoginSelector />);

    await user.click(screen.getByText('Login as Seeker'));

    await waitFor(() => {
      expect(mockLoginWithNear).toHaveBeenCalledWith('alice.testnet', 'SEEKER');
      expect(mockPush).toHaveBeenCalledWith('/dashboard/seeker');
    });
  });

  it('calls loginWithNear and navigates to employer dashboard on EMPLOYER card click', async () => {
    const user = userEvent.setup();
    render(<LoginSelector />);

    await user.click(screen.getByText('Login as Employer'));

    await waitFor(() => {
      expect(mockLoginWithNear).toHaveBeenCalledWith('bob.testnet', 'EMPLOYER');
      expect(mockPush).toHaveBeenCalledWith('/dashboard/employer');
    });
  });

  it('displays error message on login failure', async () => {
    mockLoginWithNear.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    render(<LoginSelector />);

    await user.click(screen.getByText('Login as Seeker'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows loading state while authenticating', async () => {
    mockLoginWithNear.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(<LoginSelector />);

    await user.click(screen.getByText('Login as Seeker'));

    await waitFor(() => {
      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
    });
  });
});
