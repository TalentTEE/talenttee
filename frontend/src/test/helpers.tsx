import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { AuthProvider } from '@/lib/auth';
import { User } from '@/lib/types';

export const MOCK_SEEKER: User = {
  id: 'user-1',
  nearAccountId: 'alice.testnet',
  role: 'SEEKER',
  publicKey: 'ed25519:ALICE_PUBLIC_KEY_PLACEHOLDER',
  createdAt: '2026-04-10T09:00:00Z',
};

export const MOCK_EMPLOYER: User = {
  id: 'user-2',
  nearAccountId: 'bob.testnet',
  role: 'EMPLOYER',
  publicKey: 'ed25519:BOB_PUBLIC_KEY_PLACEHOLDER',
  createdAt: '2026-04-10T10:00:00Z',
};

/**
 * Renders a component wrapped in AuthProvider.
 * Optionally sets a user in localStorage before rendering.
 */
export function renderWithAuth(
  ui: ReactElement,
  options?: RenderOptions & { user?: User },
) {
  const { user, ...renderOptions } = options || {};
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('jwt', 'test-jwt-token');
  }
  return render(<AuthProvider>{ui}</AuthProvider>, renderOptions);
}
