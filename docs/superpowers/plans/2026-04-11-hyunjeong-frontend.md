# 현정 Frontend 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NEAR AI Career Agent Platform의 전체 프론트엔드를 Next.js + TypeScript로 구현. 더미 데이터로 Day 2까지 전체 플로우 시연 가능하게 만들고, Day 3부터 실제 API 연결.

**Architecture:** Next.js App Router + TypeScript. shadcn/ui + Tailwind CSS로 UI 구성. `lib/api.ts`에서 `NEXT_PUBLIC_USE_DUMMY` 환경변수로 더미/실제 API를 스위칭. 인증은 JWT를 localStorage에 저장하고 fetch 요청에 Authorization 헤더로 전달.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, near-api-js, tweetnacl

---

## 파일 구조

```
frontend/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.local                          → NEXT_PUBLIC_USE_DUMMY=true, NEXT_PUBLIC_API_URL
├── src/
│   ├── app/
│   │   ├── layout.tsx                  → 루트 레이아웃 (AuthProvider 감싸기)
│   │   ├── page.tsx                    → 로그인 페이지
│   │   ├── dashboard/
│   │   │   ├── seeker/page.tsx         → 구직자 대시보드
│   │   │   └── employer/page.tsx       → 채용담당자 대시보드
│   │   ├── datasource/page.tsx         → 데이터소스 연결
│   │   ├── resume/page.tsx             → 이력서 상세
│   │   ├── jobs/
│   │   │   └── create/page.tsx         → 대화형 공고 작성
│   │   ├── escrow/page.tsx             → 에스크로 예치
│   │   ├── negotiation/
│   │   │   ├── [sessionId]/page.tsx    → 협상 모니터링
│   │   │   └── [sessionId]/agree/page.tsx → 합의 확인
│   │   └── matching/page.tsx           → 매칭 결과
│   ├── components/
│   │   ├── ui/                         → shadcn/ui 컴포넌트
│   │   ├── layout/
│   │   │   ├── header.tsx              → 헤더 (지갑 주소 + 로그아웃)
│   │   │   └── sidebar.tsx             → 사이드바 네비게이션
│   │   ├── auth/
│   │   │   └── login-selector.tsx      → 더미 모드 Alice/Bob 선택
│   │   ├── dashboard/
│   │   │   ├── datasource-status.tsx   → 데이터소스 연결 상태 카드
│   │   │   ├── resume-summary.tsx      → 이력서 요약 카드
│   │   │   ├── market-value-card.tsx   → 시장가치 카드
│   │   │   ├── match-list.tsx          → 매칭 목록 카드
│   │   │   ├── negotiation-list.tsx    → 진행 중 협상 목록
│   │   │   ├── escrow-balance.tsx      → 에스크로 잔액 카드
│   │   │   └── job-list.tsx            → 내 공고 목록 카드
│   │   ├── resume/
│   │   │   ├── generation-progress.tsx → 이력서 생성 프로그레스
│   │   │   └── resume-detail.tsx       → 이력서 상세 표시
│   │   ├── jobs/
│   │   │   ├── chat-ui.tsx             → 대화형 공고 작성 채팅
│   │   │   └── job-form.tsx            → 공고 직접 입력 폼
│   │   ├── negotiation/
│   │   │   ├── round-card.tsx          → 협상 라운드 카드
│   │   │   ├── intervention-input.tsx  → 사용자 개입 입력
│   │   │   └── agreement-detail.tsx    → 합의 내용 표시
│   │   └── matching/
│   │       ├── match-card.tsx          → 매칭 결과 카드
│   │       └── profile-report.tsx      → 상세 프로필 리포트
│   ├── lib/
│   │   ├── api.ts                      → API 호출 (더미/실제 스위칭)
│   │   ├── auth.tsx                    → AuthContext + AuthProvider
│   │   ├── types.ts                    → 공유 타입 정의
│   │   └── dummy/
│   │       ├── user.ts
│   │       ├── resume.ts
│   │       ├── datasources.ts
│   │       ├── jobs.ts
│   │       ├── matches.ts
│   │       ├── profile-report.ts
│   │       ├── negotiation.ts
│   │       ├── agreement.ts
│   │       └── escrow.ts
│   └── styles/
│       └── globals.css                 → Tailwind 기본 스타일
```

---

## Task 1: Next.js 프로젝트 초기화 + Tailwind + shadcn/ui 설정

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/src/styles/globals.css`
- Create: `frontend/.env.local`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 2: shadcn/ui 초기화**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npx shadcn@latest init -d
```

- [ ] **Step 3: 필요한 shadcn/ui 컴포넌트 설치**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npx shadcn@latest add button card badge input textarea tabs progress avatar separator scroll-area dialog alert
```

- [ ] **Step 4: .env.local 생성**

```env
NEXT_PUBLIC_USE_DUMMY=true
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 5: 빌드 확인**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npm run build
```
Expected: 빌드 성공

- [ ] **Step 6: Commit**

```bash
cd /Users/sooondae/projects/talent-tee
git add frontend/
git commit -m "feat: initialize Next.js frontend with Tailwind + shadcn/ui"
```

---

## Task 2: 공유 타입 정의

**Files:**
- Create: `frontend/src/lib/types.ts`

- [ ] **Step 1: 타입 정의 파일 작성**

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
  // 기본 정보 (무료)
  seekerSkills: string[];
  seekerExperienceYears: string;
  jobTitle: string;
  companyName: string;
}

export interface ProfileReport {
  seekerId: string;
  technicalSkills: { skill: string; level: string; experience: string }[];
  projects: { name: string; role: string; impact: string }[];
  collaboration: { metric: string; value: string }[];
  growthCurve: { period: string; skills: string[] }[];
  certifications: string[];
  marketValueRange: string;
}

export type NegotiationState =
  | 'INITIATED'
  | 'EMPLOYER_OFFER'
  | 'SEEKER_COUNTER'
  | 'EMPLOYER_COUNTER'
  | 'AGREED'
  | 'FAILED'
  | 'MAX_ROUNDS';

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

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npx tsc --noEmit
```
Expected: 타입 에러 없음

- [ ] **Step 3: Commit**

```bash
cd /Users/sooondae/projects/talent-tee
git add frontend/src/lib/types.ts
git commit -m "feat: add shared TypeScript type definitions"
```

---

## Task 3: 더미 데이터 전체 작성

**Files:**
- Create: `frontend/src/lib/dummy/user.ts`
- Create: `frontend/src/lib/dummy/resume.ts`
- Create: `frontend/src/lib/dummy/datasources.ts`
- Create: `frontend/src/lib/dummy/jobs.ts`
- Create: `frontend/src/lib/dummy/matches.ts`
- Create: `frontend/src/lib/dummy/profile-report.ts`
- Create: `frontend/src/lib/dummy/negotiation.ts`
- Create: `frontend/src/lib/dummy/agreement.ts`
- Create: `frontend/src/lib/dummy/escrow.ts`

- [ ] **Step 1: user.ts 작성**

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

- [ ] **Step 2: datasources.ts 작성**

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

- [ ] **Step 3: resume.ts 작성**

