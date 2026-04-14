import {
  User, DataSourceConnection, ResumeProfile, JobPosting,
  MatchResult, MatchResultDisplay, ProfileReport, NegotiationSession, NegotiationRound,
  EncryptedNegotiationRound,
  AgreementRecord, EscrowAccount, EscrowPayment, ChatMessage, JobChatResponse,
} from './types';
import { DUMMY_ALICE, DUMMY_BOB } from './dummy/user';
import { getDummyDatasources, addDummyDatasource } from './dummy/datasources';
import { DUMMY_RESUME } from './dummy/resume';
import { DUMMY_JOBS } from './dummy/jobs';
import { DUMMY_SEEKER_MATCHES, DUMMY_EMPLOYER_MATCHES } from './dummy/matches';
import { DUMMY_PROFILE_REPORT } from './dummy/profile-report';
import { DUMMY_SESSIONS, DUMMY_ROUNDS } from './dummy/negotiation';
import { DUMMY_AGREEMENT } from './dummy/agreement';
import { DUMMY_ESCROW, DUMMY_ESCROW_PAYMENTS } from './dummy/escrow';

export const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let apiErrorHandler: ((status: number) => void) | null = null;

export function setApiErrorHandler(handler: (status: number) => void) {
  apiErrorHandler = handler;
}

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  });
  if (!res.ok) {
    apiErrorHandler?.(res.status);
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}

// === Auth (Dummy) ===
export async function getDummyUser(role: 'SEEKER' | 'EMPLOYER', nearAccountId?: string): Promise<User> {
  if (nearAccountId) {
    return {
      id: `user-${nearAccountId}`,
      nearAccountId,
      role,
      publicKey: 'ed25519:dummy',
      createdAt: new Date().toISOString(),
    };
  }
  return role === 'SEEKER' ? DUMMY_ALICE : DUMMY_BOB;
}

// === Auth (Real API) ===
export async function requestChallenge(): Promise<{ nonce: string; expiresAt: string }> {
  return apiFetch('/auth/near/challenge', { method: 'POST' });
}

