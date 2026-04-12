import { NegotiationSession, NegotiationRound } from '../types';

export const DUMMY_SESSIONS: NegotiationSession[] = [
  { id: 'session-1', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-1', state: 'EMPLOYER_COUNTER', currentRound: 3, maxRounds: 7, onChainTxHash: null },
  { id: 'session-2', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-2', state: 'AGREED', currentRound: 5, maxRounds: 7, onChainTxHash: '0xabc123def456' },
];

export const DUMMY_ROUNDS: NegotiationRound[] = [
  {
    id: 'round-1', sessionId: 'session-1', round: 1, actor: 'EMPLOYER_AGENT',
    proposal: { salary: 65000000, remotePolicy: '4 days office', workingHours: '09:00-18:00', title: 'Senior Backend Engineer', startDate: '2026-07-01', probationMonths: 3 },
    reasoning: 'Initial offer based on job posting. Salary at midpoint, 4 days in-office.', decision: 'COUNTER',
  },
  {
    id: 'round-2', sessionId: 'session-1', round: 2, actor: 'SEEKER_AGENT',
    proposal: { salary: 70000000, remotePolicy: '3 days office', workingHours: '09:00-18:00 flexible', title: 'Senior Backend Engineer', startDate: '2026-07-01', probationMonths: 3, signingBonus: 3000000 },
    reasoning: 'Counter based on market value analysis. Requesting reduced office days and signing bonus.', decision: 'COUNTER',
  },
  {
    id: 'round-3', sessionId: 'session-1', round: 3, actor: 'EMPLOYER_AGENT',
    proposal: { salary: 68000000, remotePolicy: '3 days office', workingHours: '09:00-18:00 flexible', title: 'Senior Backend Engineer', startDate: '2026-07-15', probationMonths: 3, signingBonus: 2000000 },
    reasoning: 'Salary raised to 68M. Accepted 3-day office. Signing bonus adjusted to 2M.', decision: 'COUNTER',
  },
];