```typescript
// frontend/src/lib/dummy/resume.ts
import { ResumeProfile } from '../types';

export const DUMMY_RESUME: ResumeProfile = {
  id: 'resume-1',
  userId: 'user-1',
  status: 'COMPLETED',
  skills: ['TypeScript', 'React', 'Next.js', 'NestJS', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
  experience: [
    {
      role: 'Full-stack Developer',
      company: 'Tech Corp',
      period: '2023.03 - 현재',
      highlights: ['Next.js 기반 SaaS 플랫폼 개발', 'NestJS API 서버 설계/구현', 'PostgreSQL 쿼리 최적화'],
    },
    {
      role: 'Frontend Developer',
      company: 'StartupX',
      period: '2021.06 - 2023.02',
      highlights: ['React + TypeScript 마이그레이션 리드', '디자인 시스템 구축', '성능 최적화 LCP 40% 개선'],
    },
  ],
  education: [
    { degree: '컴퓨터공학 학사', institution: '서울대학교', year: '2021' },
  ],
  summary: 'TypeScript 풀스택 개발자. React/Next.js 프론트엔드와 NestJS 백엔드 경험 3년. 오픈소스 기여 활발.',
  strengths: ['TypeScript 풀스택 역량', '오픈소스 기여 (GitHub 500+ contributions)', 'SaaS 서비스 경험'],
  improvementAreas: ['대규모 트래픽 경험 부족', '모바일 개발 경험 없음'],
  marketValueMin: 60000000,
  marketValueMax: 75000000,
  marketValueReasoning: 'TypeScript 풀스택 3년 경력, 오픈소스 활동, SaaS 경험 기반. 유사 포지션 평균 연봉 6,500만원 대비 상위 포지셔닝.',
  negotiationPoints: {
    strengths: ['TypeScript 풀스택 희소성 높음', '오픈소스 기여로 기술 검증됨', 'SaaS 서비스 운영 경험'],
    weaknesses: ['대규모 트래픽 운영 경험 부족', '리더십/매니지먼트 경험 없음'],
  },
};
```

- [ ] **Step 4: jobs.ts 작성**

```typescript
// frontend/src/lib/dummy/jobs.ts
import { JobPosting } from '../types';

export const DUMMY_JOBS: JobPosting[] = [
  {
    id: 'job-1',
    employerId: 'user-2',
    title: 'Senior Backend Developer',
    description: 'NestJS 기반 백엔드 서비스 개발. 마이크로서비스 아키텍처 설계 및 구현.',
    requiredSkills: ['TypeScript', 'NestJS', 'PostgreSQL'],
    preferredSkills: ['Docker', 'Kubernetes', 'Redis'],
    salaryMin: 60000000,
    salaryMax: 80000000,
    remotePolicy: '주3일 출근',
    workingHours: '09:00-18:00 유연근무',
    benefits: ['스톡옵션', '점심 지원', '교육비 지원'],
    status: 'ACTIVE',
    negotiationBoundary: {
      salaryMin: 60000000,
      salaryMax: 75000000,
      salaryHardMax: 85000000,
      remotePolicyOptions: ['주3일 출근', '주2일 출근', '풀리모트'],
      nonNegotiableItems: ['수습기간 3개월'],
      flexibleItems: ['시작일', '원격근무 비율', '사이닝 보너스'],
      negotiationStyle: 'moderate',
    },
  },
  {
    id: 'job-2',
    employerId: 'user-2',
    title: 'Full-stack Developer',
    description: 'React + NestJS 풀스택 개발. 신규 서비스 MVP 구축.',
    requiredSkills: ['React', 'TypeScript', 'Node.js'],
    preferredSkills: ['Next.js', 'GraphQL'],
    salaryMin: 55000000,
    salaryMax: 70000000,
    remotePolicy: '풀리모트',
    workingHours: '자유 근무',
    benefits: ['스톡옵션', '재택근무 장비 지원'],
    status: 'ACTIVE',
    negotiationBoundary: null,
  },
  {
    id: 'job-3',
    employerId: 'user-2',
    title: 'DevOps Engineer',
    description: 'Kubernetes 클러스터 관리. CI/CD 파이프라인 구축.',
    requiredSkills: ['Kubernetes', 'Docker', 'AWS'],
    preferredSkills: ['Terraform', 'Go'],
    salaryMin: 65000000,
    salaryMax: 85000000,
    remotePolicy: '주2일 출근',
    workingHours: '09:00-18:00',
    benefits: ['스톡옵션', 'AWS 자격증 지원'],
    status: 'ACTIVE',
    negotiationBoundary: null,
  },
];
```

- [ ] **Step 5: matches.ts 작성**

```typescript
// frontend/src/lib/dummy/matches.ts
import { MatchResult } from '../types';

export const DUMMY_SEEKER_MATCHES: MatchResult[] = [
  { id: 'match-1', seekerId: 'user-1', jobId: 'job-1', annScore: 0.92, rerankScore: 0.87, finalRank: 1, seekerAgreed: false, employerAgreed: false, seekerSkills: ['TypeScript', 'NestJS', 'PostgreSQL'], seekerExperienceYears: '3-5년', jobTitle: 'Senior Backend Developer', companyName: 'Company A' },
  { id: 'match-2', seekerId: 'user-1', jobId: 'job-2', annScore: 0.88, rerankScore: 0.85, finalRank: 2, seekerAgreed: false, employerAgreed: false, seekerSkills: ['React', 'TypeScript', 'Node.js'], seekerExperienceYears: '3-5년', jobTitle: 'Full-stack Developer', companyName: 'Company B' },
  { id: 'match-3', seekerId: 'user-1', jobId: 'job-3', annScore: 0.75, rerankScore: 0.70, finalRank: 3, seekerAgreed: false, employerAgreed: false, seekerSkills: ['Docker', 'AWS'], seekerExperienceYears: '3-5년', jobTitle: 'DevOps Engineer', companyName: 'Company C' },
];

export const DUMMY_EMPLOYER_MATCHES: MatchResult[] = [
  { id: 'match-1', seekerId: 'user-1', jobId: 'job-1', annScore: 0.92, rerankScore: 0.87, finalRank: 1, seekerAgreed: false, employerAgreed: false, seekerSkills: ['TypeScript', 'React', 'NestJS'], seekerExperienceYears: '3-5년', jobTitle: 'Senior Backend Developer', companyName: 'Company A' },
  { id: 'match-4', seekerId: 'user-3', jobId: 'job-1', annScore: 0.85, rerankScore: 0.82, finalRank: 2, seekerAgreed: false, employerAgreed: false, seekerSkills: ['Go', 'Kubernetes', 'Docker'], seekerExperienceYears: '5-10년', jobTitle: 'Senior Backend Developer', companyName: 'Company A' },
];
```

- [ ] **Step 6: profile-report.ts 작성**

```typescript
// frontend/src/lib/dummy/profile-report.ts
import { ProfileReport } from '../types';

export const DUMMY_PROFILE_REPORT: ProfileReport = {
  seekerId: 'user-1',
  technicalSkills: [
    { skill: 'TypeScript', level: 'Expert', experience: '3년+' },
    { skill: 'React', level: 'Advanced', experience: '3년' },
    { skill: 'NestJS', level: 'Advanced', experience: '2년' },
    { skill: 'PostgreSQL', level: 'Intermediate', experience: '2년' },
    { skill: 'Docker', level: 'Intermediate', experience: '1년' },
  ],
  projects: [
    { name: 'SaaS Dashboard', role: 'Lead Frontend', impact: 'LCP 40% 개선, DAU 2x 증가' },
    { name: 'API Gateway', role: 'Backend Developer', impact: '응답 시간 200ms → 50ms' },
    { name: 'Design System', role: 'Creator & Maintainer', impact: '팀 전체 UI 일관성 확보' },
  ],
  collaboration: [
    { metric: '코드 리뷰 참여', value: '주 15건 평균' },
    { metric: 'PR 머지율', value: '94%' },
    { metric: '기술 토론 참여', value: '주 5회 평균' },
  ],
  growthCurve: [
    { period: '2021', skills: ['JavaScript', 'React'] },
    { period: '2022', skills: ['TypeScript', 'Next.js', 'Testing'] },
    { period: '2023', skills: ['NestJS', 'PostgreSQL', 'Docker'] },
    { period: '2024-현재', skills: ['AWS', 'CI/CD', 'Architecture'] },
  ],
  certifications: ['정보처리기사', 'AWS Solutions Architect Associate'],
  marketValueRange: '6,000만 ~ 7,500만원',
};
```

