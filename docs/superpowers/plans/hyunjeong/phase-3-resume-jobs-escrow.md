# Phase 3: 이력서 + 채용공고 + 에스크로 + 매칭 페이지 (Day 2 오전)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI 이력서 상세 페이지, 대화형 공고 작성 챗 UI, 에스크로 예치/잔액/결제 내역 페이지, 매칭 결과 페이지 완성
**선행:** Phase 2 (로그인, 대시보드, 레이아웃)
**완료 기준:** 4개 핵심 기능 페이지 렌더링 정상, 더미 데이터 기반 전체 동작
**예상 소요:** ~1.5시간

---

## Task 3.1: AI 이력서 상세 페이지

**Files:**
- Create: `frontend/src/app/resume/page.tsx`
- Create: `frontend/src/app/resume/layout.tsx`

- [ ] **Step 1: ResumePage 구현 -- 상태 진행 + 생성 시뮬레이션**

3단계 진행 표시: COLLECTING -> ANALYZING -> COMPLETED.
"Generate Resume" 버튼 클릭 시 단계별 시뮬레이션 (setTimeout으로 전이).

```typescript
// frontend/src/app/resume/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { getResume, generateResume } from '@/lib/api';
import { ResumeProfile } from '@/lib/types';

const STEPS = [
  { key: 'COLLECTING', label: 'Collecting', icon: 'cloud_download' },
  { key: 'ANALYZING', label: 'Analyzing', icon: 'psychology' },
  { key: 'COMPLETED', label: 'Complete', icon: 'check_circle' },
] as const;

export default function ResumePage() {
  const { user } = useAuth();
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [simulatedStatus, setSimulatedStatus] = useState<ResumeProfile['status'] | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setSimulatedStatus('COLLECTING');
    try { await generateResume(); } catch {}
    setTimeout(() => setSimulatedStatus('ANALYZING'), 1500);
    setTimeout(() => {
      setSimulatedStatus('COMPLETED');
      if (user) getResume(user.id).then(setResume).finally(() => setGenerating(false));
    }, 3000);
  }, [user]);
  // ...
}
```

- [ ] **Step 2: 이력서 콘텐츠 섹션 구현 (COMPLETED 상태에서만 표시)**

이력서 완성 시 6개 섹션을 표시한다:

1. **AI Summary** — `resume.summary` 텍스트 (`auto_awesome` 아이콘)
2. **Estimated Market Value** — `{marketValueMin} - {marketValueMax} / year` (`trending_up` 아이콘)
   - `formatCurrency()` — 1억 이상이면 `X.X억`, 이하이면 `X,XXX만` 형식
3. **Skills** — 기술 태그 배열 (`bg-primary/10 text-primary` 뱃지)
4. **Experience** — 경력 타임라인 (왼쪽 도트 + 세로선 + 회사/기간/하이라이트)
5. **Education** — 학력 카드 (학위 + 기관 + 졸업연도)
6. **Strengths & Improvement Areas** — 2열 그리드 (초록 체크 / 주황 화살표)
7. **Negotiation Points** — 레버리지 포인트 + 주의 포인트 2열

```typescript
{/* Experience Timeline */}
{resume.experience.map((exp, idx) => (
  <div key={idx} className="relative flex gap-4">
    <div className="flex flex-col items-center">
      <div className="w-3 h-3 rounded-full bg-primary border-2 border-[#1a1919] z-10" />
      {idx < resume.experience.length - 1 && <div className="w-0.5 flex-1 bg-[#262626]" />}
    </div>
    <div className="pb-8 last:pb-0 flex-1">
      <h3 className="font-bold text-sm">{exp.role}</h3>
      <span className="text-sm text-muted-foreground">{exp.company}</span>
      <span className="text-xs text-muted-foreground/60">{exp.period}</span>
      {/* highlights */}
    </div>
  </div>
))}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/resume/
git commit -m "feat: add AI resume page with generation simulation and full detail view"
```

---

## Task 3.2: 대화형 채용공고 작성 페이지

**Files:**
- Create: `frontend/src/app/jobs/create/page.tsx`
- Create: `frontend/src/app/jobs/layout.tsx`

- [ ] **Step 1: CreateJobPage -- 탭 전환 (Chat Mode / Form Mode)**

