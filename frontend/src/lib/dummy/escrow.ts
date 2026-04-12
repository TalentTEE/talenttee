import { EscrowAccount, EscrowPayment } from '../types';

export const DUMMY_ESCROW: EscrowAccount = {
  employerId: 'user-2',
  balance: 5.0,
  agentKeySet: true,
};

export const DUMMY_ESCROW_PAYMENTS: EscrowPayment[] = [
  { id: 'pay-1', seekerId: 'user-1', amount: 0.5, timestamp: '2026-04-11T14:30:00Z', txHash: '0x111...' },
  { id: 'pay-2', seekerId: 'user-3', amount: 0.5, timestamp: '2026-04-11T15:00:00Z', txHash: '0x222...' },
];
