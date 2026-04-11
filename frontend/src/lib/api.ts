import {
  User, DataSourceConnection, ResumeProfile, JobPosting,
  MatchResult, ProfileReport, NegotiationSession, NegotiationRound,
  AgreementRecord, EscrowAccount, EscrowPayment, ChatMessage, JobChatResponse,
} from './types';
import { DUMMY_ALICE, DUMMY_BOB } from './dummy/user';
import { DUMMY_DATASOURCES } from './dummy/datasources';
import { DUMMY_RESUME } from './dummy/resume';
import { DUMMY_JOBS } from './dummy/jobs';
import { DUMMY_SEEKER_MATCHES, DUMMY_EMPLOYER_MATCHES } from './dummy/matches';
import { DUMMY_PROFILE_REPORT } from './dummy/profile-report';
import { DUMMY_SESSIONS, DUMMY_ROUNDS } from './dummy/negotiation';
import { DUMMY_AGREEMENT } from './dummy/agreement';
import { DUMMY_ESCROW, DUMMY_ESCROW_PAYMENTS } from './dummy/escrow';

const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// === Auth ===
export async function getDummyUser(role: 'SEEKER' | 'EMPLOYER'): Promise<User> {
  return role === 'SEEKER' ? DUMMY_ALICE : DUMMY_BOB;
}

// === Datasource ===
export async function getDatasourceStatus(): Promise<DataSourceConnection[]> {
  if (USE_DUMMY) return DUMMY_DATASOURCES;
  return apiFetch('/datasource/status');
}

export async function connectDatasourceMock(provider: string): Promise<DataSourceConnection> {
  if (USE_DUMMY) {
    return { id: `ds-new-${Date.now()}`, userId: 'user-1', provider: provider as DataSourceConnection['provider'], status: 'MOCK', lastSyncAt: new Date().toISOString() };
  }
  return apiFetch('/datasource/connect/mock', { method: 'POST', body: JSON.stringify({ provider }) });
}

// === Resume ===
export async function getResume(userId: string): Promise<ResumeProfile> {
  if (USE_DUMMY) return DUMMY_RESUME;
  return apiFetch(`/resume/${userId}`);
}

export async function getResumeStatus(userId: string): Promise<{ status: string }> {
  if (USE_DUMMY) return { status: 'COMPLETED' };
  return apiFetch(`/resume/${userId}/status`);
}

export async function generateResume(): Promise<void> {
  if (USE_DUMMY) return;
  await apiFetch('/resume/generate', { method: 'POST' });
}

// === Jobs ===
export async function getJobs(): Promise<JobPosting[]> {
  if (USE_DUMMY) return DUMMY_JOBS;
  return apiFetch('/jobs');
}

export async function chatCreateJob(messages: ChatMessage[]): Promise<JobChatResponse> {
  if (USE_DUMMY) {
    if (messages.length >= 6) {
      return { complete: true, jobPosting: DUMMY_JOBS[0] };
    }
    const questions = [
      'What position are you hiring for?',
      'What are the required tech skills?',
      'What experience level is needed?',
      'What is the salary range?',
      'Is remote work possible?',
      'Any other benefits?',
    ];
    return { complete: false, question: questions[Math.min(messages.length, questions.length - 1)] };
  }
  return apiFetch('/jobs/chat', { method: 'POST', body: JSON.stringify({ messages }) });
}

// === Matching ===
export async function getSeekerMatches(seekerId: string): Promise<MatchResult[]> {
  if (USE_DUMMY) return DUMMY_SEEKER_MATCHES;
  return apiFetch(`/match/seeker/${seekerId}`);
}

export async function getEmployerMatches(jobId: string): Promise<MatchResult[]> {
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
    body: JSON.stringify({ direction, applyFromRound: 'next' }),
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
export async function getEscrowBalance(): Promise<EscrowAccount> {
  if (USE_DUMMY) return DUMMY_ESCROW;
  return apiFetch('/escrow/balance');
}

export async function getEscrowPayments(): Promise<EscrowPayment[]> {
  if (USE_DUMMY) return DUMMY_ESCROW_PAYMENTS;
  return apiFetch('/escrow/payments');
}
