# Phase 11: AI Agentic UX — "AI Command Center" 전면 개선

> **Goal:** 전체 플로우에 "AI가 알아서 해준다"는 존재감을 녹여서, 해커톤 데모 임팩트 + 프로덕트 수준 UX 동시 달성
> **선행:** Phase 10 (인터페이스 정렬 완료)
> **예상 소요:** ~6시간
> **접근:** Approach A "AI Command Center" — 기존 UI 구조 유지하면서 AI 레이어를 얹는 방식

---

## 배경

현재 문제:
1. **AI 존재감 부재** — "AI 플랫폼"인데 AI가 어디 있는지 모르겠음. 헤더에 wallet 주소와 logout만 있음
2. **정적인 대시보드** — 데이터를 나열할 뿐, "다음에 뭘 해야 하는지" 맥락이 없음
3. **협상 모니터가 로그 뷰** — 채팅 로그일 뿐, AI가 "생각하고 있다"는 느낌이 없음
4. **온보딩 유도 부재** — 가입 후 데이터 소스 연결까지 안내가 없음
5. **전환/마이크로인터랙션 부족** — 페이지 간 이동이 딱딱하고 AI 플랫폼 느낌 없음

### 디자인 원칙

- **하이브리드 에이전시**: 중요한 건 유저에게 묻고, 나머지는 AI가 자동 처리
- **AI 파트너 패턴**: AI가 방해하지 않으면서도 "살아있음"을 느끼게
- **Progressive Disclosure**: 정보를 단계적으로 공개, 압도하지 않기
- **백엔드 변경 없음**: 프론트엔드 전용 구현 (기존 API 응답 기반 파생 상태)

---

## Task 11.1: AI Agent Presence System

> AI가 살아있다는 느낌을 전체 앱에 주입

**Files:**
- New: `frontend/src/hooks/useAgentStatus.ts`
- New: `frontend/src/components/layout/AgentStatusIndicator.tsx`
- New: `frontend/src/components/layout/AgentActivityStream.tsx`
- Modify: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

### Step 1: `useAgentStatus()` 훅

기존 API 응답(이력서 상태, 매칭 결과, 협상 라운드)을 기반으로 AI 상태를 파생 계산.

```typescript
type AgentState = 'idle' | 'analyzing' | 'negotiating' | 'waiting';

interface AgentStatus {
  state: AgentState;
  message: string;        // "Analyzing your GitHub data..."
  detail?: string;        // "127 repos, 2,340 commits"
  activities: Activity[]; // 최근 AI 활동 로그 (최대 5개)
}
```

상태 결정 로직:
- 이력서 status가 COLLECTING/ANALYZING → `analyzing` + "Analyzing your professional data..."
- 활성 협상 세션 존재 + 비터미널 → `negotiating` + "Negotiating Round N for {position}..."
- 매칭 결과 대기 중 → `analyzing` + "Finding best job matches..."
- 에이전트 승인 대기 → `waiting` + "Waiting for your approval on {item}"
- 그 외 → `idle` + "AI is on standby"

### Step 2: Agent Status Indicator (헤더)

- [ ] 헤더 우측, wallet 주소 왼쪽에 배치
- [ ] 상태별 비주얼:
  - `idle`: 회색 dot + 느린 pulse (3s period)
  - `analyzing`: 주황 dot + 빠른 pulse (1s period) + rotating ring
  - `negotiating`: 파란 dot + breathing animation + 라운드 숫자 badge
  - `waiting`: 녹색 dot + 정적 + subtle glow
- [ ] 한 줄 텍스트가 현재 AI 활동 요약 (모바일에서는 dot만 표시)
- [ ] 클릭 시 관련 페이지로 이동

### Step 3: Agent Activity Stream (사이드바 하단)

- [ ] 사이드바 네비게이션 아래, 최근 AI 활동 3개 표시
- [ ] 각 항목: 아이콘 + 텍스트 + 시간 (예: "Completed resume analysis · 2m ago")
- [ ] 클릭 시 해당 페이지로 이동
- [ ] 새 활동 추가 시 slide-in 애니메이션

---

## Task 11.2: Smart Dashboard (Context-Aware Command Center)

> 정적 데이터 나열 → "지금 뭘 해야 하는지" 알려주는 인텔리전스 허브

**Files:**
- New: `frontend/src/components/dashboard/AIActionCard.tsx`
- New: `frontend/src/components/dashboard/PipelineProgress.tsx`
- Modify: `frontend/src/app/dashboard/seeker/page.tsx`
- Modify: `frontend/src/app/dashboard/employer/page.tsx`

### Step 1: AI Action Card (최상단, 온보딩 카드 대체)

기존 OnboardingCard를 확장하여 **맥락 기반 다음 행동 제안**:

