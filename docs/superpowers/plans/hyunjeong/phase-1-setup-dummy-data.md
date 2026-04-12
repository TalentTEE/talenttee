# Phase 1: 프로젝트 셋업 + 더미 데이터 + 타입 정의 (Day 1 오전)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Next.js + TypeScript + Tailwind CSS 프로젝트 구조 확립, 전체 타입 정의, 더미 데이터 8종 작성, API 레이어 + Auth 컨텍스트 구현
**선행:** 없음 (최우선)
**완료 기준:** `npm run dev` 정상 기동, 모든 타입 import 가능, 더미 데이터 기반 API 함수 동작
**예상 소요:** ~1시간

---

## Task 1.1: 프로젝트 구조 + 의존성 확인

**Files:**
- Verify: `frontend/package.json`

- [ ] **Step 1: 주요 의존성 확인**

```json
{
  "dependencies": {
    "next": "16.2.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "tailwindcss": "^4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0",
    "shadcn": "^4.2.0"
  }
}
```

- [ ] **Step 2: 개발 서버 기동 확인**

Run: `cd frontend && npm run dev`
Expected: http://localhost:3000 정상 기동

---

## Task 1.2: 전체 타입 정의

**Files:**
- Create: `frontend/src/lib/types.ts`

- [ ] **Step 1: 핵심 도메인 타입 작성**

모든 프론트엔드 페이지에서 사용할 타입을 한 파일에 정의한다.

```typescript
// frontend/src/lib/types.ts

export type UserRole = 'SEEKER' | 'EMPLOYER';

export interface User {
  id: string;
  nearAccountId: string;
  role: UserRole;
  publicKey: string;
  createdAt: string;
}

export interface DataSourceConnection {
  id: string;
  userId: string;
  provider: 'github' | 'slack' | 'discord' | 'gov24';
  status: 'CONNECTED' | 'MOCK' | 'DISCONNECTED';
  lastSyncAt: string | null;
}

export interface ResumeProfile {
  id: string;
  userId: string;
  status: 'COLLECTING' | 'ANALYZING' | 'COMPLETED';
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  marketValueMin: number | null;
  marketValueMax: number | null;
  marketValueReasoning: string | null;
  negotiationPoints: {
    strengths: string[];
    weaknesses: string[];
  } | null;
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  highlights: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  year: string;
}
```

- [ ] **Step 2: 채용공고 + 매칭 타입 작성**

```typescript
export interface JobPosting {
  id: string;
  employerId: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  salaryMin: number;
  salaryMax: number;
  remotePolicy: string;
  workingHours: string;
  benefits: string[];
  status: 'ACTIVE' | 'CLOSED';
  negotiationBoundary: NegotiationBoundary | null;
}

export interface NegotiationBoundary {
  salaryMin: number;
  salaryMax: number;
  salaryHardMax: number;
  remotePolicyOptions: string[];
  nonNegotiableItems: string[];
  flexibleItems: string[];
  negotiationStyle: 'conservative' | 'moderate' | 'aggressive';
}

export interface MatchResult {
  id: string;
  seekerId: string;
  jobId: string;
  annScore: number;
  rerankScore: number;
  finalRank: number;
  seekerAgreed: boolean;
  employerAgreed: boolean;
  seekerSkills: string[];
  seekerExperienceYears: string;
  jobTitle: string;
  companyName: string;
}
```

- [ ] **Step 3: 협상 + 합의 + 에스크로 + 챗 타입 작성**

```typescript
export type NegotiationState =
  | 'INITIATED' | 'EMPLOYER_OFFER' | 'SEEKER_COUNTER'
  | 'EMPLOYER_COUNTER' | 'AGREED' | 'FAILED' | 'MAX_ROUNDS';

export interface NegotiationSession {
  id: string;
  seekerId: string;
  employerId: string;
  jobId: string;
  state: NegotiationState;
  currentRound: number;
  maxRounds: number;
  onChainTxHash: string | null;
}

export interface NegotiationProposal {
  salary: number;
  remotePolicy: string;
  workingHours: string;
  title: string;
  startDate: string;
  probationMonths: number;
  signingBonus?: number;
  stockOptions?: string;
}

export interface NegotiationRound {
  id: string;
  sessionId: string;
  round: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  proposal: NegotiationProposal;
  reasoning: string;
  decision: 'COUNTER' | 'ACCEPT' | 'REJECT';
}

export interface AgreementRecord {
  sessionId: string;
  agreementHash: string;
  summary: {
    positionTitle: string;
    agreedSalary: number;
    startDate: string;
    negotiationRounds: number;
    remotePolicy: string;
    probationMonths: number;
  };
  seekerApproved: boolean;
  employerApproved: boolean;
  onChainTxHash: string | null;
}

export interface EscrowAccount {
  employerId: string;
  balance: number;
  agentKeySet: boolean;
}

export interface EscrowPayment {
  id: string;
  seekerId: string;
  amount: number;
  timestamp: string;
  txHash: string;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

export interface JobChatResponse {
  complete: boolean;
  question?: string;
  jobPosting?: JobPosting;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "feat: add comprehensive frontend type definitions"
```

