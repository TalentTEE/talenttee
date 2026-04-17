import {
  User, DataSourceConnection, DatasourceDetail, ResumeProfile, JobPosting,
  MatchResult, MatchResultDisplay, MatchContext, ProfileReport, NegotiationSession, NegotiationRound,
  EncryptedNegotiationRound,
  AgreementRecord, EscrowAccount, EscrowPayment, ChatMessage, JobChatResponse,
} from './types';
import { DUMMY_ALICE, DUMMY_BOB } from './dummy/user';
import { getDummyDatasources, addDummyDatasource, removeDummyDatasource } from './dummy/datasources';
import { DUMMY_RESUME } from './dummy/resume';
import { DUMMY_JOBS } from './dummy/jobs';
import { DUMMY_SEEKER_MATCHES, DUMMY_EMPLOYER_MATCHES, DUMMY_MATCH_CONTEXT } from './dummy/matches';
import { DUMMY_PROFILE_REPORT } from './dummy/profile-report';
import { DUMMY_SESSIONS, DUMMY_ROUNDS } from './dummy/negotiation';
import { DUMMY_AGREEMENT } from './dummy/agreement';
import { DUMMY_ESCROW, DUMMY_ESCROW_PAYMENTS } from './dummy/escrow';

export const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
    let detail = '';
    try {
      const body = await res.json();
      detail = body.message || JSON.stringify(body);
    } catch { /* ignore parse errors */ }
    throw new Error(detail || `API Error: ${res.status}`);
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
  role?: string;
  intent?: 'login' | 'signup';
}): Promise<{ jwt: string; user: User }> {
  return apiFetch('/auth/near/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// === Auth (Dev Login) ===
export async function devLogin(params: {
  nearAccountId: string;
  role: string;
}): Promise<{ jwt: string; user: User }> {
  return apiFetch('/auth/near/dev-login', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// === Job Seeking Status ===
export async function getJobSeekingStatus(): Promise<{ jobSeeking: boolean }> {
  if (USE_DUMMY) return { jobSeeking: false };
  return apiFetch('/seeker/job-seeking-status');
}

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

export function getGithubOAuthUrl(): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
  return `${API_URL}/datasource/connect/github${token ? `?token=${token}` : ''}`;
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

export async function disconnectDatasource(provider: string): Promise<void> {
  if (USE_DUMMY) {
    removeDummyDatasource(provider);
    return;
  }
  await apiFetch(`/datasource/${provider.toLowerCase()}`, { method: 'DELETE' });
}

export async function getDatasourceData(provider: string): Promise<DatasourceDetail> {
  if (USE_DUMMY) {
    const fixtures: Record<string, DatasourceDetail> = {
      GITHUB: {
        profile:{login:"demo-developer",name:"Dev Kim",bio:"Full-stack developer passionate about Web3",public_repos:42,followers:128},
        languages:{TypeScript:45000,JavaScript:32000,Rust:18000,Python:12000,Solidity:8000},
        repositories:[
          {name:"defi-swap-protocol",description:"Decentralized token swap on NEAR Protocol",language:"Rust",stars:34,forks:12,topics:["near","defi","blockchain"]},
          {name:"ai-resume-builder",description:"AI-powered resume generation tool",language:"TypeScript",stars:89,forks:23,topics:["ai","nestjs","openai"]},
          {name:"react-dashboard-kit",description:"Enterprise dashboard component library",language:"TypeScript",stars:156,forks:45,topics:["react","nextjs","tailwindcss"]},
        ],
        contributions:{total_commits_last_year:847,prs_merged:123,issues_closed:67,code_reviews:89},
        analysis:{
          skills:[
            {name:"TypeScript/JavaScript",level:92,evidence:"Primary language, 67% of total codebase. Used across frontend (React) and backend (NestJS)"},
            {name:"Rust/Smart Contract",level:75,evidence:"DeFi protocol development on NEAR. Smart contract design and implementation"},
            {name:"AI/ML Integration",level:68,evidence:"AI tool development with OpenAI API. Prompt engineering and pipeline construction"},
            {name:"Frontend Architecture",level:88,evidence:"Component library maintainer (156 stars). Next.js and Tailwind-based architecture"},
          ],
          workPatterns:[
            {trait:"Consistent Contributions",description:"847 commits/year, averaging 16.3 per week"},
            {trait:"Active Code Reviewer",description:"89 reviews completed. 72% review-to-PR ratio, team-oriented collaboration"},
            {trait:"Open Source Impact",description:"279 total stars, 80 forks across projects. High community adoption"},
          ],
          projects:[
            {name:"DeFi Swap Protocol",role:"Lead Developer",skills:["Rust","NEAR Protocol","Smart Contract"],impact:"Designed & built decentralized token swap protocol. Forked by 12 developers"},
            {name:"AI Resume Builder",role:"Full-stack Developer",skills:["TypeScript","NestJS","OpenAI API"],impact:"AI-powered resume generation tool. Achieved 89 stars, 23 forks"},
            {name:"React Dashboard Kit",role:"Library Author",skills:["React","Next.js","Tailwind CSS"],impact:"Enterprise dashboard component library. Highest adoption rate (156 stars)"},
          ],
        },
      },
      SLACK: {
        messages:[
          {id:"slack-001",channel:"#backend-team",text:"Merged PR #234. Auth middleware refactoring complete.",timestamp:"2026-03-15T09:30:00Z"},
          {id:"slack-002",channel:"#architecture",text:"For the microservice migration, I think Event Sourcing pattern would work well.",timestamp:"2026-03-16T14:20:00Z"},
          {id:"slack-003",channel:"#code-review",text:"This has an N+1 query issue. Using QueryBuilder with JOIN should improve performance.",timestamp:"2026-03-17T11:00:00Z"},
          {id:"slack-004",channel:"#backend-team",text:"Fixed the deployment pipeline error. It was a Docker build cache issue — resolved with multi-stage build.",timestamp:"2026-03-18T16:45:00Z"},
          {id:"slack-005",channel:"#general",text:"Sharing this sprint's retrospective results. API response time improved by 30%.",timestamp:"2026-03-20T10:00:00Z"},
        ],
        analysis:{
          communicationStyle:{clarity:90,technicalDepth:85,proactiveness:88},
          traits:[
            {trait:"Technical Communication",level:90,evidence:"Provides specific improvements like N+1 query fixes in code reviews. Active in architecture discussions"},
            {trait:"Problem-Solving Initiative",level:88,evidence:"Independently diagnosed deployment pipeline issues and resolved with Docker multi-stage builds"},
            {trait:"Results Sharing",level:85,evidence:"Quantitatively shares sprint results (30% response time improvement, 0.1% error rate)"},
            {trait:"Architecture Design",level:82,evidence:"Proposes system-level patterns like Event Sourcing + CQRS in design discussions"},
          ],
          workAreas:[
            {area:"Backend Development",messageCount:2,keywords:["JWT","passport-jwt","Docker","multi-stage build"]},
            {area:"Architecture Design",messageCount:1,keywords:["CQRS","Event Sourcing","Microservice"]},
            {area:"Code Review",messageCount:1,keywords:["N+1 Query","TypeORM","QueryBuilder"]},
            {area:"Sprint Management",messageCount:1,keywords:["Performance","Error Rate","Retrospective"]},
          ],
        },
      },
      DISCORD: {
        activities:[
          {id:"discord-001",server:"NEAR Korea Developers",role:"Core Contributor",messages_count:234,helpful_answers:45},
          {id:"discord-002",server:"TypeScript Korea",role:"Moderator",messages_count:567,helpful_answers:89},
          {id:"discord-003",server:"Web3 Builders",role:"Member",messages_count:123,helpful_answers:23},
        ],
        analysis:{
          communityImpact:{totalServers:3,totalMessages:924,totalHelpful:157,helpfulRatio:17},
          traits:[
            {trait:"Technical Mentoring",level:88,evidence:"TypeScript Korea moderator. Top contributor with 89 helpful answers"},
            {trait:"Blockchain Expertise",level:82,evidence:"NEAR Korea Core Contributor. 45 answers on smart contract questions"},
            {trait:"Community Leadership",level:85,evidence:"Active in 3 servers, holding leadership roles in 2 (Moderator, Core Contributor)"},
          ],
          expertise:[
            {domain:"TypeScript/JavaScript",confidence:92,source:"TypeScript Korea moderator, 567 messages"},
            {domain:"NEAR/Blockchain",confidence:78,source:"NEAR Korea Core Contributor, 234 messages"},
            {domain:"Web3 Development",confidence:70,source:"Web3 Builders member, 123 messages"},
          ],
        },
      },
      GOV24: {
        certificates:[
          {name:"Engineer Information Processing",issuer:"HRD Korea",issued_date:"2022-06-15",status:"Valid"},
          {name:"SQLD (SQL Developer)",issuer:"Korea Data Agency",issued_date:"2021-09-20",status:"Valid"},
        ],
        education:[
          {institution:"Seoul National University",degree:"B.S. Computer Science",graduation_year:2021,status:"Graduated"},
        ],
        analysis:{
          qualifications:[
            {trait:"Software Engineering Fundamentals",level:90,evidence:"Engineer Information Processing certificate. CS fundamentals verified"},
            {trait:"Database Design",level:78,evidence:"SQLD certification. SQL query optimization and DB design skills verified"},
            {trait:"Formal CS Education",level:85,evidence:"Seoul National University, B.S. in Computer Science. Algorithms, data structures, OS coursework"},
          ],
        },
      },
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

export interface ChatCreateJobResult {
  sessionId: string;
  response: JobChatResponse;
}

export async function chatCreateJob(
  messages: ChatMessage[],
  backendSessionId?: string,
): Promise<ChatCreateJobResult> {
  if (USE_DUMMY) {
    const sid = backendSessionId ?? 'dummy-session';
    const userMsgCount = messages.filter((m) => m.role === 'user').length;

    // Phase 3: After salary ceiling answer → complete
    if (userMsgCount >= 5) {
      return {
        sessionId: sid,
        response: {
          complete: true,
          jobPosting: { ...DUMMY_JOBS[0], salaryMax: 90000 },
          salaryRecommendation: { min: 70000, max: 95000, reasoning: 'Based on market data for Senior Backend Developers with TypeScript/React skills in the current market.' },
        },
      };
    }

    // Phase 2: After remote policy answer → salary recommendation
    if (userMsgCount >= 4) {
      return {
        sessionId: sid,
        response: {
          complete: false,
          salaryRecommendation: { min: 70000, max: 95000, reasoning: 'Based on market data for Senior Backend Developers with TypeScript/React skills in the current market.' },
          question: 'Based on my market analysis, the typical salary range for this role is $70,000–$95,000/year. What would you like to set as your maximum negotiation ceiling? (Candidates won\'t see this number — the AI negotiator will use it as the upper limit.)',
        },
      };
    }

    // Phase 1: Collect info
    const questions = [
      'What position are you hiring for? (e.g. Senior Backend Developer)',
      'Can you describe the role and responsibilities?',
      'What are the required tech skills? (e.g. TypeScript, React, Node.js)',
      'What is the remote work policy? (Full Office / Hybrid / Full Remote)',
    ];
    return {
      sessionId: sid,
      response: {
        complete: false,
        question: questions[Math.min(userMsgCount, questions.length - 1)],
      },
    };
  }
  // Backend expects { message: string, sessionId?: string }
  // Backend returns { sessionId: string, response: JobChatResponse }
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  return apiFetch<ChatCreateJobResult>('/jobs/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: lastUserMsg?.content ?? '',
      sessionId: backendSessionId,
    }),
  });
}

export async function createJob(jobData: Partial<JobPosting>): Promise<JobPosting> {
  if (USE_DUMMY) return { ...DUMMY_JOBS[0], ...jobData } as JobPosting;
  return apiFetch('/jobs', { method: 'POST', body: JSON.stringify(jobData) });
}

export async function recommendSalary(dto: { title: string; description: string; skills: string[] }): Promise<{ salaryMin: number; salaryMax: number; reasoning: string }> {
  if (USE_DUMMY) return { salaryMin: 60000, salaryMax: 80000, reasoning: 'Estimated based on role and skills.' };
  return apiFetch('/jobs/salary-recommend', { method: 'POST', body: JSON.stringify(dto) });
}

export async function publishJob(jobId: string): Promise<JobPosting> {
  if (USE_DUMMY) return { ...DUMMY_JOBS[0], id: jobId, status: 'ACTIVE' } as JobPosting;
  return apiFetch(`/jobs/${jobId}/publish`, { method: 'POST' });
}

export async function closeJob(jobId: string): Promise<JobPosting> {
  if (USE_DUMMY) return { ...DUMMY_JOBS[0], id: jobId, status: 'CLOSED' } as JobPosting;
  return apiFetch(`/jobs/${jobId}/close`, { method: 'POST' });
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

export async function refreshSeekerMatches(): Promise<MatchResultDisplay[]> {
  if (USE_DUMMY) return DUMMY_SEEKER_MATCHES;
  return apiFetch('/match/me/refresh', { method: 'POST' });
}

export async function refreshEmployerMatches(jobId: string): Promise<MatchResultDisplay[]> {
  if (USE_DUMMY) return DUMMY_EMPLOYER_MATCHES;
  return apiFetch(`/match/job/${jobId}/refresh`, { method: 'POST' });
}

export async function agreeMatch(matchId: string): Promise<void> {
  if (USE_DUMMY) return;
  await apiFetch(`/match/${matchId}/agree`, { method: 'POST' });
}

export async function retrySeekerNegotiate(): Promise<MatchResultDisplay[]> {
  if (USE_DUMMY) return DUMMY_SEEKER_MATCHES;
  return apiFetch('/match/me/retry-negotiate', { method: 'POST' });
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
  return apiFetch(`/negotiation/sessions/${sessionId}/rounds/decrypted`);
}

export async function getMatchContext(sessionId: string): Promise<MatchContext | null> {
  if (USE_DUMMY) return DUMMY_MATCH_CONTEXT[sessionId] ?? null;
  try {
    return await apiFetch<MatchContext>(`/negotiation/sessions/${sessionId}/match-context`);
  } catch {
    return null;
  }
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

export async function rejectAgreement(sessionId: string): Promise<void> {
  if (USE_DUMMY) return;
  await apiFetch(`/negotiation/sessions/${sessionId}/reject`, { method: 'POST' });
}

// === Agreement ===
export async function getAgreement(sessionId: string): Promise<AgreementRecord> {
  if (USE_DUMMY) return DUMMY_AGREEMENT;
  return apiFetch(`/agreement/${sessionId}`);
}

// === Interview Messages ===
export async function getInterviewMessages(sessionId: string): Promise<import('./types').InterviewMessage[]> {
  if (USE_DUMMY) return [];
  return apiFetch(`/agreement/${sessionId}/messages`);
}

export async function sendInterviewMessage(sessionId: string, content: string): Promise<import('./types').InterviewMessage> {
  if (USE_DUMMY) {
    return {
      id: `msg-${Date.now()}`,
      sessionId,
      senderId: 'dummy',
      sender: { id: 'dummy', nearAccountId: 'dummy.testnet', role: 'EMPLOYER' },
      content,
      createdAt: new Date().toISOString(),
    };
  }
  return apiFetch(`/agreement/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
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
