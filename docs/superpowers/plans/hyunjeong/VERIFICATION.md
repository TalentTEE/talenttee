# Verification Document — 현정 프론트엔드 전체 Phase 검증

**담당:** 현정
**검증 일자:** 2026-04-12 ~ 2026-04-14

---

## Phase 1: 프로젝트 셋업 + 더미 데이터 + 타입 정의

### 파일 존재 여부 확인

- [ ] `frontend/src/lib/types.ts` — 16개 이상 타입/인터페이스 정의
- [ ] `frontend/src/lib/dummy/user.ts` — DUMMY_ALICE, DUMMY_BOB 존재
- [ ] `frontend/src/lib/dummy/datasources.ts` — DUMMY_DATASOURCES (4개 프로바이더)
- [ ] `frontend/src/lib/dummy/resume.ts` — DUMMY_RESUME (skills, experience, education 포함)
- [ ] `frontend/src/lib/dummy/jobs.ts` — DUMMY_JOBS (2개 이상 공고)
- [ ] `frontend/src/lib/dummy/matches.ts` — DUMMY_SEEKER_MATCHES, DUMMY_EMPLOYER_MATCHES
- [ ] `frontend/src/lib/dummy/profile-report.ts` — DUMMY_PROFILE_REPORT
- [ ] `frontend/src/lib/dummy/negotiation.ts` — DUMMY_SESSIONS (2개), DUMMY_ROUNDS (3개)
- [ ] `frontend/src/lib/dummy/agreement.ts` — DUMMY_AGREEMENT
- [ ] `frontend/src/lib/dummy/escrow.ts` — DUMMY_ESCROW, DUMMY_ESCROW_PAYMENTS
- [ ] `frontend/src/lib/api.ts` — USE_DUMMY 플래그, apiFetch, authHeaders, 20+ API 함수
- [ ] `frontend/src/lib/auth.tsx` — AuthContext, AuthProvider, useAuth

### 기능 검증

- [ ] `npm run dev` → http://localhost:3000 정상 기동
- [ ] `types.ts`에서 User, ResumeProfile, JobPosting, MatchResult, NegotiationSession, NegotiationRound, AgreementRecord, EscrowAccount 등 모든 타입 export 확인
- [ ] `api.ts`에서 `USE_DUMMY=true` 시 모든 함수가 더미 데이터 반환 확인

---

## Phase 2: 로그인 + 대시보드 + 데이터소스 UI

### 파일 존재 여부 확인

- [ ] `frontend/src/components/auth/login-selector.tsx` — LoginSelector 컴포넌트
- [ ] `frontend/src/components/layout/header.tsx` — Header 컴포넌트
- [ ] `frontend/src/components/layout/sidebar.tsx` — Sidebar 컴포넌트 (seekerLinks, employerLinks)
- [ ] `frontend/src/app/dashboard/layout.tsx` — DashboardLayout (Header + Sidebar + main)
- [ ] `frontend/src/app/dashboard/seeker/page.tsx` — SeekerDashboard
- [ ] `frontend/src/app/dashboard/employer/page.tsx` — EmployerDashboard
- [ ] `frontend/src/app/datasource/page.tsx` — DatasourcePage
- [ ] `frontend/src/components/dashboard/job-seeking-toggle.tsx`
- [ ] `frontend/src/components/dashboard/datasource-status.tsx`
- [ ] `frontend/src/components/dashboard/resume-summary.tsx`
- [ ] `frontend/src/components/dashboard/market-value-card.tsx`
- [ ] `frontend/src/components/dashboard/escrow-balance.tsx`
- [ ] `frontend/src/components/dashboard/job-list.tsx`
- [ ] `frontend/src/components/dashboard/negotiation-list.tsx`

### 기능 검증

- [ ] `/` (메인) → Alice/Bob 선택 카드 2개 표시
- [ ] Alice 카드 클릭 → `/dashboard/seeker` 이동
- [ ] Bob 카드 클릭 → `/dashboard/employer` 이동
- [ ] 구직자 대시보드: "Welcome back, alice" 표시
- [ ] 구직자 대시보드: JobSeekingToggle 토글 동작
- [ ] 구직자 대시보드: DatasourceStatus 4개 프로바이더 표시
- [ ] 구직자 대시보드: ResumeSummary + MarketValueCard 2열 표시
- [ ] 구직자 대시보드: NegotiationList 2개 세션 표시
- [ ] 채용담당자 대시보드: "Welcome back, bob" 표시
- [ ] 채용담당자 대시보드: EscrowBalance 5.00 NEAR 표시
- [ ] 채용담당자 대시보드: JobList 채용공고 목록 표시
- [ ] Sidebar: 역할별 네비게이션 메뉴 표시 (Seeker 4개 / Employer 4개)
- [ ] Sidebar: 현재 경로 활성 링크 하이라이트
- [ ] Header: 역할 배지 + NEAR 계정 표시
- [ ] Header: 로그아웃 클릭 → `/` 이동
- [ ] `/datasource` → 4개 프로바이더 카드 표시
- [ ] `/datasource` → Connect 클릭 → Mock Connected 상태 전환
- [ ] `/datasource` → Connection Progress 프로그레스 바 갱신