- [ ] **Step 7: negotiation.ts 작성**

```typescript
// frontend/src/lib/dummy/negotiation.ts
import { NegotiationSession, NegotiationRound } from '../types';

export const DUMMY_SESSIONS: NegotiationSession[] = [
  { id: 'session-1', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-1', state: 'EMPLOYER_COUNTER', currentRound: 3, maxRounds: 7, onChainTxHash: null },
  { id: 'session-2', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-2', state: 'AGREED', currentRound: 5, maxRounds: 7, onChainTxHash: '0xabc123def456' },
];

export const DUMMY_ROUNDS: NegotiationRound[] = [
  {
    id: 'round-1',
    sessionId: 'session-1',
    round: 1,
    actor: 'EMPLOYER_AGENT',
    proposal: { salary: 65000000, remotePolicy: '주4일 출근', workingHours: '09:00-18:00', title: 'Senior Backend Engineer', startDate: '2026-07-01', probationMonths: 3 },
    reasoning: '공고 기준 초기 오퍼입니다. 연봉 6,500만원은 공고 중간값이며, 주4일 출근 조건을 제시합니다.',
    decision: 'COUNTER',
  },
  {
    id: 'round-2',
    sessionId: 'session-1',
    round: 2,
    actor: 'SEEKER_AGENT',
    proposal: { salary: 70000000, remotePolicy: '주3일 출근', workingHours: '09:00-18:00 유연근무', title: 'Senior Backend Engineer', startDate: '2026-07-01', probationMonths: 3, signingBonus: 3000000 },
    reasoning: '시장가치 분석 기반 적정 연봉 상위권 제안. 출근일 축소 및 사이닝 보너스 요청.',
    decision: 'COUNTER',
  },
  {
    id: 'round-3',
    sessionId: 'session-1',
    round: 3,
    actor: 'EMPLOYER_AGENT',
    proposal: { salary: 68000000, remotePolicy: '주3일 출근', workingHours: '09:00-18:00 유연근무', title: 'Senior Backend Engineer', startDate: '2026-07-15', probationMonths: 3, signingBonus: 2000000 },
    reasoning: '연봉 6,800만원으로 상향. 주3일 출근 수용. 사이닝 보너스 200만원으로 조정.',
    decision: 'COUNTER',
  },
];
```

- [ ] **Step 8: agreement.ts 작성**

```typescript
// frontend/src/lib/dummy/agreement.ts
import { AgreementRecord } from '../types';

export const DUMMY_AGREEMENT: AgreementRecord = {
  sessionId: 'session-2',
  agreementHash: 'sha256:a1b2c3d4e5f6...',
  summary: {
    positionTitle: 'Full-stack Developer',
    agreedSalary: 65000000,
    startDate: '2026-08-01',
    negotiationRounds: 5,
    remotePolicy: '풀리모트',
    probationMonths: 3,
  },
  seekerApproved: true,
  employerApproved: true,
  onChainTxHash: '0xabc123def456',
};
```

- [ ] **Step 9: escrow.ts 작성**

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

- [ ] **Step 10: 빌드 확인**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npx tsc --noEmit
```

- [ ] **Step 11: Commit**

```bash
cd /Users/sooondae/projects/talent-tee
git add frontend/src/lib/dummy/ frontend/src/lib/types.ts
git commit -m "feat: add dummy data and shared types for all frontend pages"
```

---

## Task 4: API 레이어 + AuthContext 구현

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/auth.tsx`

- [ ] **Step 1: api.ts 작성**

```typescript
// frontend/src/lib/api.ts
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
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...authHeaders(), ...options?.headers } });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// Auth
export async function getDummyUser(role: 'SEEKER' | 'EMPLOYER'): Promise<User> {
  return role === 'SEEKER' ? DUMMY_ALICE : DUMMY_BOB;
}

// Datasource
export async function getDatasourceStatus(): Promise<DataSourceConnection[]> {
  if (USE_DUMMY) return DUMMY_DATASOURCES;
  return apiFetch('/datasource/status');
}

export async function connectDatasourceMock(provider: string): Promise<DataSourceConnection> {
  if (USE_DUMMY) {
    return { id: `ds-new`, userId: 'user-1', provider: provider as DataSourceConnection['provider'], status: 'MOCK', lastSyncAt: new Date().toISOString() };
  }
  return apiFetch('/datasource/connect/mock', { method: 'POST', body: JSON.stringify({ provider }) });
}

// Resume
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

// Jobs
export async function getJobs(): Promise<JobPosting[]> {
  if (USE_DUMMY) return DUMMY_JOBS;
  return apiFetch('/jobs');
}

export async function chatCreateJob(messages: ChatMessage[]): Promise<JobChatResponse> {
  if (USE_DUMMY) {
    const lastMsg = messages[messages.length - 1];
    if (messages.length >= 6) {
      return { complete: true, jobPosting: DUMMY_JOBS[0] };
    }
    const questions = [
      '어떤 포지션을 채용하시나요?',
      '필수 기술스택은 무엇인가요?',
      '경력 요구사항은요?',
      '연봉 범위는 어떻게 되나요?',
      '원격근무 가능한가요?',
      '기타 복리후생이 있나요?',
    ];
    return { complete: false, question: questions[Math.min(messages.length, questions.length - 1)] };
  }
  return apiFetch('/jobs/chat', { method: 'POST', body: JSON.stringify({ messages }) });
}

// Matching
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

// Profile
export async function accessProfile(seekerId: string): Promise<ProfileReport> {
  if (USE_DUMMY) return DUMMY_PROFILE_REPORT;
  return apiFetch(`/profile/${seekerId}/access`, { method: 'POST' });
}

// Negotiation
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
  await apiFetch(`/negotiation/sessions/${sessionId}/intervene`, { method: 'POST', body: JSON.stringify({ direction, applyFromRound: 'next' }) });
}

export async function approveAgreement(sessionId: string): Promise<void> {
  if (USE_DUMMY) return;
  await apiFetch(`/negotiation/sessions/${sessionId}/approve`, { method: 'POST' });
}

// Agreement
export async function getAgreement(sessionId: string): Promise<AgreementRecord> {
  if (USE_DUMMY) return DUMMY_AGREEMENT;
  return apiFetch(`/agreement/${sessionId}`);
}

// Escrow
export async function getEscrowBalance(): Promise<EscrowAccount> {
  if (USE_DUMMY) return DUMMY_ESCROW;
  return apiFetch('/escrow/balance');
}

export async function getEscrowPayments(): Promise<EscrowPayment[]> {
  if (USE_DUMMY) return DUMMY_ESCROW_PAYMENTS;
  return apiFetch('/escrow/payments');
}
```

- [ ] **Step 2: auth.tsx 작성**

```typescript
// frontend/src/lib/auth.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { getDummyUser } from './api';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
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
    // TODO: 실제 NEAR 지갑 로그인은 Day 3에 구현
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd /Users/sooondae/projects/talent-tee
git add frontend/src/lib/api.ts frontend/src/lib/auth.tsx
git commit -m "feat: add API layer with dummy/real switching and AuthContext"
```

---