---

## Task 1.3: 더미 데이터 8종 작성

**Files:**
- Create: `frontend/src/lib/dummy/user.ts`
- Create: `frontend/src/lib/dummy/datasources.ts`
- Create: `frontend/src/lib/dummy/resume.ts`
- Create: `frontend/src/lib/dummy/jobs.ts`
- Create: `frontend/src/lib/dummy/matches.ts`
- Create: `frontend/src/lib/dummy/profile-report.ts`
- Create: `frontend/src/lib/dummy/negotiation.ts`
- Create: `frontend/src/lib/dummy/agreement.ts`
- Create: `frontend/src/lib/dummy/escrow.ts`

- [ ] **Step 1: 사용자 더미 데이터 (Alice 구직자, Bob 채용담당자)**

```typescript
// frontend/src/lib/dummy/user.ts
import { User } from '../types';

export const DUMMY_ALICE: User = {
  id: 'user-1',
  nearAccountId: 'alice.testnet',
  role: 'SEEKER',
  publicKey: 'ed25519:ALICE_PUBLIC_KEY_PLACEHOLDER',
  createdAt: '2026-04-10T09:00:00Z',
};

export const DUMMY_BOB: User = {
  id: 'user-2',
  nearAccountId: 'bob.testnet',
  role: 'EMPLOYER',
  publicKey: 'ed25519:BOB_PUBLIC_KEY_PLACEHOLDER',
  createdAt: '2026-04-10T10:00:00Z',
};
```

- [ ] **Step 2: 데이터소스 더미 데이터**

```typescript
// frontend/src/lib/dummy/datasources.ts
import { DataSourceConnection } from '../types';

export const DUMMY_DATASOURCES: DataSourceConnection[] = [
  { id: 'ds-1', userId: 'user-1', provider: 'github', status: 'CONNECTED', lastSyncAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-2', userId: 'user-1', provider: 'slack', status: 'MOCK', lastSyncAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-3', userId: 'user-1', provider: 'discord', status: 'MOCK', lastSyncAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-4', userId: 'user-1', provider: 'gov24', status: 'MOCK', lastSyncAt: '2026-04-11T08:00:00Z' },
];
```

- [ ] **Step 3: 이력서 + 채용공고 + 매칭 + 프로필 리포트 더미 데이터**

`resume.ts` — 기술 스택, 경력, 학력, AI 요약, 시장가치 포함
`jobs.ts` — 2개 채용공고 (Senior Backend Engineer, Frontend Developer)
`matches.ts` — 구직자용/채용담당자용 매칭 결과 각 3건
`profile-report.ts` — 채용담당자가 열람하는 후보자 프로필 리포트

- [ ] **Step 4: 협상 + 합의 + 에스크로 더미 데이터**

```typescript
// frontend/src/lib/dummy/negotiation.ts
import { NegotiationSession, NegotiationRound } from '../types';

export const DUMMY_SESSIONS: NegotiationSession[] = [
  { id: 'session-1', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-1',
    state: 'EMPLOYER_COUNTER', currentRound: 3, maxRounds: 7, onChainTxHash: null },
  { id: 'session-2', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-2',
    state: 'AGREED', currentRound: 5, maxRounds: 7, onChainTxHash: '0xabc123def456' },
];

export const DUMMY_ROUNDS: NegotiationRound[] = [
  {
    id: 'round-1', sessionId: 'session-1', round: 1, actor: 'EMPLOYER_AGENT',
    proposal: { salary: 65000000, remotePolicy: '4 days office', workingHours: '09:00-18:00',
      title: 'Senior Backend Engineer', startDate: '2026-07-01', probationMonths: 3 },
    reasoning: 'Initial offer based on job posting. Salary at midpoint, 4 days in-office.',
    decision: 'COUNTER',
  },
  // ... 추가 라운드 데이터
];
```

```typescript
// frontend/src/lib/dummy/escrow.ts
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
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/dummy/
git commit -m "feat: add 8 dummy data files for all frontend domains"
```

---

