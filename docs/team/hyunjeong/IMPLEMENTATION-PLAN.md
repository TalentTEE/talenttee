# 현정 프론트엔드 구현 플랜

> **마감**: 2026-04-17 | **역할**: 전체 UI 구현 (더미 데이터 선행 → 백엔드 연결)

---

## 전체 일정 요약

| Stage | 내용 | 예상 일정 | 상태 |
|-------|------|----------|------|
| 1 | 프로젝트 초기 셋업 | Day 1 오전 (4/12) | ✅ 완료 |
| 2 | 데이터 레이어 | Day 1 오전 (4/12) | ✅ 완료 |
| 3 | 로그인 + 대시보드 | Day 1 오후 (4/12) | ✅ 완료 |
| 4 | 개별 페이지 4개 | Day 2 오전 (4/13) | 🔄 진행중 (미커밋) |
| 5 | 핵심 데모 화면 | Day 2 오후 (4/13) | 🔄 진행중 (미커밋) |
| 6 | 백엔드 API 연결 | Day 3 (4/14) | ⬜ |
| 7 | ECDH 복호화 + 에스크로 연결 | Day 4 (4/15) | ⬜ |
| 8 | UX 폴리싱 + 데모 리허설 | Day 5-6 (4/16-17) | ⬜ |

---

## Stage 1: 프로젝트 초기 셋업 ✅

### 목표
Next.js 프로젝트 생성 + UI 라이브러리 설치 + 타입 정의

### 작업 항목

#### 1-1. Next.js 프로젝트 생성
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

#### 1-2. shadcn/ui 초기화 + 컴포넌트 설치
```bash
npx shadcn@latest init -d
npx shadcn@latest add button card badge input textarea tabs progress avatar separator scroll-area dialog alert
```

