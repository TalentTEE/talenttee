# Phase 6: 백엔드 API 연결 — 나머지 (이력서/데이터소스/공고/매칭/프로필/협상/합의) (Day 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 5에서 Auth + Escrow만 연결했으므로, 나머지 모든 API를 실제 백엔드로 연결한다. 이력서(생성+polling), 데이터소스(상태+OAuth), 공고(대화형 작성), 매칭(결과 조회), 프로필 열람, 협상(세션/라운드/개입), 합의(조회/승인) API를 `USE_DUMMY=false` 분기에서 실제 호출하도록 전환
**선행:** Phase 5 (Auth + Escrow 실제 연결 완료), 준하 백엔드 (이력서/데이터소스/매칭/프로필 API), 승연 백엔드 (공고/협상/합의 API)
**완료 기준:** `NEXT_PUBLIC_USE_DUMMY=false` 시 전체 API 호출 동작 — 이력서 생성 → 데이터소스 연결 → 공고 작성 → 매칭 조회 → 프로필 열람 → 협상 모니터링 → 합의 확인 전체 플로우
**예상 소요:** ~2시간
**상태:** ⬜ 미구현

---

## Task 6.1: 이력서 API 연결 — 생성 + polling + 상태 전이

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/resume/page.tsx`

- [ ] **Step 1: generateResume() 실제 API 호출 (202 Accepted 처리)**

기존 더미 분기는 유지하면서, `USE_DUMMY=false` 시 실제 `POST /resume/generate`를 호출한다.
서버는 202 Accepted를 반환하므로, 응답 후 polling으로 상태를 확인해야 한다.

```typescript
// frontend/src/lib/api.ts — generateResume 수정