---

## Phase 3: 이력서 + 채용공고 + 에스크로 + 매칭 페이지

### 파일 존재 여부 확인

- [ ] `frontend/src/app/resume/page.tsx` — ResumePage
- [ ] `frontend/src/app/resume/layout.tsx`
- [ ] `frontend/src/app/jobs/create/page.tsx` — CreateJobPage (ChatMode + FormMode)
- [ ] `frontend/src/app/jobs/layout.tsx`
- [ ] `frontend/src/app/escrow/page.tsx` — EscrowPage
- [ ] `frontend/src/app/escrow/layout.tsx`
- [ ] `frontend/src/app/matching/page.tsx` — MatchingPage (ScoreRing + ProfileModal)
- [ ] `frontend/src/app/matching/layout.tsx`

### 기능 검증

#### 이력서 페이지 (`/resume`)
- [ ] 초기 상태: "Generate Resume" 버튼 표시
- [ ] 버튼 클릭 → COLLECTING -> ANALYZING -> COMPLETED 3단계 진행 시뮬레이션
- [ ] 완성 후: AI Summary 텍스트 표시
- [ ] 완성 후: Market Value "6,000만 - 7,500만 / year" 표시
- [ ] 완성 후: Skills 태그 8개 (TypeScript, React 등) 표시
- [ ] 완성 후: Experience 타임라인 (2개 경력) 표시
- [ ] 완성 후: Education 카드 표시
- [ ] 완성 후: Strengths (3개) + Improvement Areas (2개) 2열 표시
- [ ] 완성 후: Negotiation Points (Leverage + Watch Out) 표시

#### 채용공고 작성 (`/jobs/create`)
- [ ] Chat Mode 탭 활성화 → AI 챗봇 초기 메시지 표시
- [ ] 사용자 입력 → 에이전트 질문 응답 → 반복
- [ ] 6회 이상 대화 → 공고 프리뷰 카드 표시
- [ ] Form Mode 탭 전환 → 폼 필드 표시 (Title, Description, Skills, Salary, Remote)
- [ ] 폼 제출 → "Job Posting Created!" 확인

#### 에스크로 (`/escrow`)
- [ ] 잔액 카드: "5.00 NEAR" 표시
- [ ] Agent Key 상태: "Configured" (녹색) 표시
- [ ] Deposit 입력 + 버튼 클릭 → mock alert 표시
- [ ] Payment History 테이블: 2건 결제 내역 표시

#### 매칭 결과 (`/matching`)
- [ ] 구직자: "Job Matches" 제목 + 매칭 카드 표시
- [ ] 매칭 카드: ScoreRing 퍼센트 표시 + 랭크 뱃지
- [ ] "Agree" 클릭 → "Agreed" 뱃지로 전환
- [ ] 채용담당자: "Candidate Matches" 제목
- [ ] "View Profile" 클릭 → ProfileModal 표시 (기술, 프로젝트, 자격증 등)

---

## Phase 4: 협상 모니터링 + 합의 확인

### 파일 존재 여부 확인

- [ ] `frontend/src/app/negotiation/[sessionId]/page.tsx` — NegotiationMonitorPage
- [ ] `frontend/src/app/negotiation/[sessionId]/agree/page.tsx` — AgreementPage
- [ ] `frontend/src/app/negotiation/layout.tsx`
- [ ] `frontend/src/app/negotiations/page.tsx` — NegotiationsPage
- [ ] `frontend/src/app/negotiations/layout.tsx`

### 기능 검증

#### 협상 모니터링 (`/negotiation/session-1`)
- [ ] 상태 바: "Employer Counter" 뱃지 + "3 / 7" 프로그레스 표시
- [ ] Agent Participants: Employer Agent (좌) / Seeker Agent (우)
- [ ] Round 1: Employer Agent 좌측 버블 — 65M 급여 제안
- [ ] Round 2: Seeker Agent 우측 버블 — 70M 카운터 (+5M 초록색)
- [ ] Round 3: Employer Agent 좌측 버블 — 68M 카운터 (-2M 빨간색)
- [ ] 각 라운드: reasoning 인용 메시지 표시
- [ ] 각 라운드: 제안 카드 (급여, 근무형태, 근무시간, 보너스)
- [ ] 각 라운드: decision 뱃지 (COUNTER 노란색)
- [ ] 진행 중: 타이핑 인디케이터 (3개 도트 바운스)

