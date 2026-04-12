# Phase 2: 로그인 + 대시보드 + 데이터소스 UI (Day 1 오후)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Alice/Bob 선택 카드 로그인 UI, 구직자/채용담당자 역할별 대시보드, 데이터소스 연결 페이지, 공통 레이아웃(Header + Sidebar) 완성
**선행:** Phase 1 (타입, 더미 데이터, API 레이어, AuthContext)
**완료 기준:** 로그인 → 역할별 대시보드 진입 → 사이드바 네비게이션 동작, 데이터소스 연결/재동기 UI 동작
**예상 소요:** ~1.5시간

---

## Task 2.1: 로그인 선택 UI

**Files:**
- Create: `frontend/src/components/auth/login-selector.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: LoginSelector 컴포넌트 구현**

Alice(구직자)와 Bob(채용담당자)를 선택하는 카드 UI.
`USE_DUMMY` 플래그에 따라 더미 로그인 또는 NEAR 로그인 분기.

```typescript
// frontend/src/components/auth/login-selector.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';

const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';

export function LoginSelector() {
  const { login, loginWithNear } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (role: 'SEEKER' | 'EMPLOYER') => {
    setIsLoggingIn(true);
    setError(null);
    try {
      if (USE_DUMMY) {
        await login(role);
      } else {
        const nearAccountId = role === 'SEEKER' ? 'alice.testnet' : 'bob.testnet';
        await loginWithNear(nearAccountId, role);
      }
      router.push(role === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ... 커스텀 NEAR 계정 로그인 (USE_DUMMY가 false일 때만 표시)
}
```

핵심 UI 요소:
- **Seeker Card** — Alice Kim 아바타, "Frontend Developer, 3-5y experience", alice.testnet
- **Employer Card** — Bob Park 아바타, "HR Manager, TechCorp", bob.testnet
- **에러 메시지** — 로그인 실패 시 빨간색 배너 표시
- **로딩 상태** — 인증 중 스피너 + "Authenticating..." 텍스트
- **커스텀 NEAR 계정** — `!USE_DUMMY` 일 때 계정 입력 + 역할 선택 + 로그인 버튼

- [ ] **Step 2: 메인 페이지에 LoginSelector 연결**

```typescript
// frontend/src/app/page.tsx
import { LoginSelector } from '@/components/auth/login-selector';

export default function Home() {
  return <LoginSelector />;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auth/login-selector.tsx frontend/src/app/page.tsx
git commit -m "feat: add Alice/Bob login selector with error/loading states"
```

---

## Task 2.2: 공통 레이아웃 (Header + Sidebar)

**Files:**
- Create: `frontend/src/components/layout/header.tsx`
- Create: `frontend/src/components/layout/sidebar.tsx`
- Create: `frontend/src/app/dashboard/layout.tsx`

- [ ] **Step 1: Header 컴포넌트 구현**

로그인 후 상단 고정 헤더. 로고, 역할 배지, NEAR 계정 표시, 로그아웃 버튼 포함.

```typescript
// frontend/src/components/layout/header.tsx
'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 bg-[#0e0e0e] border-b border-border/10">
      <div className="flex items-center justify-between px-6 py-4">
        {/* 로고 + 역할 배지 */}
        {/* NEAR 계정 + 로그아웃 버튼 */}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Sidebar 컴포넌트 구현**

역할(SEEKER/EMPLOYER)에 따라 다른 네비게이션 링크를 표시한다.

```typescript
// frontend/src/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const seekerLinks = [
  { href: '/dashboard/seeker', label: 'Dashboard', icon: 'dashboard' },
  { href: '/datasource', label: 'Data Sources', icon: 'database' },
  { href: '/resume', label: 'Resume', icon: 'description' },
  { href: '/negotiations', label: 'Negotiations', icon: 'handshake' },
];

const employerLinks = [
  { href: '/dashboard/employer', label: 'Dashboard', icon: 'dashboard' },
  { href: '/jobs/create', label: 'Create Job', icon: 'edit_note' },
  { href: '/escrow', label: 'Escrow', icon: 'account_balance' },
  { href: '/negotiations', label: 'Negotiations', icon: 'handshake' },
];
```

현재 경로에 따라 활성 링크를 하이라이트 (`bg-primary/10 text-primary`).
하단에 "NEAR Mainnet" 네트워크 상태 표시.

- [ ] **Step 3: 대시보드 레이아웃**

```typescript
// frontend/src/app/dashboard/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/ frontend/src/app/dashboard/layout.tsx
git commit -m "feat: add Header, Sidebar, and DashboardLayout"
```

---

## Task 2.3: 구직자 대시보드

**Files:**
- Create: `frontend/src/app/dashboard/seeker/page.tsx`
- Create: `frontend/src/components/dashboard/job-seeking-toggle.tsx`
- Create: `frontend/src/components/dashboard/datasource-status.tsx`
- Create: `frontend/src/components/dashboard/resume-summary.tsx`
- Create: `frontend/src/components/dashboard/market-value-card.tsx`
- Create: `frontend/src/components/dashboard/negotiation-list.tsx`

- [ ] **Step 1: SeekerDashboard 페이지 구현**

```typescript
// frontend/src/app/dashboard/seeker/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, getResume, getSeekerMatches, getNegotiationSessions,
  updateJobSeekingStatus } from '@/lib/api';
import { JobSeekingToggle } from '@/components/dashboard/job-seeking-toggle';
import { DatasourceStatus } from '@/components/dashboard/datasource-status';
import { ResumeSummary } from '@/components/dashboard/resume-summary';
import { MarketValueCard } from '@/components/dashboard/market-value-card';
import { NegotiationList } from '@/components/dashboard/negotiation-list';

export default function SeekerDashboard() {
  const { user } = useAuth();
  // useEffect에서 병렬로 4개 API 호출
  // getDatasourceStatus, getResume, getSeekerMatches, getNegotiationSessions
  // ...
}
```

대시보드 구성 요소:
1. **환영 메시지** — "Welcome back, {nearAccountId}" + 서브텍스트
2. **JobSeekingToggle** — 구직활동 온/오프 토글
3. **DatasourceStatus** — 연결된 데이터소스 카드 (4개 프로바이더)
4. **ResumeSummary + MarketValueCard** — 2열 그리드
5. **NegotiationList** — 진행 중인 협상 목록 + 매칭 점수 링

- [ ] **Step 2: 대시보드 서브 컴포넌트 5종 구현**

각 컴포넌트는 독립적 Props를 받아 렌더링한다:
- `JobSeekingToggle` — `onToggle: (active: boolean) => void`
- `DatasourceStatus` — `connections: DataSourceConnection[]`
- `ResumeSummary` — `resume: ResumeProfile | null`
- `MarketValueCard` — `resume: ResumeProfile | null`
- `NegotiationList` — `sessions: NegotiationSession[], matches?: MatchResult[]`

NegotiationList는 세션 상태에 따른 아이콘/색상 매핑:
```typescript
const stateInfo: Record<string, { label: string; icon: string; className: string }> = {
  INITIATED: { label: 'Starting', icon: 'hourglass_top', className: 'text-yellow-400' },
  EMPLOYER_OFFER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  AGREED: { label: 'Agreed', icon: 'task_alt', className: 'text-primary' },
  FAILED: { label: 'Failed', icon: 'cancel', className: 'text-red-400' },
  // ...
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/seeker/ frontend/src/components/dashboard/
git commit -m "feat: add Seeker dashboard with toggle, datasource, resume, negotiation"
```

---

## Task 2.4: 채용담당자 대시보드

**Files:**
- Create: `frontend/src/app/dashboard/employer/page.tsx`
- Create: `frontend/src/components/dashboard/escrow-balance.tsx`
- Create: `frontend/src/components/dashboard/job-list.tsx`

- [ ] **Step 1: EmployerDashboard 페이지 구현**

```typescript
// frontend/src/app/dashboard/employer/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getEscrowBalance, getJobs, getEmployerMatches, getNegotiationSessions } from '@/lib/api';
import { EscrowBalance } from '@/components/dashboard/escrow-balance';
import { JobList } from '@/components/dashboard/job-list';
import { NegotiationList } from '@/components/dashboard/negotiation-list';

export default function EmployerDashboard() {
  const { user } = useAuth();
  // useEffect에서 4개 API 병렬 호출
  // getEscrowBalance(user.nearAccountId), getJobs, getEmployerMatches, getNegotiationSessions
  // ...
}
```

대시보드 구성 요소:
1. **환영 메시지** — "Welcome back, {nearAccountId}"
2. **EscrowBalance** — NEAR 잔액 표시 + "Deposit More" 링크
3. **JobList** — 등록된 채용공고 목록
4. **NegotiationList** — 진행 중인 협상 목록 (구직자 대시보드와 동일 컴포넌트 재사용)

- [ ] **Step 2: EscrowBalance + JobList 컴포넌트 구현**

```typescript
// frontend/src/components/dashboard/escrow-balance.tsx
export function EscrowBalance({ escrow }: { escrow: EscrowAccount | null }) {
  // NEAR 잔액 숫자 + 지갑 아이콘 + "Deposit More" 버튼 (Link to /escrow)
}
```

```typescript
// frontend/src/components/dashboard/job-list.tsx
export function JobList({ jobs }: { jobs: JobPosting[] }) {
  // 채용공고 카드 리스트 + 필요 스킬 태그 + 급여 범위 표시
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/employer/ frontend/src/components/dashboard/escrow-balance.tsx frontend/src/components/dashboard/job-list.tsx
git commit -m "feat: add Employer dashboard with escrow balance and job list"
```

---

## Task 2.5: 데이터소스 연결 페이지

**Files:**
- Create: `frontend/src/app/datasource/page.tsx`
- Create: `frontend/src/app/datasource/layout.tsx`

- [ ] **Step 1: DatasourcePage 구현**

4개 프로바이더(GitHub, Slack, Discord, Gov24) 카드를 2열 그리드로 표시.
각 카드에 연결 상태(CONNECTED/MOCK/DISCONNECTED) + Connect/Re-sync 버튼.

```typescript
// frontend/src/app/datasource/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getDatasourceStatus, connectDatasourceMock } from '@/lib/api';

const PROVIDERS = [
  { id: 'github', name: 'GitHub', icon: 'code',
    description: 'Analyze your repositories, contributions, and coding activity...' },
  { id: 'slack', name: 'Slack', icon: 'chat',
    description: 'Evaluate communication patterns and collaboration style...' },
  { id: 'discord', name: 'Discord', icon: 'forum',
    description: 'Review community engagement and technical discussions...' },
  { id: 'gov24', name: 'Gov24', icon: 'assured_workload',
    description: 'Verify certifications, education credentials...' },
];
```

핵심 UI 요소:
1. **Connection Progress** 프로그레스 바 — `{connectedCount}/{PROVIDERS.length}`
2. **프로바이더 카드** — 아이콘 + 이름 + 연결 상태 도트 + 설명 + 마지막 동기화 시간
3. **Connect 버튼** — 미연결 시 `bg-primary`, 연결 시 "Re-sync Data" 회색 버튼
4. **로딩 상태** — 스켈레톤 카드 4개 표시
5. **연결 중 상태** — 스피너 + "Connecting..." 텍스트

- [ ] **Step 2: datasource 레이아웃 (대시보드 레이아웃 공유)**

```typescript
// frontend/src/app/datasource/layout.tsx
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DatasourceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/datasource/
git commit -m "feat: add datasource connection page with provider cards"
```

---

## Phase 2 완료 기준

- [ ] 메인 페이지 → Alice/Bob 선택 카드 표시
- [ ] Alice 클릭 → `/dashboard/seeker` 이동, 구직자 대시보드 렌더링
- [ ] Bob 클릭 → `/dashboard/employer` 이동, 채용담당자 대시보드 렌더링
- [ ] 사이드바 네비게이션 — 역할별 메뉴 정상 표시 + 활성 링크 하이라이트
- [ ] 헤더 — 역할 배지, NEAR 계정, 로그아웃 정상 동작
- [ ] 데이터소스 페이지 — 4개 프로바이더 카드 표시, Connect/Re-sync 동작
- [ ] 에러/로딩 상태 — 로그인 실패 시 에러 배너, 데이터 로딩 시 스켈레톤

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `frontend/src/components/auth/login-selector.tsx` | Create |
| `frontend/src/app/page.tsx` | Modify |
| `frontend/src/components/layout/header.tsx` | Create |
| `frontend/src/components/layout/sidebar.tsx` | Create |
| `frontend/src/app/dashboard/layout.tsx` | Create |
| `frontend/src/app/dashboard/seeker/page.tsx` | Create |
| `frontend/src/app/dashboard/employer/page.tsx` | Create |
| `frontend/src/components/dashboard/job-seeking-toggle.tsx` | Create |
| `frontend/src/components/dashboard/datasource-status.tsx` | Create |
| `frontend/src/components/dashboard/resume-summary.tsx` | Create |
| `frontend/src/components/dashboard/market-value-card.tsx` | Create |
| `frontend/src/components/dashboard/escrow-balance.tsx` | Create |
| `frontend/src/components/dashboard/job-list.tsx` | Create |
| `frontend/src/components/dashboard/negotiation-list.tsx` | Create |
| `frontend/src/app/datasource/page.tsx` | Create |
| `frontend/src/app/datasource/layout.tsx` | Create |