export async function generateResume(): Promise<{ resumeId: string }> {
  if (USE_DUMMY) return { resumeId: 'dummy-resume-1' };
  const res = await fetch(`${API_URL}/resume/generate`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (res.status !== 202 && !res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json(); // { resumeId: string }
}
```

- [ ] **Step 2: getResumeStatus() polling 전이 확인**

```typescript
// frontend/src/lib/api.ts — getResumeStatus 수정 (이미 존재, 동작 확인)

export async function getResumeStatus(resumeId: string): Promise<{ status: string }> {
  if (USE_DUMMY) return { status: 'COMPLETED' };
  return apiFetch(`/resume/${resumeId}/status`);
}
```

- [ ] **Step 3: resume/page.tsx에서 polling 루프 구현**

"Generate Resume" 버튼 클릭 시:
1. `generateResume()` → `{ resumeId }` 수신
2. `setInterval`로 2초마다 `getResumeStatus(resumeId)` 호출
3. status가 `COLLECTING` → `ANALYZING` → `COMPLETED` 전이 시 UI 업데이트
4. `COMPLETED` 도달 시 `getResume(userId)` 호출하여 전체 이력서 로드

```typescript
// frontend/src/app/resume/page.tsx — handleGenerate 수정

const handleGenerate = async () => {
  setGenerating(true);
  setStatus('COLLECTING');

  if (USE_DUMMY) {
    // 기존 더미 시뮬레이션 유지
    setTimeout(() => setStatus('ANALYZING'), 1500);
    setTimeout(() => {
      setStatus('COMPLETED');
      getResume(user!.id).then(setResume);
      setGenerating(false);
    }, 3000);
    return;
  }

  // 실제 API 호출
  const { resumeId } = await generateResume();
  const pollInterval = setInterval(async () => {
    const { status: currentStatus } = await getResumeStatus(resumeId);
    setStatus(currentStatus as ResumeProfile['status']);

    if (currentStatus === 'COMPLETED') {
      clearInterval(pollInterval);
      const fullResume = await getResume(user!.id);
      setResume(fullResume);
      setGenerating(false);
    }
  }, 2000);
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/resume/page.tsx
git commit -m "feat: connect resume API with 202 Accepted polling flow"
```

---

## Task 6.2: 데이터소스 API 연결 — 상태 조회 + GitHub OAuth

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/datasource/page.tsx`

- [ ] **Step 1: getDatasourceStatus() 실제 API 확인**

기존 함수는 이미 `USE_DUMMY=false` 분기에서 `/datasource/status`를 호출하므로 동작 확인만 한다.

```typescript
// frontend/src/lib/api.ts — 이미 존재, 동작 확인
export async function getDatasourceStatus(): Promise<DataSourceConnection[]> {
  if (USE_DUMMY) return DUMMY_DATASOURCES;
  return apiFetch('/datasource/status');
}
```

- [ ] **Step 2: connectGithubOAuth() 함수 추가 — OAuth 리다이렉트**

GitHub 데이터소스 연결은 OAuth flow를 사용한다. 백엔드가 OAuth redirect URL을 반환하면, 프론트에서 해당 URL로 리다이렉트한다.

```typescript
// frontend/src/lib/api.ts — GitHub OAuth 함수 추가

export async function connectGithubOAuth(): Promise<{ redirectUrl: string }> {
  return apiFetch('/datasource/connect/github');
}
```

- [ ] **Step 3: datasource/page.tsx에서 GitHub Connect 시 OAuth 리다이렉트**

```typescript
// frontend/src/app/datasource/page.tsx — handleConnect 수정

const handleConnect = async (provider: string) => {
  if (USE_DUMMY) {
    // 기존 Mock 연결 유지
    const updated = await connectDatasourceMock(provider);
    setDatasources(prev => prev.map(ds =>
      ds.provider === provider ? { ...ds, status: 'CONNECTED' as const } : ds
    ));
    return;
  }

  if (provider === 'github') {
    // GitHub은 OAuth 리다이렉트
    const { redirectUrl } = await connectGithubOAuth();
    window.location.href = redirectUrl;
    return;
  }

  // 나머지 프로바이더는 아직 Mock
  const updated = await connectDatasourceMock(provider);
  setDatasources(prev => prev.map(ds =>
    ds.provider === provider ? { ...ds, status: 'CONNECTED' as const } : ds
  ));
};
```

- [ ] **Step 4: OAuth 콜백 처리 (쿼리 파라미터 확인)**

GitHub OAuth 콜백 후 `/datasource?connected=github` 등의 쿼리 파라미터가 올 수 있다.
페이지 로드 시 쿼리 파라미터를 확인하여 상태를 갱신한다.

```typescript
// frontend/src/app/datasource/page.tsx — useEffect에 OAuth 콜백 처리 추가

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('connected')) {
    // OAuth 콜백 후 상태 재조회
    getDatasourceStatus().then(setDatasources);
  }
}, []);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/datasource/page.tsx
git commit -m "feat: connect datasource API with GitHub OAuth redirect flow"
```

---

## Task 6.3: 공고 API 연결 — 대화형 작성

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/jobs/create/page.tsx`

- [ ] **Step 1: chatCreateJob() 실제 API 확인**

기존 함수는 이미 `USE_DUMMY=false` 분기에서 `POST /jobs/chat`을 호출하므로 동작 확인만 한다.

```typescript
// frontend/src/lib/api.ts — 이미 존재, 실제 백엔드 응답 형태 확인

export async function chatCreateJob(messages: ChatMessage[]): Promise<JobChatResponse> {
  if (USE_DUMMY) { /* ... */ }
  return apiFetch('/jobs/chat', { method: 'POST', body: JSON.stringify({ messages }) });
}
```

- [ ] **Step 2: jobs/create/page.tsx에서 실제 API 응답 처리 확인**

백엔드 `POST /jobs/chat` 응답 형태:
- `{ complete: false, question: "..." }` → 다음 질문 표시
- `{ complete: true, jobPosting: { ... } }` → 공고 프리뷰 표시

기존 chatCreateJob 함수가 동일 인터페이스를 반환하므로, page 코드 변경 불필요.
실제 백엔드 기동 후 응답 형태가 일치하는지만 확인한다.

- [ ] **Step 3: createJob() 직접 생성 함수 추가 (Form Mode용)**

```typescript
// frontend/src/lib/api.ts — Form Mode 직접 공고 생성

export async function createJob(jobData: Partial<JobPosting>): Promise<JobPosting> {
  if (USE_DUMMY) return { ...DUMMY_JOBS[0], ...jobData } as JobPosting;
  return apiFetch('/jobs', { method: 'POST', body: JSON.stringify(jobData) });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/jobs/create/page.tsx
git commit -m "feat: connect job creation API — chat mode and form mode"
```

---

## Task 6.4: 매칭 API 연결 — 실제 결과 조회

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/matching/page.tsx`

- [ ] **Step 1: getSeekerMatches() / getEmployerMatches() 실제 API 확인**

기존 함수가 이미 `USE_DUMMY=false` 분기에서 실제 API를 호출하므로 동작 확인만 한다.

```typescript
// frontend/src/lib/api.ts — 이미 존재

export async function getSeekerMatches(seekerId: string): Promise<MatchResult[]> {
  if (USE_DUMMY) return DUMMY_SEEKER_MATCHES;
  return apiFetch(`/match/seeker/${seekerId}`);
}

export async function getEmployerMatches(jobId: string): Promise<MatchResult[]> {
  if (USE_DUMMY) return DUMMY_EMPLOYER_MATCHES;
  return apiFetch(`/match/job/${jobId}`);
}
```

- [ ] **Step 2: matching/page.tsx에서 빈 결과 처리**

실제 백엔드에서 매칭 결과가 0건일 수 있으므로, 빈 상태 UI를 추가한다.

```typescript
// frontend/src/app/matching/page.tsx — 빈 결과 처리 추가

{matches.length === 0 && !loading && (
  <div className="bg-card rounded-2xl border border-border/10 p-12 text-center">
    <span className="material-symbols-outlined text-4xl text-muted-foreground">search_off</span>
    <p className="text-sm font-semibold mt-3">No matches found yet</p>
    <p className="text-xs text-muted-foreground mt-1">
      Matches will appear here once the system finds suitable candidates/jobs.
    </p>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/matching/page.tsx
git commit -m "feat: connect matching API with empty state handling"
```

---

## Task 6.5: 프로필 열람 API 연결

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/matching/page.tsx` (ProfileModal 내)

- [ ] **Step 1: accessProfile() 실제 API 확인**

```typescript
// frontend/src/lib/api.ts — 이미 존재

export async function accessProfile(seekerId: string): Promise<ProfileReport> {
  if (USE_DUMMY) return DUMMY_PROFILE_REPORT;
  return apiFetch(`/profile/${seekerId}/access`, { method: 'POST' });
}
```

`POST /profile/{seekerId}/access` 호출 시 에스크로에서 자동 결제가 발생한다.
프론트에서는 결제 결과를 별도로 처리할 필요 없이, 반환된 ProfileReport를 그대로 표시한다.

- [ ] **Step 2: 프로필 열람 실패 시 에러 처리 (잔액 부족 등)**

```typescript
// frontend/src/app/matching/page.tsx — handleViewProfile 수정

const handleViewProfile = async (seekerId: string) => {
  try {
    setProfileLoading(true);
    const report = await accessProfile(seekerId);
    setSelectedProfile(report);
    setModalOpen(true);
  } catch (err) {
    // 잔액 부족 등 에러 처리
    alert(err instanceof Error ? err.message : 'Failed to access profile. Please check your escrow balance.');
  } finally {
    setProfileLoading(false);
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/matching/page.tsx
git commit -m "feat: connect profile access API with escrow payment error handling"
```

---

## Task 6.6: 협상 API 연결 — 세션/라운드/개입

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/negotiation/[sessionId]/page.tsx`
- Modify: `frontend/src/app/negotiations/page.tsx`

- [ ] **Step 1: 협상 API 함수 실제 동작 확인**

기존 함수가 이미 `USE_DUMMY=false` 분기에서 실제 API를 호출하므로 동작 확인만 한다.

```typescript
// frontend/src/lib/api.ts — 이미 존재

getNegotiationSessions()    // GET /negotiation/sessions
getNegotiationSession(id)   // GET /negotiation/sessions/{id}
getNegotiationRounds(id)    // GET /negotiation/sessions/{id}/rounds
sendIntervention(id, dir)   // POST /negotiation/sessions/{id}/intervene
```

- [ ] **Step 2: 협상 모니터링 페이지에서 자동 polling 추가 (진행 중 세션)**

진행 중인 세션은 새 라운드가 추가될 수 있으므로, 주기적 polling을 추가한다.

```typescript
// frontend/src/app/negotiation/[sessionId]/page.tsx — polling 추가

useEffect(() => {
  if (!sessionId) return;

  const loadData = () => {
    getNegotiationSession(sessionId).then(setSession);
    getNegotiationRounds(sessionId).then(setRounds);
  };

  loadData(); // 초기 로드

  // 진행 중 세션이면 5초마다 polling
  const interval = setInterval(() => {
    if (!isTerminal) loadData();
  }, 5000);

  return () => clearInterval(interval);
}, [sessionId, isTerminal]);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/negotiation/ frontend/src/app/negotiations/
git commit -m "feat: connect negotiation API with auto-polling for active sessions"
```

---

## Task 6.7: 합의 API 연결

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/negotiation/[sessionId]/agree/page.tsx`

- [ ] **Step 1: 합의 API 함수 실제 동작 확인**

```typescript
// frontend/src/lib/api.ts — 이미 존재

getAgreement(sessionId)       // GET /agreement/{sessionId}
approveAgreement(sessionId)   // POST /negotiation/sessions/{sessionId}/approve
```

- [ ] **Step 2: 합의 승인 후 실제 TX Hash 수신 처리**

더미 모드에서는 클라이언트에서 mock TX Hash를 생성했지만, 실제 API에서는 서버가 온체인 기록 후 TX Hash를 반환한다.

```typescript
// frontend/src/app/negotiation/[sessionId]/agree/page.tsx — handleApprove 수정

const handleApprove = async () => {
  try {
    setApproving(true);
    if (USE_DUMMY) {
      // 기존 더미 mock TX 생성 유지
      const mockTx = `0x${Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)).join('')}`;
      setTxHash(mockTx);
    } else {
      // 실제 API — 서버가 온체인 기록 후 TX Hash 반환
      const result = await approveAgreement(sessionId);
      // approveAgreement가 void이면, getAgreement를 재호출하여 txHash 확인
      const updatedAgreement = await getAgreement(sessionId);
      setTxHash(updatedAgreement.onChainTxHash);
      setAgreement(updatedAgreement);
    }
    setApproved(true);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to approve agreement');
  } finally {
    setApproving(false);
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/negotiation/[sessionId]/agree/
git commit -m "feat: connect agreement API with real on-chain TX hash retrieval"
```

---

## Phase 6 완료 기준

- [ ] `NEXT_PUBLIC_USE_DUMMY=false` + 백엔드 기동 시 전체 API 동작:
  - 이력서: `generateResume()` → 202 Accepted → polling → `COMPLETED` 후 전체 이력서 로드
  - 데이터소스: `getDatasourceStatus()` → 실제 연결 상태, GitHub OAuth 리다이렉트 동작
  - 공고: `chatCreateJob()` → 대화형 작성 플로우 동작, `createJob()` → 폼 직접 생성 동작
  - 매칭: `getSeekerMatches()` / `getEmployerMatches()` → 실제 매칭 결과 표시
  - 프로필: `accessProfile()` → 프로필 리포트 로드 + 에스크로 자동결제
  - 협상: 세션/라운드 조회 + 진행 중 세션 자동 polling + 개입(intervene) 호출
  - 합의: `getAgreement()` → 합의 상세, `approveAgreement()` → 온체인 TX Hash 확인
- [ ] 매칭 결과 0건 시 빈 상태 UI 정상 표시
- [ ] 프로필 열람 실패 시 (잔액 부족 등) 에러 메시지 표시
- [ ] `NEXT_PUBLIC_USE_DUMMY=true` 시 기존 더미 동작 정상 유지 (회귀 없음)
- [ ] `npm run build` → 빌드 에러 없음

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `frontend/src/lib/api.ts` | Modify (generateResume 202 처리, connectGithubOAuth 추가, createJob 추가) |
| `frontend/src/app/resume/page.tsx` | Modify (polling 루프 구현) |
| `frontend/src/app/datasource/page.tsx` | Modify (GitHub OAuth 리다이렉트, 콜백 처리) |
| `frontend/src/app/jobs/create/page.tsx` | Modify (실제 API 응답 확인) |
| `frontend/src/app/matching/page.tsx` | Modify (빈 결과 UI, 프로필 열람 에러 처리) |
| `frontend/src/app/negotiation/[sessionId]/page.tsx` | Modify (자동 polling 추가) |
| `frontend/src/app/negotiations/page.tsx` | Modify (실제 API 확인) |
| `frontend/src/app/negotiation/[sessionId]/agree/page.tsx` | Modify (실제 TX Hash 수신) |
