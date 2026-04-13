import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './auth';

// Mock wallet-selector
const mockSignMessage = vi.fn();
const mockWalletFn = vi.fn().mockResolvedValue({ signMessage: mockSignMessage });
vi.mock('./wallet-selector', () => ({
  useWallet: () => ({
    selector: { wallet: mockWalletFn },
    modal: null,
    signedAccountId: null,
    signOut: vi.fn(),
  }),
}));

// Mock api module
vi.mock('./api', () => ({
  getDummyUser: vi.fn(),
  requestChallenge: vi.fn(),
  verifyNearAuth: vi.fn(),
}));

const { getDummyUser, requestChallenge, verifyNearAuth } = await import('./api');
const mockGetDummyUser = vi.mocked(getDummyUser);
const mockRequestChallenge = vi.mocked(requestChallenge);
const mockVerifyNearAuth = vi.mocked(verifyNearAuth);

// Helper component that exposes auth context
function AuthConsumer() {
  const { user, login, loginWithNear, logout, isLoading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? JSON.stringify(user) : 'null'}</span>
      <button data-testid="login-seeker" onClick={() => login('SEEKER')}>Login Seeker</button>
      <button data-testid="login-near" onClick={() => loginWithNear('test.testnet', 'SEEKER')}>Login NEAR</button>
      <button data-testid="logout" onClick={logout}>Logout</button>
    </div>
  );
}

// Build a fake JWT with an exp far in the future (for session-restore tests)
function fakeJwt(exp = Math.floor(Date.now() / 1000) + 86400) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'user-1', exp }));
  return `${header}.${payload}.sig`;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_USE_DUMMY', 'true');
  });

  it('starts with isLoading true then transitions to false', async () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>);
    // After mount effect runs, isLoading should be false
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('restores user from localStorage on mount when JWT is valid', async () => {
    const storedUser = { id: 'user-1', nearAccountId: 'alice.testnet', role: 'SEEKER', publicKey: 'ed25519:test', createdAt: '2026-01-01' };
    localStorage.setItem('user', JSON.stringify(storedUser));
    localStorage.setItem('jwt', fakeJwt());

    render(<AuthProvider><AuthConsumer /></AuthProvider>);

    await waitFor(() => {
      const userText = screen.getByTestId('user').textContent!;
      expect(JSON.parse(userText).id).toBe('user-1');
    });
  });

  it('clears stale session if JWT is expired on mount', async () => {
    const storedUser = { id: 'user-1', nearAccountId: 'alice.testnet', role: 'SEEKER', publicKey: 'ed25519:test', createdAt: '2026-01-01' };
    localStorage.setItem('user', JSON.stringify(storedUser));
    localStorage.setItem('jwt', fakeJwt(Math.floor(Date.now() / 1000) - 3600)); // expired 1h ago

    render(<AuthProvider><AuthConsumer /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('jwt')).toBeNull();
    });
  });

  it('login() stores dummy user in localStorage', async () => {
    const dummyUser = { id: 'user-1', nearAccountId: 'alice.testnet', role: 'SEEKER' as const, publicKey: 'ed25519:key', createdAt: '2026-01-01' };
    mockGetDummyUser.mockResolvedValue(dummyUser);

    render(<AuthProvider><AuthConsumer /></AuthProvider>);

    await act(async () => {
      screen.getByTestId('login-seeker').click();
    });

    await waitFor(() => {
      expect(localStorage.getItem('user')).toBeTruthy();
      expect(localStorage.getItem('jwt')).toBe('dummy-jwt-token');
      expect(JSON.parse(localStorage.getItem('user')!).id).toBe('user-1');
    });
  });

  it('loginWithNear() calls requestChallenge, signMessage, and verifyNearAuth', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_DUMMY', 'false');
    mockRequestChallenge.mockResolvedValue({ nonce: 'test-nonce', expiresAt: '2026-12-31' });
    mockSignMessage.mockResolvedValue({ signature: 'c2lnbmVk', publicKey: 'ed25519:pk' });
    const apiUser = { id: 'u-near', nearAccountId: 'test.testnet', role: 'SEEKER' as const, publicKey: 'ed25519:pk', createdAt: '2026-01-01' };
    mockVerifyNearAuth.mockResolvedValue({ jwt: 'real-jwt', user: apiUser });

    render(<AuthProvider><AuthConsumer /></AuthProvider>);

    await act(async () => {
      screen.getByTestId('login-near').click();
    });

    await waitFor(() => {
      expect(mockRequestChallenge).toHaveBeenCalled();
      expect(mockSignMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: 'test-nonce',
        recipient: 'talent-tee',
      }));
      expect(mockVerifyNearAuth).toHaveBeenCalledWith(expect.objectContaining({
        nearAccountId: 'test.testnet',
        nonce: 'test-nonce',
        role: 'SEEKER',
        signature: 'c2lnbmVk',
        publicKey: 'ed25519:pk',
      }));
      expect(localStorage.getItem('jwt')).toBe('real-jwt');
    });
  });

  it('logout() clears localStorage and resets user', async () => {
    const storedUser = { id: 'user-1', nearAccountId: 'alice.testnet', role: 'SEEKER', publicKey: 'ed25519:test', createdAt: '2026-01-01' };
    localStorage.setItem('user', JSON.stringify(storedUser));
    localStorage.setItem('jwt', fakeJwt());

    render(<AuthProvider><AuthConsumer /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).not.toBe('null');
    });

    await act(async () => {
      screen.getByTestId('logout').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('jwt')).toBeNull();
  });
});
