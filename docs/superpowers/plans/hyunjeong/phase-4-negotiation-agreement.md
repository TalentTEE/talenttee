# Phase 4: 협상 모니터링 + 합의 확인 (Day 2 오후)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 협상 라운드별 모니터링 UI (챗 버블 형태), 합의 확인 + 온체인 기록 승인/거절 UI, 협상 목록 페이지 완성
**선행:** Phase 3 (이력서, 채용공고, 에스크로, 매칭 페이지)
**완료 기준:** 협상 모니터링 → 합의 확인 → 온체인 기록 전체 플로우 동작, 더미 데이터 기반 전체 데모 가능
**예상 소요:** ~1.5시간

---

## Task 4.1: 협상 라운드별 모니터링 페이지

**Files:**
- Create: `frontend/src/app/negotiation/[sessionId]/page.tsx`
- Create: `frontend/src/app/negotiation/layout.tsx`

- [ ] **Step 1: NegotiationMonitorPage 구현 -- 상태 + 라운드 로드**

```typescript
// frontend/src/app/negotiation/[sessionId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getNegotiationSession, getNegotiationRounds } from '@/lib/api';
import { NegotiationSession, NegotiationRound } from '@/lib/types';

export default function NegotiationMonitorPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<NegotiationSession | null>(null);
  const [rounds, setRounds] = useState<NegotiationRound[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    getNegotiationSession(sessionId).then(setSession);
    getNegotiationRounds(sessionId).then(setRounds);
  }, [sessionId]);

  const isTerminal = session?.state === 'AGREED' || session?.state === 'FAILED'
    || session?.state === 'MAX_ROUNDS';
  // ...
}
```

- [ ] **Step 2: 상태 바 (Status Bar) 구현**

세션 상태 + 라운드 진행 프로그레스를 한 줄에 표시.

```typescript
{session && (
  <div className="bg-card rounded-2xl border border-border/10 p-5">
    <div className="flex items-center justify-between flex-wrap gap-4">
      {/* 왼쪽: 상태 아이콘 + 상태 뱃지 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-lg text-primary">
            {session.state === 'AGREED' ? 'task_alt' : 'sync'}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${stateColor(session.state)}`}>
          {stateLabel(session.state)}
        </span>
      </div>
      {/* 오른쪽: 라운드 프로그레스 바 */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">{session.currentRound} / {session.maxRounds}</p>
        <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary"
            style={{ width: `${(session.currentRound / session.maxRounds) * 100}%` }} />
        </div>
      </div>
    </div>
  </div>
)}
```

유틸 함수:
```typescript
function stateLabel(state: string): string {
  const map: Record<string, string> = {
    INITIATED: 'Initiated', EMPLOYER_OFFER: 'Employer Offer',
    SEEKER_COUNTER: 'Seeker Counter', EMPLOYER_COUNTER: 'Employer Counter',
    AGREED: 'Agreed', FAILED: 'Failed', MAX_ROUNDS: 'Max Rounds Reached',
  };
  return map[state] || state;
}