```typescript
// frontend/src/app/jobs/create/page.tsx
'use client';

import { useState } from 'react';

type Tab = 'chat' | 'form';

export default function CreateJobPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  return (
    <div className="max-w-4xl space-y-6">
      {/* Tab Toggle: Chat Mode / Form Mode */}
      {activeTab === 'chat' ? <ChatMode /> : <FormMode />}
    </div>
  );
}
```

- [ ] **Step 2: ChatMode 구현 -- AI 챗봇 대화형 공고 작성**

```typescript
function ChatMode() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', content: "Hi! I'm your AI hiring assistant..." },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdJob, setCreatedJob] = useState<JobPosting | null>(null);

  const handleSend = async () => {
    const userMessage: ChatMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    const response = await chatCreateJob(updatedMessages);
    if (response.complete && response.jobPosting) {
      setCreatedJob(response.jobPosting);
    } else {
      setMessages(prev => [...prev, { role: 'agent', content: response.question! }]);
    }
    setIsLoading(false);
  };
  // ...
}
```

핵심 UI 요소:
- **챗 윈도우** — 420px 높이 스크롤, agent(좌측)/user(우측) 말풍선
- **에이전트 아바타** — `smart_toy` 아이콘 + `bg-primary/15`
- **사용자 아바타** — `person` 아이콘 + `bg-muted`
- **타이핑 인디케이터** — 3개 도트 바운스 애니메이션
- **입력 바** — 텍스트 입력 + Send 버튼 (Enter 키 지원)
- **공고 프리뷰 카드** — 대화 완료 시 JobPreviewCard 표시

- [ ] **Step 3: FormMode 구현 -- 수동 입력 폼**

```typescript
function FormMode() {
  const [form, setForm] = useState({
    title: '', description: '', skills: '',
    salaryMin: '', salaryMax: '', remotePolicy: 'office',
  });
  // 제출 시 chatCreateJob()에 폼 데이터를 ChatMessage 배열로 변환하여 전달
}
```

폼 필드: Job Title, Description (textarea), Required Skills (콤마 구분 + 태그 프리뷰),
Salary Range (min/max), Remote Policy (select).

- [ ] **Step 4: JobPreviewCard 컴포넌트**

```typescript
function JobPreviewCard({ job }: { job: JobPosting }) {
  // 공고 제목 + 상태 뱃지 + 설명 + 필수 스킬 태그 + 급여 범위
  // + 근무 형태 + "Publish Job" / "Edit" 버튼
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/jobs/
git commit -m "feat: add job creation page with chat mode and form mode"
```

---

## Task 3.3: 에스크로 예치 + 잔액 + 결제 내역 페이지

**Files:**
- Create: `frontend/src/app/escrow/page.tsx`
- Create: `frontend/src/app/escrow/layout.tsx`

- [ ] **Step 1: EscrowPage 구현**

```typescript
// frontend/src/app/escrow/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getEscrowBalance, getEscrowPayments, depositToEscrow } from '@/lib/api';
import { EscrowAccount, EscrowPayment } from '@/lib/types';

export default function EscrowPage() {
  const { user } = useAuth();
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null);
  const [payments, setPayments] = useState<EscrowPayment[]>([]);
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([getEscrowBalance(user.nearAccountId), getEscrowPayments()])
      .then(([balance, history]) => {
        setEscrow(balance);
        setPayments(history);
      });
  }, [user]);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (USE_DUMMY) {
      alert(`Deposit of ${amount} NEAR initiated (mock).`);
    } else {
      const nearAmount = (amount * 1e24).toLocaleString('fullwide', { useGrouping: false });
      const txParams = await depositToEscrow(nearAmount);
      alert(`Transaction prepared: Contract: ${txParams.contractId}...`);
    }
  };
  // ...
}
```

핵심 UI 구성 (2열 그리드 + 결제 내역 테이블):

1. **Balance Card** (좌측)
   - NEAR 잔액 큰 숫자 (`text-4xl font-extrabold`)
   - NEAR 아이콘 (SVG 원 + "N" 텍스트)
   - Agent Key 상태 표시 (녹색/빨간색 도트)

2. **Deposit Card** (우측)
   - 입력 필드 (숫자 + "NEAR" 접미사)
   - "Deposit" 버튼
   - 설명: "Funds are held in a NEAR smart contract..."