## Task 5: 레이아웃 + 로그인 페이지

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/components/layout/header.tsx`
- Create: `frontend/src/components/layout/sidebar.tsx`
- Create: `frontend/src/components/auth/login-selector.tsx`

- [ ] **Step 1: layout.tsx 수정 — AuthProvider 감싸기**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NEAR AI Career Agent',
  description: 'AI 에이전트가 대신 협상하는 채용 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: login-selector.tsx 작성 — 더미 모드 Alice/Bob 선택**

```tsx
// frontend/src/components/auth/login-selector.tsx
'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginSelector() {
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (role: 'SEEKER' | 'EMPLOYER') => {
    await login(role);
    router.push(role === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-4xl font-bold">NEAR AI Career Agent</h1>
      <p className="text-muted-foreground">AI 에이전트가 대신 협상하는 채용 플랫폼</p>
      <div className="flex gap-4">
        <Card className="w-64 cursor-pointer hover:border-primary" onClick={() => handleLogin('SEEKER')}>
          <CardHeader>
            <CardTitle>Alice (구직자)</CardTitle>
            <CardDescription>alice.testnet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">구직자로 로그인</Button>
          </CardContent>
        </Card>
        <Card className="w-64 cursor-pointer hover:border-primary" onClick={() => handleLogin('EMPLOYER')}>
          <CardHeader>
            <CardTitle>Bob (채용담당자)</CardTitle>
            <CardDescription>bob.testnet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">채용담당자로 로그인</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: page.tsx (루트) 수정 — 로그인 페이지**

```tsx
// frontend/src/app/page.tsx
import { LoginSelector } from '@/components/auth/login-selector';

export default function HomePage() {
  return <LoginSelector />;
}
```

- [ ] **Step 4: header.tsx 작성**

```tsx
// frontend/src/components/layout/header.tsx
'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) return null;

  return (
    <header className="border-b px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-lg">NEAR AI Career Agent</h2>
        <Badge variant={user.role === 'SEEKER' ? 'default' : 'secondary'}>
          {user.role === 'SEEKER' ? '구직자' : '채용담당자'}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user.nearAccountId}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>로그아웃</Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: sidebar.tsx 작성**

```tsx
// frontend/src/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const seekerLinks = [
  { href: '/dashboard/seeker', label: '대시보드' },
  { href: '/datasource', label: '데이터소스' },
  { href: '/resume', label: '이력서' },
  { href: '/matching', label: '매칭 결과' },
];

const employerLinks = [
  { href: '/dashboard/employer', label: '대시보드' },
  { href: '/jobs/create', label: '공고 작성' },
  { href: '/escrow', label: '에스크로' },
  { href: '/matching', label: '매칭 결과' },
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const links = user?.role === 'SEEKER' ? seekerLinks : employerLinks;

  return (
    <aside className="w-56 border-r min-h-screen p-4">
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'px-3 py-2 rounded-md text-sm hover:bg-accent',
              pathname === link.href && 'bg-accent font-medium'
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 6: 빌드 확인**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npm run build
```

- [ ] **Step 7: Commit**

```bash
cd /Users/sooondae/projects/talent-tee
git add frontend/src/app/ frontend/src/components/
git commit -m "feat: add login page, header, sidebar layout"
```

---

## Task 6: 구직자 대시보드

**Files:**
- Create: `frontend/src/app/dashboard/seeker/page.tsx`
- Create: `frontend/src/app/dashboard/layout.tsx`
- Create: `frontend/src/components/dashboard/datasource-status.tsx`
- Create: `frontend/src/components/dashboard/resume-summary.tsx`
- Create: `frontend/src/components/dashboard/market-value-card.tsx`
- Create: `frontend/src/components/dashboard/match-list.tsx`
- Create: `frontend/src/components/dashboard/negotiation-list.tsx`

- [ ] **Step 1: dashboard/layout.tsx 작성 — 공통 대시보드 레이아웃**

```tsx
// frontend/src/app/dashboard/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: datasource-status.tsx 작성**

```tsx
// frontend/src/components/dashboard/datasource-status.tsx
'use client';

import { DataSourceConnection } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const providerLabels: Record<string, string> = { github: 'GitHub', slack: 'Slack', discord: 'Discord', gov24: '정부24' };

export function DatasourceStatus({ connections }: { connections: DataSourceConnection[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">데이터소스 연결 상태</CardTitle>
        <Link href="/datasource"><Button variant="outline" size="sm">+ 데이터소스 추가</Button></Link>
      </CardHeader>
      <CardContent className="flex gap-2 flex-wrap">
        {connections.map((c) => (
          <Badge key={c.id} variant={c.status !== 'DISCONNECTED' ? 'default' : 'secondary'}>
            {providerLabels[c.provider] || c.provider} {c.status !== 'DISCONNECTED' ? '✓' : '✗'}
          </Badge>
        ))}
        {connections.length === 0 && <p className="text-sm text-muted-foreground">연결된 데이터소스가 없습니다.</p>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: resume-summary.tsx 작성**

```tsx
// frontend/src/components/dashboard/resume-summary.tsx
'use client';

import { ResumeProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function ResumeSummary({ resume }: { resume: ResumeProfile | null }) {
  if (!resume) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">내 이력서</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">아직 이력서가 없습니다.</p>
          <Button size="sm">이력서 생성</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">내 이력서</CardTitle>
        <Badge variant={resume.status === 'COMPLETED' ? 'default' : 'secondary'}>
          {resume.status === 'COMPLETED' ? '완성 ✓' : resume.status === 'ANALYZING' ? '분석 중...' : '수집 중...'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          {resume.skills.slice(0, 6).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
          {resume.skills.length > 6 && <Badge variant="outline">+{resume.skills.length - 6}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">경력: {resume.experience.length > 0 ? resume.experience[0].period : '-'}</p>
        <div className="flex gap-2">
          <Link href="/resume"><Button size="sm" variant="outline">이력서 상세 보기</Button></Link>
          <Button size="sm" variant="ghost">이력서 재생성</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: market-value-card.tsx 작성**

```tsx
// frontend/src/components/dashboard/market-value-card.tsx
'use client';

import { ResumeProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatSalary(val: number): string {
  return `${(val / 10000).toLocaleString()}만원`;
}

export function MarketValueCard({ resume }: { resume: ResumeProfile | null }) {
  if (!resume || !resume.marketValueMin) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">시장가치</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-lg font-semibold">
          적정 연봉: {formatSalary(resume.marketValueMin)} ~ {formatSalary(resume.marketValueMax!)}
        </p>
        {resume.negotiationPoints && (
          <div className="text-sm text-muted-foreground">
            <p>강점: {resume.negotiationPoints.strengths.join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: match-list.tsx 작성**

```tsx
// frontend/src/components/dashboard/match-list.tsx
'use client';

import { MatchResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function MatchList({ matches, role }: { matches: MatchResult[]; role: 'SEEKER' | 'EMPLOYER' }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">매칭 {role === 'SEEKER' ? '공고' : '후보자'} (Top-{matches.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {matches.map((m, i) => (
          <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
            <div>
              <p className="text-sm font-medium">{i + 1}. {m.jobTitle} - {m.companyName}</p>
              <div className="flex gap-1 mt-1">
                {m.seekerSkills.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                <Badge variant="secondary" className="text-xs">매칭 {Math.round(m.rerankScore * 100)}%</Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm">동의</Button>
              <Button size="sm" variant="ghost">거절</Button>
            </div>
          </div>
        ))}
        {matches.length === 0 && <p className="text-sm text-muted-foreground">매칭 결과가 없습니다.</p>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: negotiation-list.tsx 작성**

```tsx
// frontend/src/components/dashboard/negotiation-list.tsx
'use client';

import { NegotiationSession } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function NegotiationList({ sessions }: { sessions: NegotiationSession[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">진행 중인 협상</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0">
            <div>
              <p className="text-sm font-medium">Session {s.id}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={s.state === 'AGREED' ? 'default' : 'secondary'}>
                  {s.state === 'AGREED' ? '합의 완료 ✓' : `Round ${s.currentRound}/${s.maxRounds} 진행 중`}
                </Badge>
              </div>
            </div>
            <Link href={s.state === 'AGREED' ? `/negotiation/${s.id}/agree` : `/negotiation/${s.id}`}>
              <Button size="sm" variant="outline">
                {s.state === 'AGREED' ? '결과 보기' : '모니터링'}
              </Button>
            </Link>
          </div>
        ))}
        {sessions.length === 0 && <p className="text-sm text-muted-foreground">진행 중인 협상이 없습니다.</p>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7: seeker/page.tsx 작성**

```tsx
// frontend/src/app/dashboard/seeker/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, getResume, getSeekerMatches, getNegotiationSessions } from '@/lib/api';
import { DataSourceConnection, ResumeProfile, MatchResult, NegotiationSession } from '@/lib/types';
import { DatasourceStatus } from '@/components/dashboard/datasource-status';
import { ResumeSummary } from '@/components/dashboard/resume-summary';
import { MarketValueCard } from '@/components/dashboard/market-value-card';
import { MatchList } from '@/components/dashboard/match-list';
import { NegotiationList } from '@/components/dashboard/negotiation-list';

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [datasources, setDatasources] = useState<DataSourceConnection[]>([]);
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);

  useEffect(() => {
    if (!user) return;
    getDatasourceStatus().then(setDatasources);
    getResume(user.id).then(setResume).catch(() => setResume(null));
    getSeekerMatches(user.id).then(setMatches);
    getNegotiationSessions().then(setSessions);
  }, [user]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">구직자 대시보드</h1>
      <DatasourceStatus connections={datasources} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResumeSummary resume={resume} />
        <MarketValueCard resume={resume} />
      </div>
      <MatchList matches={matches} role="SEEKER" />
      <NegotiationList sessions={sessions} />
    </div>
  );
}
```

- [ ] **Step 8: 빌드 확인**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npm run build
```

- [ ] **Step 9: Commit**

```bash
cd /Users/sooondae/projects/talent-tee
git add frontend/src/
git commit -m "feat: add seeker dashboard with datasource, resume, match, negotiation cards"
```

---

## Task 7: 채용담당자 대시보드

**Files:**
- Create: `frontend/src/app/dashboard/employer/page.tsx`
- Create: `frontend/src/components/dashboard/escrow-balance.tsx`
- Create: `frontend/src/components/dashboard/job-list.tsx`

- [ ] **Step 1: escrow-balance.tsx 작성**

```tsx
// frontend/src/components/dashboard/escrow-balance.tsx
'use client';

import { EscrowAccount } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function EscrowBalance({ escrow }: { escrow: EscrowAccount | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">에스크로 잔액</CardTitle>
        <Link href="/escrow"><Button size="sm" variant="outline">추가 예치</Button></Link>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{escrow?.balance ?? 0} NEAR</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: job-list.tsx 작성**

```tsx
// frontend/src/components/dashboard/job-list.tsx
'use client';

import { JobPosting } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function JobList({ jobs }: { jobs: JobPosting[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">내 채용공고</CardTitle>
        <Link href="/jobs/create"><Button size="sm">+ 새 공고 작성</Button></Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.map((j) => (
          <div key={j.id} className="flex items-center justify-between border-b pb-2 last:border-0">
            <div>
              <p className="text-sm font-medium">{j.title}</p>
              <Badge variant={j.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">{j.status}</Badge>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline">수정</Button>
              <Button size="sm" variant="ghost">마감</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: employer/page.tsx 작성**

```tsx
// frontend/src/app/dashboard/employer/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getEscrowBalance, getJobs, getEmployerMatches, getNegotiationSessions } from '@/lib/api';
import { EscrowAccount, JobPosting, MatchResult, NegotiationSession } from '@/lib/types';
import { EscrowBalance } from '@/components/dashboard/escrow-balance';
import { JobList } from '@/components/dashboard/job-list';
import { MatchList } from '@/components/dashboard/match-list';
import { NegotiationList } from '@/components/dashboard/negotiation-list';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);

  useEffect(() => {
    if (!user) return;
    getEscrowBalance().then(setEscrow);
    getJobs().then(setJobs);
    getEmployerMatches('job-1').then(setMatches);
    getNegotiationSessions().then(setSessions);
  }, [user]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">채용담당자 대시보드</h1>
      <EscrowBalance escrow={escrow} />
      <JobList jobs={jobs} />
      <MatchList matches={matches} role="EMPLOYER" />
      <NegotiationList sessions={sessions} />
    </div>
  );
}
```

- [ ] **Step 4: 빌드 확인**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /Users/sooondae/projects/talent-tee
git add frontend/src/
git commit -m "feat: add employer dashboard with escrow, jobs, match, negotiation cards"
```

---

## Task 8: 데이터소스 연결 페이지

**Files:**
- Create: `frontend/src/app/datasource/page.tsx`
- Create: `frontend/src/app/datasource/layout.tsx`

- [ ] **Step 1: datasource/layout.tsx 작성**

```tsx
// frontend/src/app/datasource/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DatasourceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: datasource/page.tsx 작성**

```tsx
// frontend/src/app/datasource/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getDatasourceStatus, connectDatasourceMock } from '@/lib/api';
import { DataSourceConnection } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PROVIDERS = [
  { id: 'github', label: 'GitHub', description: 'OAuth로 실제 연결', mock: false },
  { id: 'slack', label: 'Slack', description: 'Mock 연결', mock: true },
  { id: 'discord', label: 'Discord', description: 'Mock 연결', mock: true },
  { id: 'gov24', label: '정부24', description: 'Mock 연결 (자격증/학력)', mock: true },
];

export default function DatasourcePage() {
  const [connections, setConnections] = useState<DataSourceConnection[]>([]);

  useEffect(() => {
    getDatasourceStatus().then(setConnections);
  }, []);

  const isConnected = (provider: string) => connections.some((c) => c.provider === provider && c.status !== 'DISCONNECTED');

  const handleConnect = async (provider: string, mock: boolean) => {
    if (mock) {
      const newConn = await connectDatasourceMock(provider);
      setConnections((prev) => [...prev, newConn]);
    }
    // TODO: GitHub OAuth redirect (Day 3)
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">데이터소스 연결</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDERS.map((p) => {
          const connected = isConnected(p.id);
          const conn = connections.find((c) => c.provider === p.id);
          return (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{p.label}</CardTitle>
                <Badge variant={connected ? 'default' : 'secondary'}>{connected ? '연결됨' : '미연결'}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                {connected ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">마지막 동기화: {conn?.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString('ko') : '-'}</span>
                    <Button size="sm" variant="outline">동기화</Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => handleConnect(p.id, p.mock)}>연결하기</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인 + Commit**

```bash
cd /Users/sooondae/projects/talent-tee/frontend && npm run build
cd /Users/sooondae/projects/talent-tee
git add frontend/src/app/datasource/
git commit -m "feat: add datasource connection page with mock connect support"
```

---

## Task 9: 이력서 상세 페이지

**Files:**
- Create: `frontend/src/app/resume/page.tsx`
- Create: `frontend/src/app/resume/layout.tsx`
- Create: `frontend/src/components/resume/generation-progress.tsx`
- Create: `frontend/src/components/resume/resume-detail.tsx`

- [ ] **Step 1: generation-progress.tsx 작성**

```tsx
// frontend/src/components/resume/generation-progress.tsx
'use client';

import { Progress } from '@/components/ui/progress';

const STEPS = ['수집 중...', '분석 중...', '완성!'];

export function GenerationProgress({ status }: { status: string }) {
  const stepIndex = status === 'COLLECTING' ? 0 : status === 'ANALYZING' ? 1 : 2;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        {STEPS.map((s, i) => (
          <span key={s} className={i <= stepIndex ? 'font-medium' : 'text-muted-foreground'}>{s}</span>
        ))}
      </div>
      <Progress value={progress} />
    </div>
  );
}
```

- [ ] **Step 2: resume-detail.tsx 작성**

```tsx
// frontend/src/components/resume/resume-detail.tsx
'use client';

import { ResumeProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

function formatSalary(val: number): string {
  return `${(val / 10000).toLocaleString()}만원`;
}

export function ResumeDetail({ resume }: { resume: ResumeProfile }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>AI 분석 요약</CardTitle></CardHeader>
        <CardContent><p className="text-sm">{resume.summary}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>기술 스택</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {resume.skills.map((s) => <Badge key={s}>{s}</Badge>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>경력</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {resume.experience.map((e, i) => (
            <div key={i}>
              <p className="font-medium text-sm">{e.role} @ {e.company}</p>
              <p className="text-xs text-muted-foreground">{e.period}</p>
              <ul className="list-disc list-inside text-sm mt-1">
                {e.highlights.map((h, j) => <li key={j}>{h}</li>)}
              </ul>
              {i < resume.experience.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>학력</CardTitle></CardHeader>
        <CardContent>
          {resume.education.map((e, i) => (
            <p key={i} className="text-sm">{e.degree} — {e.institution} ({e.year})</p>
          ))}
        </CardContent>
      </Card>

      {resume.marketValueMin && (
        <Card>
          <CardHeader><CardTitle>시장가치</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-bold">적정 연봉: {formatSalary(resume.marketValueMin)} ~ {formatSalary(resume.marketValueMax!)}</p>
            <p className="text-sm text-muted-foreground">{resume.marketValueReasoning}</p>
            {resume.negotiationPoints && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-1">강점</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {resume.negotiationPoints.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">약점</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {resume.negotiationPoints.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: resume/layout.tsx + resume/page.tsx 작성**

```tsx
// frontend/src/app/resume/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/app/resume/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getResume, generateResume } from '@/lib/api';
import { ResumeProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { GenerationProgress } from '@/components/resume/generation-progress';
import { ResumeDetail } from '@/components/resume/resume-detail';

export default function ResumePage() {
  const { user } = useAuth();
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    getResume(user.id).then(setResume).catch(() => setResume(null));
  }, [user]);

  const handleGenerate = async () => {
    setGenerating(true);
    await generateResume();
    // 더미 모드에서는 상태 전이 시뮬레이션
    const steps: ResumeProfile['status'][] = ['COLLECTING', 'ANALYZING', 'COMPLETED'];
    for (const status of steps) {
      await new Promise((r) => setTimeout(r, 1500));
      setResume((prev) => prev ? { ...prev, status } : null);
    }
    if (user) {
      const updated = await getResume(user.id);
      setResume(updated);
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">이력서</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? '생성 중...' : resume ? '이력서 재생성' : '이력서 생성'}
        </Button>
      </div>

      {generating && resume && <GenerationProgress status={resume.status} />}

      {resume && resume.status === 'COMPLETED' && <ResumeDetail resume={resume} />}
    </div>
  );
}
```

- [ ] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/sooondae/projects/talent-tee/frontend && npm run build
cd /Users/sooondae/projects/talent-tee
git add frontend/src/app/resume/ frontend/src/components/resume/
git commit -m "feat: add resume detail page with generation progress and market value"
```

---

## Task 10: 대화형 공고 작성 페이지

**Files:**
- Create: `frontend/src/app/jobs/create/page.tsx`
- Create: `frontend/src/app/jobs/layout.tsx`
- Create: `frontend/src/components/jobs/chat-ui.tsx`
- Create: `frontend/src/components/jobs/job-form.tsx`

- [ ] **Step 1: chat-ui.tsx 작성**

```tsx
// frontend/src/components/jobs/chat-ui.tsx
'use client';

import { useState } from 'react';
import { ChatMessage, JobChatResponse } from '@/lib/types';
import { chatCreateJob } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatUI({ onComplete }: { onComplete: (jobId: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', content: '어떤 포지션을 채용하시나요?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    const response: JobChatResponse = await chatCreateJob(updatedMessages);

    if (response.complete && response.jobPosting) {
      setMessages([...updatedMessages, { role: 'agent', content: `공고가 완성되었습니다! "${response.jobPosting.title}"` }]);
      onComplete(response.jobPosting.id);
    } else if (response.question) {
      setMessages([...updatedMessages, { role: 'agent', content: response.question }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[500px]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <Card className={`max-w-[70%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                <CardContent className="p-3 text-sm">{m.content}</CardContent>
              </Card>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <Card><CardContent className="p-3 text-sm text-muted-foreground">입력 중...</CardContent></Card>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="flex gap-2 p-4 border-t">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="답변을 입력하세요..."
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>전송</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: job-form.tsx 작성**

```tsx
// frontend/src/components/jobs/job-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function JobForm({ onComplete }: { onComplete: (jobId: string) => void }) {
  const [form, setForm] = useState({
    title: '', description: '', requiredSkills: '', salaryMin: '', salaryMax: '', remotePolicy: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 더미: 바로 완료 처리
    onComplete('job-new');
  };

  return (
    <Card>
      <CardHeader><CardTitle>공고 직접 입력</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">포지션명</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior Backend Developer" />
          </div>
          <div>
            <label className="text-sm font-medium">설명</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="포지션 상세 설명..." />
          </div>
          <div>
            <label className="text-sm font-medium">필수 기술</label>
            <Input value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} placeholder="TypeScript, NestJS, PostgreSQL" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">최소 연봉 (만원)</label>
              <Input type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">최대 연봉 (만원)</label>
              <Input type="number" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">근무 형태</label>
            <Input value={form.remotePolicy} onChange={(e) => setForm({ ...form, remotePolicy: e.target.value })} placeholder="주3일 출근" />
          </div>
          <Button type="submit" className="w-full">공고 생성</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: jobs/layout.tsx + jobs/create/page.tsx 작성**

```tsx
// frontend/src/app/jobs/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/app/jobs/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatUI } from '@/components/jobs/chat-ui';
import { JobForm } from '@/components/jobs/job-form';

export default function CreateJobPage() {
  const router = useRouter();

  const handleComplete = (jobId: string) => {
    router.push('/dashboard/employer');
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">채용공고 작성</h1>
      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">대화형 작성</TabsTrigger>
          <TabsTrigger value="form">폼으로 전환</TabsTrigger>
        </TabsList>
        <TabsContent value="chat">
          <ChatUI onComplete={handleComplete} />
        </TabsContent>
        <TabsContent value="form">
          <JobForm onComplete={handleComplete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/sooondae/projects/talent-tee/frontend && npm run build
cd /Users/sooondae/projects/talent-tee
git add frontend/src/app/jobs/ frontend/src/components/jobs/
git commit -m "feat: add job creation page with chat UI and form"
```

---

## Task 11: 에스크로 예치 페이지

**Files:**
- Create: `frontend/src/app/escrow/page.tsx`
- Create: `frontend/src/app/escrow/layout.tsx`

- [ ] **Step 1: escrow/layout.tsx + escrow/page.tsx 작성**

```tsx
// frontend/src/app/escrow/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function EscrowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/app/escrow/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getEscrowBalance, getEscrowPayments } from '@/lib/api';
import { EscrowAccount, EscrowPayment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export default function EscrowPage() {
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null);
  const [payments, setPayments] = useState<EscrowPayment[]>([]);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    getEscrowBalance().then(setEscrow);
    getEscrowPayments().then(setPayments);
  }, []);

  const handleDeposit = () => {
    // TODO: 실제 지갑 팝업 (Day 3)
    alert(`더미 모드: ${amount} NEAR 예치 완료`);
    setEscrow((prev) => prev ? { ...prev, balance: prev.balance + Number(amount) } : prev);
    setAmount('');
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">에스크로</h1>

      <Card>
        <CardHeader><CardTitle>잔액</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{escrow?.balance ?? 0} NEAR</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>예치하기</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="NEAR 금액 입력" />
          <Button onClick={handleDeposit} disabled={!amount} className="w-full">예치하기</Button>
          <p className="text-xs text-muted-foreground">예치 시 지갑 팝업이 1회 표시됩니다.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>결제 내역</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
              <span>프로필 열람 (Seeker: {p.seekerId})</span>
              <span className="font-medium">-{p.amount} NEAR</span>
            </div>
          ))}
          {payments.length === 0 && <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인 + Commit**

```bash
cd /Users/sooondae/projects/talent-tee/frontend && npm run build
cd /Users/sooondae/projects/talent-tee
git add frontend/src/app/escrow/
git commit -m "feat: add escrow deposit page with balance and payment history"
```

---

## Task 12: 협상 모니터링 페이지 (핵심 데모 화면)

**Files:**
- Create: `frontend/src/app/negotiation/[sessionId]/page.tsx`
- Create: `frontend/src/app/negotiation/layout.tsx`
- Create: `frontend/src/components/negotiation/round-card.tsx`
- Create: `frontend/src/components/negotiation/intervention-input.tsx`

- [ ] **Step 1: round-card.tsx 작성**

```tsx
// frontend/src/components/negotiation/round-card.tsx
'use client';

import { NegotiationRound } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function formatSalary(val: number): string {
  return `${(val / 10000).toLocaleString()}만원`;
}

export function RoundCard({ round, prevRound }: { round: NegotiationRound; prevRound?: NegotiationRound }) {
  const actorLabel = round.actor === 'SEEKER_AGENT' ? '커리어 에이전트' : '채용 에이전트';
  const salaryDiff = prevRound ? round.proposal.salary - prevRound.proposal.salary : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Round {round.round} - {actorLabel}</CardTitle>
          <Badge variant={round.decision === 'ACCEPT' ? 'default' : round.decision === 'REJECT' ? 'destructive' : 'secondary'}>
            {round.decision}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p>연봉: {formatSalary(round.proposal.salary)} {salaryDiff !== 0 && <span className={salaryDiff > 0 ? 'text-green-600' : 'text-red-600'}>({salaryDiff > 0 ? '+' : ''}{formatSalary(salaryDiff)})</span>}</p>
        <p>근무: {round.proposal.remotePolicy}</p>
        <p>직급: {round.proposal.title}</p>
        <p>시작일: {round.proposal.startDate}</p>
        {round.proposal.signingBonus && <p>사이닝 보너스: {formatSalary(round.proposal.signingBonus)}</p>}
        <p className="text-muted-foreground mt-2">근거: {round.reasoning}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: intervention-input.tsx 작성**

```tsx
// frontend/src/components/negotiation/intervention-input.tsx
'use client';

import { useState } from 'react';
import { sendIntervention } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InterventionInput({ sessionId }: { sessionId: string }) {
  const [direction, setDirection] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!direction.trim()) return;
    await sendIntervention(sessionId, direction);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setDirection('');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">에이전트에게 지시 보내기</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          placeholder='예: "연봉은 6,800만 이하로 양보하지 마"'
          rows={2}
        />
        <div className="flex justify-end">
          {sent && <span className="text-sm text-green-600 mr-2">전송됨!</span>}
          <Button size="sm" onClick={handleSend} disabled={!direction.trim()}>전송</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: negotiation/layout.tsx + [sessionId]/page.tsx 작성**

```tsx
// frontend/src/app/negotiation/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function NegotiationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/app/negotiation/[sessionId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getNegotiationSession, getNegotiationRounds } from '@/lib/api';
import { NegotiationSession, NegotiationRound } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { RoundCard } from '@/components/negotiation/round-card';
import { InterventionInput } from '@/components/negotiation/intervention-input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NegotiationMonitorPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<NegotiationSession | null>(null);
  const [rounds, setRounds] = useState<NegotiationRound[]>([]);

  useEffect(() => {
    getNegotiationSession(sessionId).then(setSession);
    getNegotiationRounds(sessionId).then(setRounds);
  }, [sessionId]);

  if (!session) return <p>로딩 중...</p>;

  const isTerminal = ['AGREED', 'FAILED', 'MAX_ROUNDS'].includes(session.state);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">협상 모니터링</h1>
        <Badge variant={session.state === 'AGREED' ? 'default' : 'secondary'}>
          {session.state === 'AGREED' ? '합의 완료' : `Round ${session.currentRound}/${session.maxRounds} 진행 중`}
        </Badge>
      </div>

      <div className="space-y-3">
        {rounds.map((r, i) => (
          <RoundCard key={r.id} round={r} prevRound={i > 0 ? rounds[i - 1] : undefined} />
        ))}
        {!isTerminal && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Round {session.currentRound} - 진행 중...
          </div>
        )}
      </div>

      {!isTerminal && <InterventionInput sessionId={sessionId} />}

      {session.state === 'AGREED' && (
        <Link href={`/negotiation/${sessionId}/agree`}>
          <Button className="w-full">합의 내용 확인하기</Button>
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/sooondae/projects/talent-tee/frontend && npm run build
cd /Users/sooondae/projects/talent-tee
git add frontend/src/app/negotiation/ frontend/src/components/negotiation/
git commit -m "feat: add negotiation monitoring page with round cards and intervention input"
```

---

## Task 13: 합의 확인 + 승인 페이지

**Files:**
- Create: `frontend/src/app/negotiation/[sessionId]/agree/page.tsx`
- Create: `frontend/src/components/negotiation/agreement-detail.tsx`

- [ ] **Step 1: agreement-detail.tsx 작성**

```tsx
// frontend/src/components/negotiation/agreement-detail.tsx
'use client';

import { AgreementRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatSalary(val: number): string {
  return `${(val / 10000).toLocaleString()}만원`;
}

export function AgreementDetail({ agreement }: { agreement: AgreementRecord }) {
  return (
    <Card>
      <CardHeader><CardTitle>합의 내용</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>직급: {agreement.summary.positionTitle}</p>
        <p>연봉: {formatSalary(agreement.summary.agreedSalary)}</p>
        <p>근무: {agreement.summary.remotePolicy}</p>
        <p>시작일: {agreement.summary.startDate}</p>
        <p>수습기간: {agreement.summary.probationMonths}개월</p>
        <p>협상 라운드: {agreement.summary.negotiationRounds}회</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: agree/page.tsx 작성**

```tsx
// frontend/src/app/negotiation/[sessionId]/agree/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAgreement, approveAgreement } from '@/lib/api';
import { AgreementRecord } from '@/lib/types';
import { AgreementDetail } from '@/components/negotiation/agreement-detail';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AgreePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    getAgreement(sessionId).then(setAgreement);
  }, [sessionId]);

  const handleApprove = async () => {
    await approveAgreement(sessionId);
    setApproved(true);
  };

  if (!agreement) return <p>로딩 중...</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">협상 합의 완료!</h1>

      <AgreementDetail agreement={agreement} />

      <Alert>
        <AlertDescription>
          승인 시 합의 내용이 NEAR 블록체인에 온체인 기록됩니다.
        </AlertDescription>
      </Alert>

      {!approved ? (
        <div className="flex gap-3">
          <Button onClick={handleApprove} className="flex-1">승인</Button>
          <Button variant="destructive" className="flex-1">거절</Button>
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            온체인 기록 완료! TX: {agreement.onChainTxHash || 'pending...'}
            <br />면접 프로세스로 진행합니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인 + Commit**

```bash
cd /Users/sooondae/projects/talent-tee/frontend && npm run build
cd /Users/sooondae/projects/talent-tee
git add frontend/src/app/negotiation/ frontend/src/components/negotiation/
git commit -m "feat: add agreement confirmation and approval page"
```

---

## Task 14: 매칭 결과 페이지

**Files:**
- Create: `frontend/src/app/matching/page.tsx`
- Create: `frontend/src/app/matching/layout.tsx`
- Create: `frontend/src/components/matching/match-card.tsx`
- Create: `frontend/src/components/matching/profile-report.tsx`

- [ ] **Step 1: match-card.tsx 작성**

```tsx
// frontend/src/components/matching/match-card.tsx
'use client';

import { MatchResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function MatchCard({
  match, role, onAgree, onViewProfile,
}: {
  match: MatchResult; role: 'SEEKER' | 'EMPLOYER'; onAgree: (id: string) => void; onViewProfile?: (seekerId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{match.jobTitle}</CardTitle>
          <Badge>매칭 {Math.round(match.rerankScore * 100)}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{match.companyName} | {match.seekerExperienceYears}</p>
        <div className="flex gap-1 flex-wrap">
          {match.seekerSkills.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
        </div>
        <div className="flex gap-2 mt-2">
          {role === 'EMPLOYER' && onViewProfile && (
            <Button size="sm" variant="outline" onClick={() => onViewProfile(match.seekerId)}>상세 프로필 보기</Button>
          )}
          <Button size="sm" onClick={() => onAgree(match.id)}>동의</Button>
          <Button size="sm" variant="ghost">거절</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: profile-report.tsx 작성**

```tsx
// frontend/src/components/matching/profile-report.tsx
'use client';

import { ProfileReport } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ProfileReportDialog({ report, open, onClose }: { report: ProfileReport | null; open: boolean; onClose: () => void }) {
  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>상세 프로필 리포트</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">기술 역량</CardTitle></CardHeader>
            <CardContent>
              {report.technicalSkills.map((s) => (
                <div key={s.skill} className="flex justify-between text-sm border-b py-1 last:border-0">
                  <span>{s.skill}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">{s.level}</Badge>
                    <span className="text-muted-foreground">{s.experience}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">프로젝트 경험</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {report.projects.map((p) => (
                <div key={p.name} className="text-sm">
                  <p className="font-medium">{p.name} ({p.role})</p>
                  <p className="text-muted-foreground">{p.impact}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">협업 지표</CardTitle></CardHeader>
            <CardContent>
              {report.collaboration.map((c) => (
                <div key={c.metric} className="flex justify-between text-sm border-b py-1 last:border-0">
                  <span>{c.metric}</span>
                  <span className="font-medium">{c.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">자격/학력</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {report.certifications.map((c) => <Badge key={c}>{c}</Badge>)}
              </div>
            </CardContent>
          </Card>

          <p className="text-sm text-center text-muted-foreground">시장가치: {report.marketValueRange}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: matching/layout.tsx + matching/page.tsx 작성**

```tsx
// frontend/src/app/matching/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function MatchingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/app/matching/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSeekerMatches, getEmployerMatches, agreeMatch, accessProfile } from '@/lib/api';
import { MatchResult, ProfileReport } from '@/lib/types';
import { MatchCard } from '@/components/matching/match-card';
import { ProfileReportDialog } from '@/components/matching/profile-report';

export default function MatchingPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'SEEKER') {
      getSeekerMatches(user.id).then(setMatches);
    } else {
      getEmployerMatches('job-1').then(setMatches);
    }
  }, [user]);

  const handleAgree = async (matchId: string) => {
    await agreeMatch(matchId);
    setMatches((prev) => prev.map((m) => m.id === matchId
      ? { ...m, [user?.role === 'SEEKER' ? 'seekerAgreed' : 'employerAgreed']: true }
      : m
    ));
  };

  const handleViewProfile = async (seekerId: string) => {
    const r = await accessProfile(seekerId);
    setReport(r);
    setReportOpen(true);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">매칭 결과</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            role={user?.role || 'SEEKER'}
            onAgree={handleAgree}
            onViewProfile={user?.role === 'EMPLOYER' ? handleViewProfile : undefined}
          />
        ))}
      </div>
      <ProfileReportDialog report={report} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/sooondae/projects/talent-tee/frontend && npm run build
cd /Users/sooondae/projects/talent-tee
git add frontend/src/app/matching/ frontend/src/components/matching/
git commit -m "feat: add matching results page with profile report dialog"
```

---

## Task 15: 전체 빌드 + 스모크 테스트

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 전체 빌드**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npm run build
```
Expected: 빌드 성공, 에러 없음

- [ ] **Step 2: dev 서버 실행 + 수동 확인**

```bash
cd /Users/sooondae/projects/talent-tee/frontend
npm run dev
```

브라우저에서 확인할 항목:
1. `http://localhost:3001` → 로그인 페이지 (Alice/Bob 선택)
2. Alice 로그인 → `/dashboard/seeker` (데이터소스, 이력서, 시장가치, 매칭, 협상 카드)
3. Bob 로그인 → `/dashboard/employer` (에스크로, 공고, 매칭, 협상 카드)
4. `/datasource` → 4개 소스 카드
5. `/resume` → 이력서 상세 + 시장가치
6. `/jobs/create` → 대화형 채팅 + 폼 탭
7. `/escrow` → 잔액 + 예치 + 내역
8. `/negotiation/session-1` → 라운드 카드 + 개입 입력
9. `/negotiation/session-2/agree` → 합의 내용 + 승인
10. `/matching` → 매칭 카드 + 프로필 리포트 다이얼로그

- [ ] **Step 3: 최종 Commit**

```bash
cd /Users/sooondae/projects/talent-tee
git add -A
git commit -m "feat: complete frontend Day 1-2 milestone — full flow demo with dummy data"
```

---

## 수락 기준 체크리스트

- [ ] NEAR 지갑 로그인 → 더미 모드로 Alice/Bob 선택 → role별 대시보드 이동
- [ ] 더미 데이터로 전체 플로우 시연 가능 (로그인→이력서→공고→매칭→협상→합의)
- [ ] 데이터소스 연결 UI → Mock 연결 지원
- [ ] 이력서 생성 상태 표시 (수집 중 → 분석 중 → 완성)
- [ ] 대화형 공고 작성 챗 UI 동작
- [ ] 협상 모니터링 화면 → 라운드별 표시
- [ ] 사용자 개입 입력 → 에이전트에 전달
- [ ] 상세 프로필 열람 → 리포트 다이얼로그 표시 (채용측)
- [ ] 합의 확인 + 승인 → 온체인 기록 결과 표시
- [ ] 에스크로 예치 + 잔액 표시

---

## Day 3-4 후속 작업 (이 계획 범위 밖)

1. **실제 NEAR 지갑 연결** — `near-api-js`, `near-connect` 통합
2. **더미 → 실제 API 전환** — `NEXT_PUBLIC_USE_DUMMY=false` 후 `lib/api.ts`의 실제 fetch 경로 테스트
3. **GitHub OAuth 실제 연결** — `/datasource/connect/github` 리다이렉트
4. **ECDH 클라이언트 복호화** — `tweetnacl` 연동, 승연과 페어 (Day 4)
5. **SSE/Polling 실시간 라운드** — 협상 진행 중 실시간 업데이트
6. **에스크로 지갑 팝업** — `near-api-js` 트랜잭션 서명
