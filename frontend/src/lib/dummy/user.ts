import { User } from '../types';

export const DUMMY_ALICE: User = {
  id: 'user-1',
  nearAccountId: 'alice.testnet',
  role: 'SEEKER',
  publicKey: 'ed25519:ALICE_PUBLIC_KEY_PLACEHOLDER',
  createdAt: '2026-04-10T09:00:00Z',
};

export const DUMMY_BOB: User = {
  id: 'user-2',
  nearAccountId: 'bob.testnet',
  role: 'EMPLOYER',
  publicKey: 'ed25519:BOB_PUBLIC_KEY_PLACEHOLDER',
  createdAt: '2026-04-10T10:00:00Z',
};