## Task 1.4: API 레이어 (USE_DUMMY 플래그 기반)

**Files:**
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: 공통 유틸 + 더미 import**

```typescript
// frontend/src/lib/api.ts
import { User, DataSourceConnection, ResumeProfile, JobPosting, MatchResult,
  ProfileReport, NegotiationSession, NegotiationRound, AgreementRecord,
  EscrowAccount, EscrowPayment, ChatMessage, JobChatResponse } from './types';
import { DUMMY_ALICE, DUMMY_BOB } from './dummy/user';
import { DUMMY_DATASOURCES } from './dummy/datasources';
// ... 나머지 더미 import

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
```

- [ ] **Step 2: Auth API 함수**

```typescript
export async function getDummyUser(role: 'SEEKER' | 'EMPLOYER'): Promise<User> {
  return role === 'SEEKER' ? DUMMY_ALICE : DUMMY_BOB;
}
```

- [ ] **Step 3: 도메인별 API 함수 (더미/실제 분기)**

모든 API 함수에 `if (USE_DUMMY) return DUMMY_XXX;` 패턴을 적용한다.

```typescript
export async function getDatasourceStatus(): Promise<DataSourceConnection[]> {
  if (USE_DUMMY) return DUMMY_DATASOURCES;
  return apiFetch('/datasource/status');
}

export async function getResume(userId: string): Promise<ResumeProfile> {
  if (USE_DUMMY) return DUMMY_RESUME;
  return apiFetch(`/resume/${userId}`);
}

export async function getEscrowBalance(accountId?: string): Promise<EscrowAccount> {
  if (USE_DUMMY) return DUMMY_ESCROW;
  const data = await apiFetch<{ balance: string }>(`/escrow/balance?accountId=${accountId}`);
  return { employerId: accountId || '', balance: yoctoToNear(data.balance), agentKeySet: false };
}

// ... 총 20+ 함수 (getDatasourceStatus, connectDatasourceMock, getResume,
//     getJobs, chatCreateJob, getSeekerMatches, getEmployerMatches,
//     getNegotiationSessions, getNegotiationRounds, getAgreement,
//     getEscrowBalance, getEscrowPayments, depositToEscrow 등)
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add USE_DUMMY flag-based API layer with all domain functions"
```

---

## Task 1.5: AuthContext + AuthProvider

**Files:**
- Create: `frontend/src/lib/auth.tsx`

- [ ] **Step 1: AuthContext 인터페이스 정의 + Provider 구현**

```typescript
// frontend/src/lib/auth.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { getDummyUser } from './api';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => Promise<void>;
  loginWithNear: (nearAccountId: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  loginWithNear: async () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    setIsLoading(false);
  }, []);

  const login = async (role: UserRole) => {
    const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';
    if (USE_DUMMY) {
      const dummyUser = await getDummyUser(role);
      localStorage.setItem('user', JSON.stringify(dummyUser));
      localStorage.setItem('jwt', 'dummy-jwt-token');
      setUser(dummyUser);
    }
  };

  const loginWithNear = async (nearAccountId: string, role: UserRole) => {
    // Phase 5에서 구현 예정
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithNear, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/auth.tsx
git commit -m "feat: add AuthContext with dummy login support"
```

---

## Phase 1 완료 기준

- [ ] `npm run dev` → Next.js 개발 서버 정상 기동
- [ ] `types.ts` — 16개 이상 타입/인터페이스 정의 완료
- [ ] `dummy/` — 9개 더미 데이터 파일 작성 완료
- [ ] `api.ts` — USE_DUMMY 플래그 기반 20+ API 함수 동작
- [ ] `auth.tsx` — AuthContext + AuthProvider + useAuth 훅 동작
- [ ] 팀에 "Phase 1 완료 -- 타입/더미 데이터/API 레이어 사용 가능" 공유

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `frontend/src/lib/types.ts` | Create |
| `frontend/src/lib/dummy/user.ts` | Create |
| `frontend/src/lib/dummy/datasources.ts` | Create |
| `frontend/src/lib/dummy/resume.ts` | Create |
| `frontend/src/lib/dummy/jobs.ts` | Create |
| `frontend/src/lib/dummy/matches.ts` | Create |
| `frontend/src/lib/dummy/profile-report.ts` | Create |
| `frontend/src/lib/dummy/negotiation.ts` | Create |
| `frontend/src/lib/dummy/agreement.ts` | Create |
| `frontend/src/lib/dummy/escrow.ts` | Create |
| `frontend/src/lib/api.ts` | Create |
| `frontend/src/lib/auth.tsx` | Create |