#### 합의 확인 (`/negotiation/session-2/agree`)
- [ ] "Agreement Reached" 배너 표시
- [ ] 합의 상세: Position, Salary, Work Type, Start Date, Probation, Rounds
- [ ] Agreement Hash 모노폰트 표시
- [ ] On-Chain Warning 경고 메시지 표시
- [ ] "Approve & Record On-Chain" 클릭 → TX Hash 생성 및 표시
- [ ] "Reject" 클릭 → "Agreement Rejected" 상태 표시

#### 협상 목록 (`/negotiations`)
- [ ] "In Progress" 섹션: session-1 표시 (Negotiating 상태)
- [ ] "Completed" 섹션: session-2 표시 (Agreed 상태)
- [ ] 진행 중 세션 클릭 → `/negotiation/session-1` 이동
- [ ] 합의 세션 클릭 → `/negotiation/session-2/agree` 이동

---

## Phase 5: 백엔드 API 연결 (Auth + Escrow)

### 파일 존재 여부 확인

- [ ] `frontend/package.json` — `"near-api-js": "^7.2.0"` 포함
- [ ] `frontend/src/lib/api.ts` — requestChallenge(), verifyNearAuth(), yoctoToNear(), depositToEscrow() 함수 존재
- [ ] `frontend/src/lib/auth.tsx` — loginWithNear() 함수 challenge->verify->JWT 흐름 구현
- [ ] `frontend/src/components/auth/login-selector.tsx` — USE_DUMMY 분기, 커스텀 NEAR 계정 입력, 에러/로딩 상태

### 기능 검증 (NEXT_PUBLIC_USE_DUMMY=true)

- [ ] 기존 더미 모드 동작 정상 유지 (회귀 테스트)
- [ ] Alice/Bob 더미 로그인 → 대시보드 정상 진입
- [ ] 커스텀 NEAR 계정 입력 UI 숨겨짐

### 기능 검증 (NEXT_PUBLIC_USE_DUMMY=false, 백엔드 기동 필요)

- [ ] Alice 카드 클릭 → `requestChallenge()` 호출 → nonce 수신
- [ ] `verifyNearAuth()` 호출 → JWT + User 반환
- [ ] JWT가 `localStorage.getItem('jwt')`에 저장됨
- [ ] 대시보드 진입 후 API 호출에 `Authorization: Bearer {jwt}` 헤더 포함
- [ ] 커스텀 NEAR 계정 입력 UI 표시됨
- [ ] 커스텀 계정 입력 + 역할 선택 + Login → 인증 흐름 동작
- [ ] 인증 실패 시 에러 메시지 "Login failed" 표시
- [ ] Escrow 잔액 조회: `getEscrowBalance(user.nearAccountId)` → 실제 잔액 반환
- [ ] yoctoToNear 변환 정확: 1e24 yocto → 1.00 NEAR
- [ ] Deposit 버튼 → `depositToEscrow()` → 트랜잭션 파라미터 반환
- [ ] 채용담당자 대시보드 EscrowBalance: 실제 잔액 표시

---

## 전체 통합 검증 (End-to-End Flow)

### 구직자 플로우

- [ ] 1. `/` → Alice 카드 클릭 → 로그인 → `/dashboard/seeker`
- [ ] 2. 사이드바 "Data Sources" → `/datasource` → 4개 프로바이더 연결
- [ ] 3. 사이드바 "Resume" → `/resume` → Generate → 이력서 완성 확인
- [ ] 4. 사이드바 "Negotiations" → `/negotiations` → 세션 목록 확인
- [ ] 5. session-1 클릭 → `/negotiation/session-1` → 3라운드 모니터링
- [ ] 6. session-2 클릭 → `/negotiation/session-2/agree` → 합의 확인 + 승인

### 채용담당자 플로우

- [ ] 1. `/` → Bob 카드 클릭 → 로그인 → `/dashboard/employer`
- [ ] 2. 사이드바 "Create Job" → `/jobs/create` → Chat Mode로 공고 작성
- [ ] 3. 사이드바 "Escrow" → `/escrow` → 잔액 확인 + Deposit
- [ ] 4. 사이드바 "Negotiations" → `/negotiations` → 세션 목록 확인
- [ ] 5. session-2 클릭 → `/negotiation/session-2/agree` → 합의 확인

### 공통 검증

- [ ] 모든 페이지에서 Header 정상 표시 (로고, 역할 배지, NEAR 계정, 로그아웃)
- [ ] 모든 페이지에서 Sidebar 정상 표시 (역할별 메뉴, 활성 링크)
- [ ] 로그아웃 → `/` 이동 → localStorage 클리어
- [ ] `npm run build` → 빌드 에러 없음