3. **Payment History** (전체 너비)
   - 테이블 헤더: Date / Type / Amount / Status / TX Hash
   - 빈 상태: "No payment history yet"
   - 행별: 날짜+시간, 타입 뱃지(DEPOSIT/HOLD/RELEASE/REFUND), 금액, 상태, TX Hash(모노폰트)

- [ ] **Step 2: PaymentRow 서브 컴포넌트**

```typescript
function PaymentRow({ payment }: { payment: EscrowPayment }) {
  const typeConfig = {
    DEPOSIT: { label: 'Deposit', color: 'bg-green-500/10 text-green-400', icon: 'arrow_downward' },
    RELEASE: { label: 'Release', color: 'bg-primary/10 text-primary', icon: 'arrow_upward' },
    // ...
  };
  // 날짜 포맷: "Apr 11, 2026" + "02:30 PM"
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/escrow/
git commit -m "feat: add escrow page with balance, deposit, and payment history"
```

---

## Task 3.4: 매칭 결과 페이지

**Files:**
- Create: `frontend/src/app/matching/page.tsx`
- Create: `frontend/src/app/matching/layout.tsx`

- [ ] **Step 1: MatchingPage 구현**

역할에 따라 "Job Matches" (구직자) 또는 "Candidate Matches" (채용담당자) 표시.

```typescript
// frontend/src/app/matching/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSeekerMatches, getEmployerMatches, accessProfile, agreeMatch } from '@/lib/api';
import { MatchResult, ProfileReport } from '@/lib/types';

export default function MatchingPage() {
  const { user } = useAuth();
  const isEmployer = user?.role === 'EMPLOYER';
  // isEmployer ? getEmployerMatches('job-1') : getSeekerMatches(user.id)
  // ...
}
```

- [ ] **Step 2: ScoreRing SVG 컴포넌트**

```typescript
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  // SVG 원형 프로그레스 + 중앙 퍼센트 텍스트
}
```

- [ ] **Step 3: 매칭 카드 구현**

각 매칭 결과를 카드로 표시:
- **ScoreRing** — rerankScore 기반 원형 프로그레스
- **랭크 뱃지** — `#{finalRank}` (`bg-primary/10 text-primary`)
- **공고 제목 + 회사명** + 경력 연차
- **스킬 태그** — `bg-muted text-muted-foreground`
- **점수 상세** — ANN Score, Rerank Score
- **액션 버튼** — Agree / View Profile (채용담당자 전용) / Decline

- [ ] **Step 4: ProfileModal 구현 (채용담당자 전용)**

채용담당자가 "View Profile" 클릭 시 `accessProfile(seekerId)` 호출 후 모달 표시.

```typescript
function ProfileModal({ report, onClose }: { report: ProfileReport; onClose: () => void }) {
  // 풀스크린 오버레이 + 모달 (max-w-2xl)
  // Market Value Range, Technical Skills (2열), Key Projects,
  // Collaboration Metrics (3열), Growth Curve (가로 스크롤), Verified Certifications
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/matching/
git commit -m "feat: add matching results page with score rings and profile modal"
```

---

## Phase 3 완료 기준

- [ ] `/resume` — 이력서 생성 시뮬레이션 → 3단계 진행 → 완성 후 6개 섹션 표시
- [ ] `/jobs/create` — Chat Mode AI 대화 → 공고 프리뷰 표시
- [ ] `/jobs/create` — Form Mode 수동 입력 → 공고 생성 완료 표시
- [ ] `/escrow` — 잔액 표시 + Deposit 입력 + 결제 내역 테이블
- [ ] `/matching` — 구직자 뷰: 매칭 점수 링 + Agree 버튼
- [ ] `/matching` — 채용담당자 뷰: View Profile → 프로필 모달 표시

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `frontend/src/app/resume/page.tsx` | Create |
| `frontend/src/app/resume/layout.tsx` | Create |
| `frontend/src/app/jobs/create/page.tsx` | Create |
| `frontend/src/app/jobs/layout.tsx` | Create |
| `frontend/src/app/escrow/page.tsx` | Create |
| `frontend/src/app/escrow/layout.tsx` | Create |
| `frontend/src/app/matching/page.tsx` | Create |
| `frontend/src/app/matching/layout.tsx` | Create |