유저 상태에 따라 카드 내용이 동적 변경:
- 데이터소스 0개 → "Let's get started. Connect your GitHub to let AI analyze your skills." [Connect GitHub]
- 데이터소스 연결됨, 이력서 미생성 → "Your data is ready. Let AI generate your professional resume." [Generate Resume]
- 이력서 생성됨, 매칭 없음 → "Your AI resume is live. Waiting for employer matches..."
- 매칭 있음, 협상 없음 → "3 new matches found! Review and start negotiation." [View Matches]
- 협상 진행 중 → "Your agent is negotiating with Acme Corp. Round 3 of 5." [Watch Live]
- 협상 완료 → "Agreement reached! Review and approve the terms." [Review Agreement]

카드 디자인:
- 좌측: AI 아이콘 (상태별 애니메이션)
- 중앙: 한 줄 메시지 + 부가 설명
- 우측: 주요 CTA 버튼
- 하단: 진행률 도트 (전체 파이프라인 중 현재 위치)

### Step 2: Pipeline Progress Bar

가입 → 연결 → 분석 → 매칭 → 협상 → 합의 파이프라인을 시각적으로 표시:

```
  Connect  ──→  Analyze  ──→  Match  ──→  Negotiate  ──→  Agree
    ✓            ●(진행중)       ○            ○              ○
```

- 완료 단계: 체크 + primary color
- 현재 단계: pulse animation + 설명 텍스트
- 미래 단계: 회색 dot + muted

### Step 3: 기존 대시보드 위젯 순서 재배치

유저 상태에 따라 **가장 관련 있는 카드를 상단으로** 자동 정렬:
- 매칭 결과가 새로 왔으면 → MatchList 상단
- 협상 중이면 → NegotiationList 상단
- 이력서 미생성이면 → ResumeSummary + CTA 상단

---

## Task 11.3: Negotiation Theater

> 채팅 로그 → AI가 생각하고 전략적으로 행동하는 "극장" 경험

**Files:**
- New: `frontend/src/components/negotiation/ThinkingAnimation.tsx`
- New: `frontend/src/components/negotiation/StrategyInsight.tsx`
- New: `frontend/src/components/negotiation/RoundTransition.tsx`
- Modify: `frontend/src/app/negotiation/[sessionId]/page.tsx`

### Step 1: Thinking Animation 업그레이드

현재: bouncing dots + "Agent is thinking..."
변경: **단계적 thinking 표시**

```
Employer Agent is thinking...
├─ Analyzing seeker's counter-offer...     ✓
├─ Evaluating market salary data...        ✓
├─ Calculating optimal response...         ● (진행중)
└─ Preparing counter-proposal...           ○
```

실제 로직이 아닌 **시뮬레이션** — polling 간격(5초) 동안 단계적으로 체크마크가 채워지는 타이머 기반 애니메이션.
유저에게 "AI가 분석하고 있다"는 인상을 줌.

### Step 2: Strategy Insight 패널

각 라운드 proposal 카드 아래에 접이식 "AI Strategy" 패널:

```
💡 Strategy Insight
"Your agent increased the salary offer by $5K while removing the signing bonus.
 This is a common negotiation tactic — trading a one-time cost for recurring value."
```

기존 `reasoning` 필드를 좀 더 친절하게 재해석하여 표시.
유저가 "AI가 왜 이런 제안을 했는지" 이해할 수 있음.

### Step 3: Round Transition 애니메이션

라운드 간 전환 시:
- 새 라운드 divider가 fade-in + scale-up
- 이전 라운드 bubble이 살짝 축소 (0.98 scale)
- 새 bubble이 slide-up + fade-in (300ms delay)
- 배경에 subtle particle 효과 (accept/reject 시)

### Step 4: Terminal State 개선

합의 도달 시:
- 🎉 confetti-like particle 효과 (CSS only, 라이브러리 없음)
- 양측 에이전트 아바타가 가운데로 모이는 "handshake" 애니메이션
- "Agreement reached!" 배너가 scale-up + glow

실패 시:
- 화면 살짝 어두워지는 vignette 효과
- 양측 에이전트가 반대 방향으로 밀리는 애니메이션

---

## Task 11.4: Contextual AI Nudges

> 페이지마다 AI가 맥락에 맞는 한 줄 인사이트

**Files:**
- New: `frontend/src/components/ui/AINudge.tsx`
- Modify: 각 주요 페이지 (datasource, resume, matching, escrow)

### Step 1: AINudge 컴포넌트

```
┌─────────────────────────────────────────────┐
│ 🤖  GitHub 127개 레포 분석 완료.             │
│     Slack 연결하면 커뮤니케이션 스킬도        │
│     평가할 수 있어요.          [Connect Slack] │
└─────────────────────────────────────────────┘
```

- AI 아이콘 + 메시지 + 선택적 CTA
- subtle slide-in 애니메이션 (첫 표시 시)
- dismiss 가능 (X 버튼, localStorage에 상태 저장)
- 페이지별 맥락에 맞는 메시지

### Step 2: 페이지별 Nudge 메시지

