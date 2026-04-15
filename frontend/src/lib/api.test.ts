import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub env BEFORE importing api module
vi.stubEnv('NEXT_PUBLIC_USE_DUMMY', 'true');

const {
  getDummyUser,
  getDatasourceStatus,
  connectDatasourceMock,
  getResume,
  getResumeStatus,
  generateResume,
  getJobs,
  chatCreateJob,
  createJob,
  getSeekerMatches,
  getEmployerMatches,
  agreeMatch,
  accessProfile,
  getNegotiationSessions,
  getNegotiationSession,
  getNegotiationRounds,
  sendIntervention,
  approveAgreement,
  getAgreement,
  getEscrowBalance,
  getEscrowPayments,
  updateJobSeekingStatus,
} = await import('./api');

describe('API — Dummy mode', () => {
  describe('getDummyUser', () => {
    it('returns Alice for SEEKER role', async () => {
      const user = await getDummyUser('SEEKER');
      expect(user.id).toBe('user-1');
      expect(user.nearAccountId).toBe('alice.testnet');
      expect(user.role).toBe('SEEKER');
    });

    it('returns Bob for EMPLOYER role', async () => {
      const user = await getDummyUser('EMPLOYER');
      expect(user.id).toBe('user-2');
      expect(user.nearAccountId).toBe('bob.testnet');
      expect(user.role).toBe('EMPLOYER');
    });
  });

  describe('getDatasourceStatus', () => {
    it('returns empty array initially (fresh demo state)', async () => {
      localStorage.removeItem('dummy_datasources');
      const ds = await getDatasourceStatus();
      expect(ds).toHaveLength(0);
    });

    it('returns persisted datasources from localStorage', async () => {
      const saved = [
        { id: 'ds-1', userId: 'user-1', provider: 'GITHUB', status: 'MOCK', lastSyncedAt: '2026-04-11T08:00:00Z' },
      ];
      localStorage.setItem('dummy_datasources', JSON.stringify(saved));
      const ds = await getDatasourceStatus();
      expect(ds).toHaveLength(1);
      expect(ds[0].provider).toBe('GITHUB');
      localStorage.removeItem('dummy_datasources');
    });
  });

  describe('connectDatasourceMock', () => {
    it('returns a DataSourceConnection with MOCK status', async () => {
      const conn = await connectDatasourceMock('GITHUB');
      expect(conn.provider).toBe('GITHUB');
      expect(conn.status).toBe('MOCK');
      expect(conn.userId).toBe('user-1');
      expect(conn.id).toMatch(/^ds-new-/);
      expect(conn.lastSyncedAt).toBeTruthy();
    });
  });

  describe('getResume', () => {
    it('returns dummy resume with COMPLETED status', async () => {
      const resume = await getResume();
      expect(resume.status).toBe('COMPLETE');
      expect(resume.skills).toContain('TypeScript');
      expect(resume.experience.length).toBeGreaterThan(0);
    });
  });

  describe('getResumeStatus', () => {
    it('returns COMPLETED status', async () => {
      const result = await getResumeStatus();
      expect(result.status).toBe('COMPLETE');
    });
  });

  describe('generateResume', () => {
    it('returns dummy resumeId', async () => {
      const result = await generateResume();
      expect(result.resumeId).toBe('dummy-resume-1');
    });
  });

  describe('getJobs', () => {
    it('returns dummy jobs array', async () => {
      const jobs = await getJobs();
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].title).toBe('Senior Backend Developer');
      expect(jobs[0].status).toBe('ACTIVE');
    });
  });

  describe('chatCreateJob', () => {
    it('returns a question when messages < 6', async () => {
      const result = await chatCreateJob([{ role: 'user', content: 'Hello' }]);
      expect(result.complete).toBe(false);
      expect(result.question).toBeTruthy();
    });

    it('returns complete with jobPosting when messages >= 6', async () => {
      const msgs = Array.from({ length: 6 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
      }));
      const result = await chatCreateJob(msgs);
      expect(result.complete).toBe(true);
      expect(result.jobPosting).toBeTruthy();
      expect(result.jobPosting!.title).toBe('Senior Backend Developer');
    });
  });

  describe('createJob', () => {
    it('merges input data with dummy job', async () => {
      const job = await createJob({ title: 'Custom Title' });
      expect(job.title).toBe('Custom Title');
      expect(job.id).toBe('job-1'); // base from DUMMY_JOBS[0]
    });
  });

  describe('getSeekerMatches', () => {
    it('returns dummy seeker matches', async () => {
      const matches = await getSeekerMatches();
      expect(matches).toHaveLength(3);
      expect(matches[0].finalRank).toBe(1);
    });
  });

  describe('getEmployerMatches', () => {
    it('returns dummy employer matches', async () => {
      const matches = await getEmployerMatches('job-1');
      expect(matches).toHaveLength(2);
    });
  });

  describe('accessProfile', () => {
    it('returns dummy profile report', async () => {
      const report = await accessProfile('user-1');
      expect(report.seekerId).toBe('user-1');
      expect(report.technicalSkills.length).toBeGreaterThan(0);
    });
  });

  describe('getNegotiationSessions', () => {
    it('returns dummy sessions', async () => {
      const sessions = await getNegotiationSessions();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].id).toBe('session-1');
    });
  });

  describe('getNegotiationSession', () => {
    it('returns matching session by id', async () => {
      const session = await getNegotiationSession('session-1');
      expect(session.id).toBe('session-1');
      expect(session.state).toBe('EMPLOYER_COUNTER');
    });

    it('returns first session for unknown id', async () => {
      const session = await getNegotiationSession('nonexistent');
      expect(session.id).toBe('session-1');
    });
  });

  describe('getNegotiationRounds', () => {
    it('returns rounds filtered by sessionId', async () => {
      const rounds = await getNegotiationRounds('session-1');
      expect(rounds.length).toBe(3);
      rounds.forEach(r => expect(r.sessionId).toBe('session-1'));
    });

    it('returns empty array for session with no rounds', async () => {
      const rounds = await getNegotiationRounds('session-999');
      expect(rounds).toEqual([]);
    });
  });

  describe('getAgreement', () => {
    it('returns dummy agreement', async () => {
      const agreement = await getAgreement('session-2');
      expect(agreement.sessionId).toBe('session-2');
      expect(agreement.seekerApproved).toBe(true);
      expect(agreement.summary.positionTitle).toBe('Full-stack Developer');
    });
  });

  describe('getEscrowBalance', () => {
    it('returns dummy escrow account', async () => {
      const escrow = await getEscrowBalance('user-2');
      expect(escrow.balance).toBe(5.0);
      expect(escrow.agentKeySet).toBe(true);
    });
  });

  describe('getEscrowPayments', () => {
    it('returns dummy payment history', async () => {
      const payments = await getEscrowPayments();
      expect(payments).toHaveLength(2);
      expect(payments[0].amount).toBe(0.5);
    });
  });

  describe('void functions in dummy mode', () => {
    it('updateJobSeekingStatus resolves without error', async () => {
      await expect(updateJobSeekingStatus(true)).resolves.toBeUndefined();
    });

    it('sendIntervention resolves without error', async () => {
      await expect(sendIntervention('session-1', 'raise')).resolves.toBeUndefined();
    });

    it('agreeMatch resolves without error', async () => {
      await expect(agreeMatch('match-1')).resolves.toBeUndefined();
    });

    it('approveAgreement resolves without error', async () => {
      await expect(approveAgreement('session-1')).resolves.toBeUndefined();
    });
  });
});