function stateColor(state: string): string {
  if (state === 'AGREED') return 'bg-primary/10 text-primary border-primary/20';
  if (state === 'FAILED' || state === 'MAX_ROUNDS') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-muted text-muted-foreground border-border/10';
}
```

- [ ] **Step 3: 에이전트 참가자 표시 (Employer Agent / Seeker Agent)**

```typescript
{rounds.length > 0 && (
  <div className="flex items-center justify-between px-2">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-sm text-primary">corporate_fare</span>
      </div>
      <span className="text-xs font-semibold text-muted-foreground">Employer Agent</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">Seeker Agent</span>
      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-sm text-blue-400">person</span>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: 챗 버블 형태 라운드 표시**

각 라운드를 채팅 대화 형태로 표시. SEEKER_AGENT는 우측, EMPLOYER_AGENT는 좌측.

```typescript
{rounds.map((round, idx) => {
  const prevSalary = idx > 0 ? rounds[idx - 1].proposal.salary : null;
  const salaryDelta = prevSalary !== null ? round.proposal.salary - prevSalary : null;
  const isSeeker = round.actor === 'SEEKER_AGENT';

  return (
    <div key={round.id} className="space-y-2">
      {/* 라운드 구분선 */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-border/10" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Round {round.round}
        </span>
        <div className="flex-1 h-px bg-border/10" />
      </div>

      {/* 챗 버블 */}
      <div className={`flex ${isSeeker ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[85%] space-y-2">
          {/* 1. 추론 메시지 (인용 형태) */}
          <div className={`rounded-2xl p-4 ${isSeeker ? 'bg-blue-500/10' : 'bg-card'}`}>
            <p className="text-sm">&ldquo;{round.reasoning}&rdquo;</p>
          </div>
          {/* 2. 제안 카드 (급여 + 변동폭, 근무형태, 근무시간, 보너스) */}
          <div className="rounded-xl border border-border/10 p-3">
            <span className="text-xs font-bold">{formatSalary(round.proposal.salary)}
              {salaryDelta && <span className={salaryDelta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                {salaryDelta > 0 ? '+' : ''}{formatSalary(salaryDelta)}
              </span>}
            </span>
            {/* remotePolicy, workingHours, signingBonus 태그들 */}
          </div>
          {/* 3. 결정 뱃지 (COUNTER/ACCEPT/REJECT) */}
          <span className={decisionStyle(round.decision)}>
            {decisionLabel(round.decision)}
          </span>
        </div>
      </div>
    </div>
  );
})}
```

- [ ] **Step 5: 타이핑 인디케이터 + 종료 상태 배너**

협상 진행 중일 때 다음 에이전트의 "thinking..." 인디케이터 표시.
AGREED 시 "Agreement Reached!" 배너, FAILED/MAX_ROUNDS 시 경고 배너.

```typescript
{/* 합의 배너 */}
{isTerminal && session?.state === 'AGREED' && (
  <div className="bg-card rounded-2xl border border-primary/20 p-5 text-center">
    <span className="material-symbols-outlined text-3xl text-primary">handshake</span>
    <p className="text-sm font-semibold text-primary">Agreement Reached!</p>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/negotiation/
git commit -m "feat: add negotiation monitoring page with chat-style round display"
```

---

## Task 4.2: 합의 확인 + 승인/거절 페이지

**Files:**
- Create: `frontend/src/app/negotiation/[sessionId]/agree/page.tsx`

- [ ] **Step 1: AgreementPage 구현**

```typescript
// frontend/src/app/negotiation/[sessionId]/agree/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAgreement, approveAgreement } from '@/lib/api';
import { AgreementRecord } from '@/lib/types';

export default function AgreementPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    getAgreement(sessionId).then((data) => {
      setAgreement(data);
      if (data.onChainTxHash) { setTxHash(data.onChainTxHash); setApproved(true); }
    });
  }, [sessionId]);

  const handleApprove = async () => {
    await approveAgreement(sessionId);
    const mockTx = `0x${Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setTxHash(mockTx);
    setApproved(true);
  };
  // ...
}
```

- [ ] **Step 2: 합의 상세 카드 (6개 필드 2열 그리드)**

```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* Position */}
  <div className="rounded-xl bg-accent/50 p-4">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Position</p>
    <p className="text-base font-bold">{agreement.summary.positionTitle}</p>
  </div>
  {/* Salary */}
  <div className="rounded-xl bg-accent/50 p-4">
    <p className="text-[10px] uppercase">Annual Salary</p>
    <p className="text-base font-bold text-primary">{formatSalary(agreement.summary.agreedSalary)}</p>
  </div>
  {/* Work Type, Start Date, Probation, Total Rounds */}
</div>

{/* Agreement Hash */}
<div className="rounded-xl bg-muted/50 p-3">
  <p className="text-[10px] uppercase">Agreement Hash</p>
  <p className="text-xs font-mono break-all">{agreement.agreementHash}</p>
</div>
```

- [ ] **Step 3: 온체인 경고 + 액션 버튼**

```typescript
{/* On-Chain Warning */}
<div className="bg-card rounded-2xl border border-amber-500/10 p-5">
  <span className="material-symbols-outlined text-base text-amber-400">warning</span>
  <p className="text-sm font-bold">On-Chain Recording</p>
  <p className="text-xs text-muted-foreground">
    By approving this agreement, the final terms will be permanently recorded
    on the NEAR blockchain. This action is irreversible.
  </p>
</div>

{/* Approve / Reject 버튼 */}
{!approved && !rejected && (
  <div className="flex items-center gap-3">
    <button onClick={handleApprove} className="flex-1 bg-primary text-primary-foreground">
      Approve & Record On-Chain
    </button>
    <button onClick={handleReject} className="flex-1 bg-muted hover:bg-red-500/10">
      Reject
    </button>
  </div>
)}

{/* 승인 완료: TX Hash 표시 */}
{approved && txHash && (
  <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5">
    <span className="material-symbols-outlined text-primary">verified</span>
    <p className="text-sm font-bold text-primary">On-Chain Transaction Confirmed</p>
    <p className="text-xs font-mono break-all">{txHash}</p>
  </div>
)}

{/* 거절 상태 */}
{rejected && (
  <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-5 text-center">
    <p className="text-sm font-semibold text-red-400">Agreement Rejected</p>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/negotiation/[sessionId]/agree/
git commit -m "feat: add agreement review page with approve/reject and on-chain recording"
```

---

## Task 4.3: 협상 목록 페이지

**Files:**
- Create: `frontend/src/app/negotiations/page.tsx`
- Create: `frontend/src/app/negotiations/layout.tsx`

- [ ] **Step 1: NegotiationsPage 구현**

진행 중(In Progress)과 완료(Completed) 세션을 분리하여 표시.

```typescript
// frontend/src/app/negotiations/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getNegotiationSessions, getSeekerMatches, getEmployerMatches } from '@/lib/api';

export default function NegotiationsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getNegotiationSessions(),
      user.role === 'SEEKER' ? getSeekerMatches(user.id) : getEmployerMatches('job-1'),
    ]).then(([s, m]) => { setSessions(s); setMatches(m); });
  }, [user]);

  const inProgress = sessions.filter(s =>
    s.state !== 'AGREED' && s.state !== 'FAILED' && s.state !== 'MAX_ROUNDS');
  const completed = sessions.filter(s =>
    s.state === 'AGREED' || s.state === 'FAILED' || s.state === 'MAX_ROUNDS');
  // ...
}
```

- [ ] **Step 2: Section + SessionRow 서브 컴포넌트**

```typescript
function Section({ title, count, children }) {
  // 섹션 헤더 (타이틀 + 카운트 뱃지) + children
}

function SessionRow({ session, match }: { session: NegotiationSession; match?: MatchResult }) {
  const isAgreed = session.state === 'AGREED';
  const score = match ? Math.round(match.rerankScore * 100) : null;
  // Link: 합의 시 /negotiation/{id}/agree, 아닌 경우 /negotiation/{id}
  // 매칭 점수 링 or 상태 아이콘 + 공고 제목/회사 + 상태 라벨 + 라운드 진행
}
```

핵심 라우팅 로직:
- `isAgreed` → `/negotiation/${s.id}/agree` (합의 확인 페이지)
- 그 외 → `/negotiation/${s.id}` (모니터링 페이지)

- [ ] **Step 3: 빈 상태 처리**

```typescript
{sessions.length === 0 && (
  <div className="bg-card rounded-2xl border border-border/10 p-12 text-center">
    <span className="material-symbols-outlined text-4xl text-muted-foreground">handshake</span>
    <p className="text-sm font-semibold">No negotiations yet</p>
    <p className="text-xs text-muted-foreground">
      Negotiations will appear here once you and an employer both agree on a match.
    </p>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/negotiations/
git commit -m "feat: add negotiations list page with in-progress and completed sections"
```

---

## Task 4.4: 대시보드 컴포넌트 보완

**Files:**
- Verify: `frontend/src/components/dashboard/negotiation-list.tsx`
- Verify: `frontend/src/components/dashboard/escrow-balance.tsx`
- Verify: `frontend/src/components/dashboard/job-list.tsx`
- Verify: `frontend/src/components/dashboard/match-list.tsx`

- [ ] **Step 1: 기존 대시보드 컴포넌트와 새 페이지의 연결 확인**

NegotiationList 컴포넌트가 대시보드와 협상 목록 페이지 양쪽에서 사용됨.
대시보드에서는 요약 버전, 전체 목록 페이지에서는 상세 버전.

```typescript
// frontend/src/components/dashboard/negotiation-list.tsx
export function NegotiationList({ sessions, matches = [] }: {
  sessions: NegotiationSession[];
  matches?: MatchResult[];
}) {
  // 매칭 점수 링 + 공고/회사명 + 상태 + Monitor/View Result 버튼
  // Link: isAgreed ? /negotiation/{id}/agree : /negotiation/{id}
}
```

- [ ] **Step 2: Commit (변경 있을 경우)**

```bash
git add frontend/src/components/dashboard/
git commit -m "feat: finalize dashboard components for negotiation/escrow/job list"
```

---

## Phase 4 완료 기준

- [ ] `/negotiation/{sessionId}` — 라운드별 챗 버블 표시 (Employer Agent 좌, Seeker Agent 우)
- [ ] 라운드별 급여 제안 + 변동폭 표시 (초록/빨강 색상)
- [ ] 라운드별 추론 메시지 + 결정 뱃지 (COUNTER/ACCEPT/REJECT)
- [ ] 진행 중 세션 — 타이핑 인디케이터 표시
- [ ] 합의 세션 — "Agreement Reached!" 배너 표시
- [ ] `/negotiation/{sessionId}/agree` — 합의 상세 6개 필드 표시
- [ ] "Approve & Record On-Chain" 클릭 → TX Hash 표시
- [ ] "Reject" 클릭 → 거절 상태 표시
- [ ] `/negotiations` — 진행 중/완료 섹션 분리 표시
- [ ] 대시보드 → "Monitor"/"View Result" 클릭 → 해당 페이지 이동

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `frontend/src/app/negotiation/[sessionId]/page.tsx` | Create |
| `frontend/src/app/negotiation/[sessionId]/agree/page.tsx` | Create |
| `frontend/src/app/negotiation/layout.tsx` | Create |
| `frontend/src/app/negotiations/page.tsx` | Create |
| `frontend/src/app/negotiations/layout.tsx` | Create |
| `frontend/src/components/dashboard/negotiation-list.tsx` | Verify/Update |
| `frontend/src/components/dashboard/escrow-balance.tsx` | Verify/Update |
| `frontend/src/components/dashboard/job-list.tsx` | Verify/Update |
| `frontend/src/components/dashboard/match-list.tsx` | Verify/Update |