**Datasource 페이지:**
- 0개 연결: "Start with GitHub — it gives the most comprehensive technical profile."
- GitHub만 연결: "Great start! Adding Slack reveals your collaboration style."
- 3개 연결: "One more source to go. Gov24 verifies your credentials on-chain."
- 4개 연결: "All sources connected. Your AI profile updates automatically every day."

**Resume 페이지:**
- 미생성: "Your data sources are ready. Generate your AI resume now — it takes about 30 seconds."
- 생성 중: "AI is analyzing your professional history across all connected sources..."
- 완료: "Your market value is estimated at $95K–$120K based on 2,340 commits and 189 PRs."

**Escrow 페이지 (Employer):**
- 잔액 0: "Deposit NEAR to start matching with candidates. Agent key setup is required for autonomous negotiation."
- 에이전트 키 없음: "Add an agent key to let AI negotiate on your behalf without manual approval each round."

---

## Task 11.5: Intelligent Transitions & Micro-interactions

> 전체 앱이 "살아있다"는 느낌을 주는 디테일

**Files:**
- New: `frontend/src/components/ui/PageTransition.tsx`
- New: `frontend/src/components/ui/CountUp.tsx`
- Modify: 각 주요 페이지

### Step 1: Page Transition

페이지 간 이동 시 content 영역에 subtle fade + slide-up (150ms):
- 나가는 페이지: opacity 1→0, translateY 0→-8px
- 들어오는 페이지: opacity 0→1, translateY 8px→0
- CSS transition으로 구현 (Framer Motion 없이)

### Step 2: CountUp 애니메이션

숫자가 포함된 모든 카드에서 0부터 목표 숫자까지 카운트업:
- Market Value: $0 → $95,000 (800ms, easeOut)
- Match Score: 0 → 92% (600ms)
- Escrow Balance: 0.00 → 10.50 NEAR (500ms)
- 페이지 최초 로드 시에만 실행

### Step 3: Staggered Card Loading

대시보드 카드들이 한번에 나타나지 않고 순차적으로 등장:
- 카드 1: 0ms delay
- 카드 2: 80ms delay
- 카드 3: 160ms delay
- 각 카드: opacity 0→1, translateY 12→0 (300ms, easeOut)

### Step 4: 데이터소스 연결 개선 (기존 Phase 11 내용 통합)

- [ ] 더미 데이터 초기 상태 → 미연결 (빈 배열)로 변경
- [ ] 연결 시 3단계 애니메이션: Connecting → Syncing → Connected
- [ ] 각 소스별 수집 데이터 실시간 카운트업 표시
- [ ] 회원가입 직후 `/datasource`로 자동 리다이렉트 또는 대시보드 AI Action Card에서 유도

---

## Task 11.6: 빌드 + 데모 시나리오 검증

- [ ] `npm run build` 성공
- [ ] 기존 테스트 통과
- [ ] 데모 시나리오 리허설:

### Seeker 데모 플로우 (3분)
1. 랜딩 페이지 → Sign Up → Job Seeker 선택 → Connect Wallet
2. **대시보드: AI Action Card → "Let's get started" CTA**
3. **헤더: Agent Status = "AI is on standby"**
4. Data Sources → GitHub Connect → **Thinking animation 단계별 표시**
5. **헤더: Agent Status → "Analyzing your GitHub data..."**
6. Slack, Discord, Gov24 순차 연결 → **Pipeline Progress 진행**
7. **AI Nudge: "All sources connected. Generate your resume."**
8. Resume 생성 → **카운트업: Market Value $95K–$120K**
9. Dashboard → **AI Action Card → "3 matches found!"**
10. 매칭 확인 → 협상 시작
11. **Negotiation Theater: Thinking 단계별 + Strategy Insight**
12. 합의 도달 → **Celebration 애니메이션** → Agreement 확인

### Employer 데모 플로우 (2분)
1. 로그인 → Employer Dashboard
2. **AI Action Card → "Deposit NEAR to start"**
3. Escrow → Deposit → Agent Key 추가
4. Create Job (AI Chat) → Job 발행
5. **헤더: "Found 3 matching seekers"**
6. Negotiation Monitor → 합의 확인

---

## Phase 11 완료 기준

- [ ] AI Agent Status Indicator가 헤더에서 실시간 상태 표시
- [ ] Agent Activity Stream이 사이드바에서 최근 활동 표시
- [ ] Smart Dashboard AI Action Card가 맥락 기반 다음 행동 제안
- [ ] Pipeline Progress Bar가 전체 진행 상황 시각화
- [ ] Negotiation Thinking Animation이 단계별 분석 과정 표시
- [ ] Strategy Insight가 AI 의사결정 근거 표시
- [ ] AI Nudge가 각 페이지에서 맥락 메시지 표시
- [ ] Page Transition + CountUp + Staggered Loading 적용
- [ ] 데이터소스 초기 상태 = 미연결
- [ ] 전체 Seeker + Employer 데모 시나리오 리허설 통과
