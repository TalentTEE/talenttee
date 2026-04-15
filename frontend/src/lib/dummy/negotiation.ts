import { NegotiationSession, NegotiationRound } from '../types';

export const DUMMY_SESSIONS: NegotiationSession[] = [
  { id: 'session-1', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-1', state: 'EMPLOYER_COUNTER', currentRound: 3, maxRounds: 7, onChainTxHash: null },
  { id: 'session-2', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-2', state: 'AGREED', currentRound: 5, maxRounds: 7, onChainTxHash: '0xabc123def456' },
];

export const DUMMY_ROUNDS: NegotiationRound[] = [
  {
    id: 'round-1', sessionId: 'session-1', round: 1, actor: 'EMPLOYER_AGENT',
    proposal: { salary: 65000000, remotePolicy: '4 days office', workingHours: '09:00-18:00', title: 'Senior Backend Engineer', startDate: '2026-07-01', probationMonths: 3 },
    reasoning: {
      summary: 'Opening at $65M within the approved salary range with standard office policy.',
      factors: [
        'Salary positioned at $65M, midpoint of approved range, leaving room to negotiate upward',
        '4 days in-office offered as initial position per company standard policy',
        '3-month probation applied per non-negotiable policy',
      ],
    },
    decision: 'COUNTER',
  },
  {
    id: 'round-2', sessionId: 'session-1', round: 2, actor: 'SEEKER_AGENT',
    proposal: { salary: 70000000, remotePolicy: '3 days office', workingHours: '09:00-18:00 flexible', title: 'Senior Backend Engineer', startDate: '2026-07-01', probationMonths: 3, signingBonus: 3000000 },
    reasoning: {
      summary: 'Countering with higher salary and reduced office days based on market value analysis.',
      factors: [
        'Salary increased to $70M, aligned with upper range of market value assessment',
        'Requesting 3 days office instead of 4, reflecting industry standard for senior roles',
        'Signing bonus of $3M requested to offset transition costs',
      ],
    },
    decision: 'COUNTER',
  },
  {
    id: 'round-3', sessionId: 'session-1', round: 3, actor: 'EMPLOYER_AGENT',
    proposal: { salary: 68000000, remotePolicy: '3 days office', workingHours: '09:00-18:00 flexible', title: 'Senior Backend Engineer', startDate: '2026-07-15', probationMonths: 3, signingBonus: 2000000 },
    reasoning: {
      summary: 'Salary raised to $68M with concessions on office days while adjusting signing bonus.',
      factors: [
        'Salary increased to $68M as compromise, still within budget ceiling',
        'Accepted 3-day office schedule as a flexible item concession',
        'Signing bonus reduced to $2M, a partial concession from the requested $3M',
        'Start date adjusted to July 15 to align with team onboarding cycle',
      ],
    },
    decision: 'COUNTER',
  },
];
