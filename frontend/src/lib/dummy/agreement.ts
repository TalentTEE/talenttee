import { AgreementRecord } from '../types';

export const DUMMY_AGREEMENT: AgreementRecord = {
  sessionId: 'session-2',
  agreementHash: 'sha256:a1b2c3d4e5f6...',
  summary: {
    positionTitle: 'Full-stack Developer',
    agreedSalary: 65000000,
    startDate: '2026-08-01',
    negotiationRounds: 5,
    remotePolicy: 'Full remote',
    probationMonths: 3,
  },
  seekerApproved: true,
  employerApproved: true,
  onChainTxHash: '0xabc123def456',
};
