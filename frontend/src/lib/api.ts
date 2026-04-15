import {
  User, DataSourceConnection, DatasourceDetail, ResumeProfile, JobPosting,
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

export async function getDatasourceData(provider: string): Promise<DatasourceDetail> {
  if (USE_DUMMY) {
    const fixtures: Record<string, DatasourceDetail> = {
      GITHUB: {"profile":{"login":"demo-developer","name":"김개발","bio":"Full-stack developer passionate about Web3","public_repos":42,"followers":128},"languages":{"TypeScript":45000,"JavaScript":32000,"Rust":18000,"Python":12000,"Solidity":8000},"repositories":[{"name":"defi-swap-protocol","description":"Decentralized token swap on NEAR Protocol","language":"Rust","stars":34,"forks":12,"topics":["near","defi","blockchain"]},{"name":"ai-resume-builder","description":"AI-powered resume generation tool","language":"TypeScript","stars":89,"forks":23,"topics":["ai","nestjs","openai"]},{"name":"react-dashboard-kit","description":"Enterprise dashboard component library","language":"TypeScript","stars":156,"forks":45,"topics":["react","nextjs","tailwindcss"]}],"contributions":{"total_commits_last_year":847,"prs_merged":123,"issues_closed":67,"code_reviews":89}},
      SLACK: {"messages":[{"id":"slack-001","channel":"#backend-team","text":"PR #234 머지했습니다. 인증 미들웨어 리팩토링 완료.","timestamp":"2026-03-15T09:30:00Z"},{"id":"slack-002","channel":"#architecture","text":"마이크로서비스 전환 관련해서 이벤트 소싱 패턴이 좋을 것 같습니다.","timestamp":"2026-03-16T14:20:00Z"},{"id":"slack-003","channel":"#code-review","text":"이 부분은 N+1 쿼리 이슈가 있네요. QueryBuilder로 JOIN 걸면 성능 개선됩니다.","timestamp":"2026-03-17T11:00:00Z"},{"id":"slack-004","channel":"#backend-team","text":"배포 파이프라인 에러 수정했습니다. Docker 빌드 캐시 문제였는데 multi-stage build로 해결.","timestamp":"2026-03-18T16:45:00Z"},{"id":"slack-005","channel":"#general","text":"이번 스프린트 회고 결과 공유합니다. API 응답시간 30% 개선.","timestamp":"2026-03-20T10:00:00Z"}]},
      DISCORD: {"activities":[{"id":"discord-001","server":"NEAR Korea Developers","role":"Core Contributor","messages_count":234,"helpful_answers":45},{"id":"discord-002","server":"TypeScript Korea","role":"Moderator","messages_count":567,"helpful_answers":89},{"id":"discord-003","server":"Web3 Builders","role":"Member","messages_count":123,"helpful_answers":23}]},
      GOV24: {"certificates":[{"name":"정보처리기사","issuer":"한국산업인력공단","issued_date":"2022-06-15","status":"유효"},{"name":"SQLD (SQL Developer)","issuer":"한국데이터산업진흥원","issued_date":"2021-09-20","status":"유효"}],"education":[{"institution":"서울대학교","degree":"컴퓨터공학 학사","graduation_year":2021,"status":"졸업"}]},
    };
    return fixtures[provider] ?? fixtures.GITHUB;
  }
  return apiFetch(`/datasource/me/${provider.toLowerCase()}/data`);
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