#### 1-3. 환경변수 파일 생성
- `frontend/.env.local` 생성
```env
NEXT_PUBLIC_USE_DUMMY=true
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### 1-4. 공유 타입 정의
- `frontend/src/lib/types.ts` — 전체 인터페이스 정의
- User, DataSourceConnection, ResumeProfile, JobPosting, MatchResult, ProfileReport
- NegotiationSession, NegotiationRound, AgreementRecord, EscrowAccount 등

### 완료 기준
- [x] `npm run build` 성공
- [x] `npx tsc --noEmit` 타입 에러 없음

### 커밋
```bash
git commit -m "feat: initialize Next.js frontend with Tailwind + shadcn/ui + shared types"
```

---

## Stage 2: 데이터 레이어 ✅

### 목표
더미 데이터 + API 스위칭 레이어 + 인증 컨텍스트 구현

### 작업 항목

#### 2-1. 더미 데이터 파일 9개 작성
위치: `frontend/src/lib/dummy/`

| 파일 | 내용 |
|------|------|
| `user.ts` | Alice(구직자), Bob(채용담당자) 프로필 |
| `datasources.ts` | GitHub/Slack/Discord/정부24 연결 상태 |
| `resume.ts` | 완성된 이력서 + 시장가치 |
| `jobs.ts` | 채용공고 3개 |
| `matches.ts` | 구직자/채용자 매칭 결과 Top-5 |
| `profile-report.ts` | 상세 프로필 리포트 |
| `negotiation.ts` | 협상 세션 2개 + 라운드 3개 |
| `agreement.ts` | 합의 결과 + 온체인 기록 |
| `escrow.ts` | 에스크로 잔액 + 결제 내역 |

#### 2-2. API 레이어 작성
- `frontend/src/lib/api.ts`
- `NEXT_PUBLIC_USE_DUMMY` 환경변수로 더미/실제 API 스위칭
- 패턴:
```typescript
export async function getResume(id: string): Promise<ResumeProfile> {
  if (USE_DUMMY) return DUMMY_RESUME;
  return apiFetch(`/resume/${id}`);
}
```
- 모든 API 엔드포인트에 동일 패턴 적용 (총 ~20개 함수)

#### 2-3. AuthContext 작성
- `frontend/src/lib/auth.tsx`
- `AuthProvider` — React Context로 로그인 상태 관리
- `useAuth()` 훅 — user, login, logout, isLoading 제공
- 더미 모드: Alice/Bob 선택 → localStorage 저장
- JWT는 localStorage에 `jwt` 키로 저장 → API 요청 시 Authorization 헤더

### 완료 기준
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] 모든 더미 데이터가 타입과 일치

### 커밋
```bash
git commit -m "feat: add dummy data, API layer, and AuthContext"
```

---

## Stage 3: 로그인 + 대시보드 ✅

### 목표
로그인 → role별 대시보드 이동 → 더미 데이터 렌더링

### 작업 항목

#### 3-1. 루트 레이아웃 수정
- `frontend/src/app/layout.tsx` — AuthProvider 감싸기

#### 3-2. 로그인 페이지
- `frontend/src/app/page.tsx`
- `frontend/src/components/auth/login-selector.tsx`
- Alice(구직자) / Bob(채용담당자) 카드 선택 → 클릭 시 해당 대시보드로 이동

#### 3-3. 공통 레이아웃 컴포넌트
- `frontend/src/components/layout/header.tsx` — 지갑 주소 + role 뱃지 + 로그아웃
- `frontend/src/components/layout/sidebar.tsx` — role별 네비게이션 링크
  - 구직자: Dashboard / Data Sources / Resume / **Negotiations**
  - 채용자: Dashboard / Create Job / Escrow / **Negotiations**

#### 3-4. 대시보드 공통 레이아웃
- `frontend/src/app/dashboard/layout.tsx` — Header + Sidebar + main

#### 3-5. 구직자 대시보드 (`/dashboard/seeker`)
구성 컴포넌트:

| 컴포넌트 | 파일 | 내용 |
|----------|------|------|
| **JobSeekingToggle** | `components/dashboard/job-seeking-toggle.tsx` | **구직 활동 ON/OFF 토글** — 핵심 동의 메커니즘 |
| DatasourceStatus | `components/dashboard/datasource-status.tsx` | 데이터소스 연결 상태 뱃지 |
| ResumeSummary | `components/dashboard/resume-summary.tsx` | 이력서 요약 카드 |
| MarketValueCard | `components/dashboard/market-value-card.tsx` | 적정 연봉 범위 카드 |
| NegotiationList | `components/dashboard/negotiation-list.tsx` | 진행 중 협상 목록 (매칭 점수 포함) |

> **"구직 활동" 토글 설계**
> - 토글 OFF(기본): 프로필이 매칭 풀에 포함되지 않음. 매칭/협상 미발생
> - 토글 ON 시: 사용자에게 한 번 안내 ("구직 활동을 켜면 AI가 자동으로 매칭하고, 매칭된 공고에 대해 자동으로 협상을 진행합니다")
> - 토글 ON 상태에서는 **매칭 → 협상이 별도 동의 없이 자동으로 이어짐**
> - 사용자 개입은 협상 중 "개입 입력"과 최종 "합의 승인/거절"에서만 발생
> - 토글 상태는 API(`PUT /seeker/job-seeking-status`)로 서버에 전송

#### 3-6. 채용담당자 대시보드 (`/dashboard/employer`)
추가 컴포넌트:

| 컴포넌트 | 파일 | 내용 |
|----------|------|------|
| EscrowBalance | `components/dashboard/escrow-balance.tsx` | 에스크로 잔액 표시 |
| JobList | `components/dashboard/job-list.tsx` | 내 공고 목록 |

- NegotiationList는 구직자 대시보드와 공유

### 완료 기준
- [ ] 로그인 → Alice 선택 → `/dashboard/seeker` 이동 + 5개 카드 렌더링
- [ ] 로그인 → Bob 선택 → `/dashboard/employer` 이동 + 4개 카드 렌더링
- [ ] 로그아웃 → `/` 로그인 페이지 이동

### 커밋
```bash
git commit -m "feat: add login page and seeker/employer dashboards"
```

---

## Stage 4: 개별 페이지 4개

### 목표
데이터소스 연결, 이력서 상세, 대화형 공고 작성, 에스크로 예치 페이지

### 작업 항목

#### 4-1. 데이터소스 연결 페이지 (`/datasource`)
- `frontend/src/app/datasource/page.tsx`
- GitHub / Slack / Discord / 정부24 카드 4개
- 각 카드에 "연결하기" 버튼 (Mock 연결) / "동기화" 버튼 (연결 후)
- 연결 상태 뱃지 (연결됨/미연결)
- GitHub만 실제 OAuth (Day 3에 구현), 나머지 Mock

#### 4-2. 이력서 상세 페이지 (`/resume`)
- `frontend/src/app/resume/page.tsx`
- `frontend/src/components/resume/generation-progress.tsx` — 상태 프로그레스 바 (수집 중 → 분석 중 → 완성!)
- `frontend/src/components/resume/resume-detail.tsx` — 기술 태그, 경력 타임라인, 학력, AI 분석 요약, 시장가치 카드
- "이력서 생성" 버튼 클릭 → 1.5초 간격 상태 전이 시뮬레이션 → 완성 후 상세 표시

#### 4-3. 대화형 공고 작성 페이지 (`/jobs/create`)
- `frontend/src/app/jobs/create/page.tsx`
- `frontend/src/components/jobs/chat-ui.tsx` — 채팅 인터페이스
  - 에이전트가 질문 → 사용자 답변 → 다음 질문 → 6회 후 공고 완성
  - 바운더리 설정 포함: **최대 협상 인원** (한 공고당 몇 명의 후보자와 협상할지, 비용 제어용)
- `frontend/src/components/jobs/job-form.tsx` — 직접 입력 폼
  - 최대 협상 인원 입력 필드 포함
- Tabs 컴포넌트로 "대화형 작성" / "폼으로 전환" 탭 전환

> **비용 구조**: 매칭 순위 상위 후보자가 최대 협상 인원 수만큼 자동으로 협상 진입.
> 협상 시 실제 이력 정보 열람 비용이 에스크로 크레딧에서 자동 결제됨.

#### 4-4. 에스크로 예치 페이지 (`/escrow`)
- `frontend/src/app/escrow/page.tsx`
- 잔액 표시 (큰 숫자)
- 예치 금액 입력 + "예치하기" 버튼 (더미: alert)
- 결제 내역 목록

### 완료 기준
- [ ] `/datasource` — 4개 소스 카드 + Mock 연결 동작
- [ ] `/resume` — 생성 프로그레스 + 완성된 이력서 표시
- [ ] `/jobs/create` — 채팅 탭 + 폼 탭 동작
- [ ] `/escrow` — 잔액 + 예치 + 내역 표시

### 커밋
```bash
git commit -m "feat: add datasource, resume, job creation, escrow pages"
```

---

## Stage 5: 핵심 데모 화면

### 목표
협상 모니터링 + 합의 확인 + 매칭 결과 (프로필 리포트 포함) — 데모 핵심 화면

### 작업 항목

#### 5-1. 협상 모니터링 페이지 (`/negotiation/[sessionId]`)
- `frontend/src/app/negotiation/[sessionId]/page.tsx`
- `frontend/src/components/negotiation/round-card.tsx`
  - 라운드별 카드: 연봉, 근무조건, 직급, 시작일, 근거
  - 이전 라운드 대비 변화량 표시 (연봉 ↑500만 등)
- **프로필 리포트 열람** (채용자 전용)
  - 협상 진입 시 에스크로에서 자동결제된 프로필 데이터를 협상 페이지 내에서 열람 가능
  - 기술 역량, 프로젝트 경험, 협업 지표, 자격/학력, 시장가치
  - **PDF 내보내기** — 프로필 리포트를 공식 이력서 형태로 다운로드 가능 (기관 제출용)
  - 데이터소스(GitHub, 정부24 등) 기반 검증된 데이터이므로 공식 이력서로 갈음 가능
  - 온체인 해시로 프로필 데이터의 무결성 증명

#### 5-2. 합의 확인 + 승인 페이지 (`/negotiation/[sessionId]/agree`)
- `frontend/src/app/negotiation/[sessionId]/agree/page.tsx`
- `frontend/src/components/negotiation/agreement-detail.tsx`
  - 합의 내용 카드: 직급, 연봉, 근무, 시작일, 수습기간
- 승인/거절 버튼
- 온체인 기록 경고 + 완료 후 TX 해시 표시

#### 5-3. 협상 목록 페이지 (`/negotiations`)
- `frontend/src/app/negotiations/page.tsx`
- 사이드바 "Negotiations" 클릭 시 이동
- 전체 협상 목록 표시 (진행 중 / 합의 완료 / 실패)
  - 매칭 점수, 공고 제목, 회사명, 라운드 진행 상황
  - 각 항목 클릭 → `/negotiation/[sessionId]` 모니터링 페이지로 이동
  - 합의 완료 건 클릭 → `/negotiation/[sessionId]/agree` 결과 보기
- 대시보드에는 진행 중인 것만 간략히, 이 페이지에서 전체 히스토리 확인

> **매칭 → 협상 자동 전환 플로우**
> ```
> 구직 활동 토글 ON
>   → 시스템이 자동으로 매칭 수행
>   → 매칭 결과 생성 시 자동으로 협상 세션 시작 (별도 동의 불필요)
>   → AI 에이전트가 양측을 대리하여 자동 협상 진행
>   → 사용자는 협상 모니터링만 가능
>   → 합의 도달 시 → 최종 승인/거절만 사용자가 결정
> ```

#### 5-4. 전체 스모크 테스트
브라우저에서 수동 확인:

| # | 화면 | 확인 항목 |
|---|------|----------|
| 1 | `/` | Alice/Bob 로그인 카드 |
| 2 | `/dashboard/seeker` | **구직 활동 토글** + 6개 섹션 카드 렌더링 |
| 3 | `/dashboard/employer` | 4개 섹션 카드 렌더링 |
| 4 | `/datasource` | 4개 소스 카드 + Mock 연결 |
| 5 | `/resume` | 생성 프로그레스 + 이력서 상세 |
| 6 | `/jobs/create` | 채팅 + 폼 탭 |
| 7 | `/escrow` | 잔액 + 예치 + 내역 |
| 8 | `/negotiations` | 전체 협상 목록 (진행 중 / 완료 / 실패) |
| 9 | `/negotiation/session-1` | 라운드 카드 + 프로필 리포트 |
| 10 | `/negotiation/session-2/agree` | 합의 내용 + 승인 |

### 완료 기준
- [ ] **구직 활동 토글 ON → 매칭 자동 → 협상 자동 시작** 전체 플로우 시연 가능
- [ ] 로그인 → 이력서 → 구직 활동 ON → 매칭 확인 → 협상 모니터링 → 합의 승인 E2E 플로우
- [ ] `npm run build` 에러 없음

### 커밋
```bash
git commit -m "feat: complete frontend Day 1-2 — full flow demo with dummy data"
```

---

## Stage 6: 백엔드 API 연결 (Day 3)

### 목표
`NEXT_PUBLIC_USE_DUMMY=false`로 전환, 실제 백엔드 API 연결

### 작업 항목

#### 6-1. Auth API 연결
- NEAR 지갑 로그인: `near-api-js` 설치
- `POST /auth/near/challenge` → nonce 수신
- 지갑 서명 → `POST /auth/near/verify` → JWT 수신
- `lib/auth.tsx` 의 `login()` 함수에 실제 로직 추가

#### 6-2. 이력서/데이터소스 API 연결
- `GET /datasource/status` → 실제 연결 상태
- `GET /datasource/connect/github` → GitHub OAuth 리다이렉트
- `POST /resume/generate` → 202 Accepted → polling으로 상태 확인
- `GET /resume/:id/status` → 상태 전이 polling

#### 6-3. 공고/매칭 API 연결
- `POST /jobs/chat` → 실제 대화형 공고 작성
- `GET /match/seeker/:seekerId` → 실제 매칭 결과

### 완료 기준
- [ ] `.env.local`에서 `NEXT_PUBLIC_USE_DUMMY=false` 설정 후 기본 플로우 동작
- [ ] Auth → 이력서 → 공고 → 매칭 API 연결 확인

---

## Stage 7: ECDH 복호화 + 에스크로 연결 (Day 4)

### 목표
승연과 페어로 ECDH 클라이언트 복호화 구현 + 에스크로 지갑 연동

### 작업 항목

#### 7-1. ECDH 복호화 구현
- `tweetnacl` 설치
- Ed25519 → Curve25519 변환
- ECDH 공유키 복원 → HKDF → session_key
- XChaCha20-Poly1305 복호화
- `/negotiation/[sessionId]/history` 페이지 구현

#### 7-2. 에스크로 지갑 연동
- `near-api-js` 트랜잭션 서명
- deposit() 호출 → 지갑 팝업
- addKey() → Function Call Access Key 부여
- 잔액 조회 → RPC로 컨트랙트 상태

#### 7-3. 실시간 협상 업데이트
- SSE 또는 polling으로 협상 라운드 실시간 반영
- `/negotiation/[sessionId]` 페이지에 자동 새로고침

### 완료 기준
- [ ] 협상 히스토리 복호화 → 전체 라운드 평문 표시
- [ ] 에스크로 예치 → 지갑 팝업 → 잔액 반영

---

## Stage 8: UX 폴리싱 + 데모 리허설 (Day 5-6)

### 작업 항목
- [ ] 에러 핸들링 (API 실패 시 toast/alert)
- [ ] 로딩 상태 (Skeleton UI 또는 Spinner)
- [ ] 반응형 레이아웃 확인
- [ ] 데모 시나리오 리허설 (전체 E2E 플로우)
- [ ] 엣지 케이스 처리 (빈 데이터, 권한 없음 등)

---

## 파일 구조 전체

```
frontend/src/
├── app/
│   ├── layout.tsx                          → 루트 (AuthProvider)
│   ├── page.tsx                            → 로그인
│   ├── dashboard/
│   │   ├── layout.tsx                      → Header + Sidebar
│   │   ├── seeker/page.tsx
│   │   └── employer/page.tsx
│   ├── datasource/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── resume/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── jobs/
│   │   ├── layout.tsx
│   │   └── create/page.tsx
│   ├── escrow/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── negotiation/
│   │   ├── layout.tsx
│   │   └── [sessionId]/
│   │       ├── page.tsx                    → 모니터링
│   │       └── agree/page.tsx              → 합의 확인
│   └── negotiations/
│       ├── layout.tsx
│       └── page.tsx                       → 전체 협상 목록
├── components/
│   ├── ui/                                 → shadcn/ui (자동 생성)
│   ├── layout/
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   ├── auth/
│   │   └── login-selector.tsx
│   ├── dashboard/
│   │   ├── job-seeking-toggle.tsx              → 구직 활동 ON/OFF 토글
│   │   ├── datasource-status.tsx
│   │   ├── resume-summary.tsx
│   │   ├── market-value-card.tsx
│   │   ├── negotiation-list.tsx
│   │   ├── escrow-balance.tsx
│   │   └── job-list.tsx
│   ├── resume/
│   │   ├── generation-progress.tsx
│   │   └── resume-detail.tsx
│   ├── jobs/
│   │   ├── chat-ui.tsx
│   │   └── job-form.tsx
│   ├── negotiation/
│   │   ├── round-card.tsx
│   │   └── agreement-detail.tsx
│   └── matching/
│       ├── match-card.tsx
│       └── profile-report.tsx
├── lib/
│   ├── api.ts                              → 더미/실제 API 스위칭
│   ├── auth.tsx                            → AuthContext + Provider
│   ├── types.ts                            → 공유 타입
│   ├── utils.ts                            → shadcn 유틸
│   └── dummy/
│       ├── user.ts
│       ├── resume.ts
│       ├── datasources.ts
│       ├── jobs.ts
│       ├── matches.ts
│       ├── profile-report.ts
│       ├── negotiation.ts
│       ├── agreement.ts
│       └── escrow.ts
└── styles/
    └── globals.css
```

---

## 프론트엔드 ↔ 백엔드 API 매핑 (Stage 6 참고용)

| 페이지 | API | 백엔드 담당 |
|--------|-----|-----------|
| 로그인 | `POST /auth/near/challenge`, `POST /auth/near/verify` | 성훈 |
| **구직 활동 토글** | `PUT /seeker/job-seeking-status` | 준하 |
| 데이터소스 | `GET/POST /datasource/*` | 준하 |
| 이력서 | `GET/POST /resume/*` | 준하 |
| 공고 작성 | `POST /jobs/chat`, `POST /jobs` | 승연 |
| 에스크로 | `POST /escrow/*`, `GET /escrow/*` | 성훈 |
| 매칭 | `GET /match/*` | 준하 |
| 프로필 열람 | `POST /profile/*/access`, `GET /profile/*/report` | 준하 |
| 협상 | `GET/POST /negotiation/*` | 승연 |
| 합의 조회 | `GET /agreement/*` | 승연 |
