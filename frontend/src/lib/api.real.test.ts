import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub env BEFORE importing — USE_DUMMY must be false for real API tests
vi.stubEnv('NEXT_PUBLIC_USE_DUMMY', 'false');
vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001');

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const api = await import('./api');

function jsonRes(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('API — Real mode', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  // ── Auth headers ──────────────────────────────────

  describe('authHeaders', () => {
    it('includes Bearer token when jwt exists in localStorage', async () => {
      localStorage.setItem('jwt', 'my-token');
      mockFetch.mockReturnValue(jsonRes([]));

      await api.getJobs();

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers).toEqual(
        expect.objectContaining({ Authorization: 'Bearer my-token' }),
      );
    });

    it('omits Authorization header when no jwt', async () => {
      mockFetch.mockReturnValue(jsonRes([]));

      await api.getJobs();

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  // ── Error handling ────────────────────────────────

  describe('error handling', () => {
    it('throws on 401 response', async () => {
      mockFetch.mockReturnValue(jsonRes(null, 401));
      await expect(api.getJobs()).rejects.toThrow('API Error: 401');
    });

    it('throws on 500 response', async () => {
      mockFetch.mockReturnValue(jsonRes(null, 500));
      await expect(api.getJobs()).rejects.toThrow('API Error: 500');
    });

    it('throws on 404 response', async () => {
      mockFetch.mockReturnValue(jsonRes(null, 404));
      await expect(api.getNegotiationSession('x')).rejects.toThrow('API Error: 404');
    });
  });

  // ── generateResume special 202 handling ───────────

  describe('generateResume (202 accepted)', () => {
    it('does not throw on 202 status', async () => {
      mockFetch.mockReturnValue(jsonRes({ resumeId: 'r-1' }, 202));
      const result = await api.generateResume();
      expect(result).toEqual({ resumeId: 'r-1' });
    });

    it('throws on non-ok non-202 status', async () => {
      mockFetch.mockReturnValue(jsonRes(null, 500));
      await expect(api.generateResume()).rejects.toThrow('API Error: 500');
    });
  });

  // ── Endpoint mapping: GET endpoints ───────────────

  describe('GET endpoint mapping', () => {
    const getCases: [string, () => Promise<unknown>, string][] = [
      ['getDatasourceStatus', () => api.getDatasourceStatus(), '/datasource/status'],
      // connectGithubOAuth moved to POST tests
      ['getResume', () => api.getResume(), '/resume/me'],
      ['getResumeStatus', () => api.getResumeStatus(), '/resume/me/status'],
      ['getJobs', () => api.getJobs(), '/jobs'],
      ['getSeekerMatches', () => api.getSeekerMatches(), '/match/me'],
      ['getEmployerMatches', () => api.getEmployerMatches('j1'), '/match/job/j1'],
      ['getNegotiationSessions', () => api.getNegotiationSessions(), '/negotiation/sessions'],
      ['getNegotiationSession', () => api.getNegotiationSession('sess1'), '/negotiation/sessions/sess1'],
      ['getNegotiationRounds', () => api.getNegotiationRounds('sess1'), '/negotiation/sessions/sess1/rounds/decrypted'],
      ['getAgreement', () => api.getAgreement('sess2'), '/agreement/sess2'],
      ['getEscrowBalance', () => api.getEscrowBalance('bob'), '/escrow/balance?accountId=bob'],
      ['getEscrowPayments', () => api.getEscrowPayments(), '/escrow/payments'],
    ];

    it.each(getCases)('%s calls GET %s', async (_name, fn, path) => {
      mockFetch.mockReturnValue(jsonRes({}));
      await fn();

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`http://localhost:3001${path}`);
      // GET requests: no explicit method set (defaults to GET) or undefined
      expect(opts?.method).toBeUndefined();
    });
  });

  // ── Endpoint mapping: POST/PUT endpoints ──────────

  describe('POST/PUT endpoint mapping', () => {
    it('requestChallenge → POST /auth/near/challenge', async () => {
      mockFetch.mockReturnValue(jsonRes({ nonce: 'abc', expiresAt: '2026-01-01' }));
      await api.requestChallenge();

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/auth/near/challenge');
      expect(opts.method).toBe('POST');
    });

    it('verifyNearAuth → POST /auth/near/verify with body', async () => {
      const params = {
        nearAccountId: 'alice.testnet',
        publicKey: 'ed25519:key',
        signature: 'sig123',
        nonce: 'nonce1',
        role: 'SEEKER',
      };
      mockFetch.mockReturnValue(jsonRes({ jwt: 'token', user: {} }));
      await api.verifyNearAuth(params);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/auth/near/verify');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual(params);
    });

    it('updateJobSeekingStatus → PUT /seeker/job-seeking-status', async () => {
      mockFetch.mockReturnValue(jsonRes(undefined));
      await api.updateJobSeekingStatus(true);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/seeker/job-seeking-status');
      expect(opts.method).toBe('PUT');
      expect(JSON.parse(opts.body)).toEqual({ active: true });
    });

    it('connectDatasourceMock → POST /datasource/connect/mock', async () => {
      mockFetch.mockReturnValue(jsonRes({ id: 'ds-1', provider: 'GITHUB' }));
      await api.connectDatasourceMock('GITHUB');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/datasource/connect/mock');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ provider: 'GITHUB' });
    });

    it('generateResume → POST /resume/generate', async () => {
      mockFetch.mockReturnValue(jsonRes({ resumeId: 'r-1' }, 202));
      await api.generateResume();

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/resume/generate');
      expect(opts.method).toBe('POST');
    });

    it('chatCreateJob → POST /jobs/chat with messages body', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      mockFetch.mockReturnValue(jsonRes({ complete: false, question: 'What?' }));
      await api.chatCreateJob(messages);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/jobs/chat');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ message: 'Hello' });
    });

    it('connectGithubOAuth → redirects to backend GitHub OAuth endpoint', () => {
      // connectGithubOAuth now sets window.location.href directly (GET redirect)
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
      api.connectGithubOAuth();
      expect(mockLocation.href).toContain('/datasource/connect/github');
    });

    it('createJob → POST /jobs with jobData body', async () => {
      const jobData = { title: 'Dev' };
      mockFetch.mockReturnValue(jsonRes({ id: 'j-1', title: 'Dev' }));
      await api.createJob(jobData);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/jobs');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual(jobData);
    });

    it('refreshSeekerMatches → POST /match/me/refresh', async () => {
      mockFetch.mockReturnValue(jsonRes([]));
      await api.refreshSeekerMatches();

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/match/me/refresh');
      expect(opts.method).toBe('POST');
    });

    it('refreshEmployerMatches → POST /match/job/{id}/refresh', async () => {
      mockFetch.mockReturnValue(jsonRes([]));
      await api.refreshEmployerMatches('j1');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/match/job/j1/refresh');
      expect(opts.method).toBe('POST');
    });

    it('agreeMatch → POST /match/{id}/agree', async () => {
      mockFetch.mockReturnValue(jsonRes(undefined));
      await api.agreeMatch('m1');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/match/m1/agree');
      expect(opts.method).toBe('POST');
    });

    it('accessProfile → POST /profile/{id}/access', async () => {
      mockFetch.mockReturnValue(jsonRes({ seekerId: 's1' }));
      await api.accessProfile('s1');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/profile/s1/access');
      expect(opts.method).toBe('POST');
    });

    it('sendIntervention → POST /negotiation/sessions/{id}/intervene with body', async () => {
      mockFetch.mockReturnValue(jsonRes(undefined));
      await api.sendIntervention('sess1', 'raise');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/negotiation/sessions/sess1/intervene');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ direction: 'raise' });
    });

    it('approveAgreement → POST /negotiation/sessions/{id}/approve', async () => {
      mockFetch.mockReturnValue(jsonRes(undefined));
      await api.approveAgreement('sess2');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/negotiation/sessions/sess2/approve');
      expect(opts.method).toBe('POST');
    });

    it('depositToEscrow → POST /escrow/deposit with amount body', async () => {
      mockFetch.mockReturnValue(jsonRes({ contractId: 'escrow.near', methodName: 'deposit', args: {}, deposit: '1000' }));
      await api.depositToEscrow('5.0');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/escrow/deposit');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ amount: '5.0' });
    });
  });

  // ── yoctoToNear conversion in real mode ───────────

  describe('getEscrowBalance — yoctoToNear conversion', () => {
    it('converts yocto string to NEAR float', async () => {
      // 5 NEAR = 5 * 1e24 yoctoNEAR
      mockFetch.mockReturnValue(jsonRes({ balance: '5000000000000000000000000' }));
      const result = await api.getEscrowBalance('bob');
      expect(result.balance).toBeCloseTo(5, 10);
      expect(result.employerId).toBe('bob');
      expect(result.agentKeySet).toBe(false);
    });

    it('handles zero balance', async () => {
      mockFetch.mockReturnValue(jsonRes({ balance: '0' }));
      const result = await api.getEscrowBalance('bob');
      expect(result.balance).toBe(0);
    });
  });
});