export async function verifyNearAuth(params: {
  nearAccountId: string;
  publicKey: string;
  signature: string;
  nonce: string;
  role: string;
}): Promise<{ jwt: string; user: User }> {
  return apiFetch('/auth/near/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// === Job Seeking Status ===
export async function updateJobSeekingStatus(active: boolean): Promise<void> {
  if (USE_DUMMY) return;
  await apiFetch('/seeker/job-seeking-status', {
    method: 'PUT',
    body: JSON.stringify({ active }),
  });
}

// === Datasource ===
export async function getDatasourceStatus(): Promise<DataSourceConnection[]> {
  if (USE_DUMMY) return getDummyDatasources();
  return apiFetch('/datasource/status');
}

export function connectGithubOAuth(): void {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
  // GET endpoint — browser redirect with JWT as query param for state passing
  window.location.href = `${API_URL}/datasource/connect/github${token ? `?token=${token}` : ''}`;
}

export async function connectDatasourceMock(provider: string): Promise<DataSourceConnection> {
  if (USE_DUMMY) {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const uid = storedUser ? JSON.parse(storedUser).id : 'user-1';
    const conn: DataSourceConnection = {
      id: `ds-new-${Date.now()}`,
      userId: uid,
      provider: provider as DataSourceConnection['provider'],
      status: 'MOCK',
      lastSyncedAt: new Date().toISOString(),
    };
    addDummyDatasource(conn);
    return conn;
  }
  return apiFetch('/datasource/connect/mock', { method: 'POST', body: JSON.stringify({ provider }) });
}

// === Resume ===
export async function getResume(): Promise<ResumeProfile> {
  if (USE_DUMMY) return { ...DUMMY_RESUME, userId: 'dummy-user' };
  return apiFetch('/resume/me');
}

export async function getResumeStatus(): Promise<{ status: string }> {
  if (USE_DUMMY) return { status: 'COMPLETE' };
  return apiFetch('/resume/me/status');
}

export async function generateResume(): Promise<{ resumeId: string }> {
  if (USE_DUMMY) return { resumeId: 'dummy-resume-1' };
  const res = await fetch(`${API_URL}/resume/generate`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (res.status !== 202 && !res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// === Jobs ===
export async function getJobs(): Promise<JobPosting[]> {
  if (USE_DUMMY) return DUMMY_JOBS;
  // TODO: Backend only has GET /jobs/:id (single), no list endpoint yet.
  // Once backend adds GET /jobs, remove this comment.
  return apiFetch('/jobs');
}

export async function chatCreateJob(messages: ChatMessage[]): Promise<JobChatResponse> {
  if (USE_DUMMY) {
    if (messages.length >= 6) {
      return { complete: true, jobPosting: DUMMY_JOBS[0] };
    }
    const questions = [
      'What position are you hiring for? (e.g. Senior Backend Developer)',
      'Can you describe the role and responsibilities?',
      'What are the required tech skills? (e.g. TypeScript, React, Node.js)',
      "What's your maximum salary budget? This will be your negotiation ceiling — candidates won't see this number.",
      'What is the remote work policy? (Full Office / Hybrid / Full Remote)',
    ];
    return { complete: false, question: questions[Math.min(messages.length, questions.length - 1)] };
  }
  // Backend expects { message: string, sessionId?: string }
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  return apiFetch('/jobs/chat', {
    method: 'POST',
    body: JSON.stringify({ message: lastUserMsg?.content ?? '' }),
  });
}

export async function createJob(jobData: Partial<JobPosting>): Promise<JobPosting> {
  if (USE_DUMMY) return { ...DUMMY_JOBS[0], ...jobData } as JobPosting;
  return apiFetch('/jobs', { method: 'POST', body: JSON.stringify(jobData) });
}

// === Matching ===
export async function getSeekerMatches(): Promise<MatchResultDisplay[]> {
  if (USE_DUMMY) return DUMMY_SEEKER_MATCHES;
  return apiFetch('/match/me');
}

export async function getEmployerMatches(jobId: string): Promise<MatchResultDisplay[]> {
  if (USE_DUMMY) return DUMMY_EMPLOYER_MATCHES;
  return apiFetch(`/match/job/${jobId}`);
}

export async function agreeMatch(matchId: string): Promise<void> {
  if (USE_DUMMY) return;
  await apiFetch(`/match/${matchId}/agree`, { method: 'POST' });
}

// === Profile ===
export async function accessProfile(seekerId: string): Promise<ProfileReport> {
  if (USE_DUMMY) return DUMMY_PROFILE_REPORT;
  return apiFetch(`/profile/${seekerId}/access`, { method: 'POST' });
}

// === Negotiation ===
export async function getNegotiationSessions(): Promise<NegotiationSession[]> {
  if (USE_DUMMY) return DUMMY_SESSIONS;
  // TODO: Backend has no list endpoint for sessions yet.
  // Currently only GET /negotiation/sessions/:id exists.
  return apiFetch('/negotiation/sessions');
}

export async function getNegotiationSession(sessionId: string): Promise<NegotiationSession> {
  if (USE_DUMMY) return DUMMY_SESSIONS.find(s => s.id === sessionId) || DUMMY_SESSIONS[0];
  return apiFetch(`/negotiation/sessions/${sessionId}`);
}

export async function getNegotiationRounds(sessionId: string): Promise<NegotiationRound[]> {
  if (USE_DUMMY) return DUMMY_ROUNDS.filter(r => r.sessionId === sessionId);
  return apiFetch(`/negotiation/sessions/${sessionId}/rounds`);
}

export async function sendIntervention(sessionId: string, direction: string): Promise<void> {
  if (USE_DUMMY) return;
  await apiFetch(`/negotiation/sessions/${sessionId}/intervene`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  });
}

export async function approveAgreement(sessionId: string): Promise<void> {
  if (USE_DUMMY) return;
  await apiFetch(`/negotiation/sessions/${sessionId}/approve`, { method: 'POST' });
}

// === Agreement ===
export async function getAgreement(sessionId: string): Promise<AgreementRecord> {
  if (USE_DUMMY) return DUMMY_AGREEMENT;
  return apiFetch(`/agreement/${sessionId}`);
}

// === Escrow ===
function yoctoToNear(yocto: string): number {
  const YOCTO_PER_NEAR = 1e24;
  return Number(BigInt(yocto || '0')) / YOCTO_PER_NEAR;
}

export async function getEscrowBalance(accountId?: string): Promise<EscrowAccount> {
  if (USE_DUMMY) return DUMMY_ESCROW;
  const data = await apiFetch<{ balance: string }>(`/escrow/balance?accountId=${accountId}`);
  return {
    employerId: accountId || '',
    balance: yoctoToNear(data.balance),
    agentKeySet: false,
  };
}

export async function getEscrowPayments(): Promise<EscrowPayment[]> {
  if (USE_DUMMY) return DUMMY_ESCROW_PAYMENTS;
  return apiFetch('/escrow/payments');
}

export async function depositToEscrow(amount: string): Promise<{
  contractId: string; methodName: string; args: object; deposit: string;
}> {
  return apiFetch('/escrow/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

// === Encrypted Negotiation History ===
export async function getEncryptedHistory(sessionId: string): Promise<EncryptedNegotiationRound[]> {
  return apiFetch(`/negotiation/sessions/${sessionId}/rounds`);
}

export function getServerPublicKey(): string {
  return process.env.NEXT_PUBLIC_SERVER_PUBLIC_KEY || '';
}
