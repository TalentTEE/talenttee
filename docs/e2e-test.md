# E2E Test Flow — TalentTEE

> 전체 사용자 여정을 처음부터 끝까지 검증하는 수동 테스트 플로우.
> SEEKER 가입 → 이력서 생성 → EMPLOYER 공고 등록 → 매칭 → 프로필 열람 → 협상.

---

## 사전 준비

- [x] Docker PostgreSQL 기동 (`docker-compose up -d`)
- [x] 루트 `.env` 환경변수 세팅 (PORT=3001, NEXT_PUBLIC_API_URL, NEAR_AI_*, GITHUB_* 등)
- [x] 백엔드 기동 (`cd backend && npm run start:dev` → 3001)
- [x] 프론트엔드 기동 (`cd frontend && npm run dev` → 3000)
- [x] http://localhost:3000 접속 확인

---

## Round 1: SEEKER(구직자) 플로우

| # | 동작 | 확인 포인트 | 상태 |
|---|------|-----------|------|
| 1 | 랜딩 페이지 진입 | 로그인 상태 아직 없음 (Login/Signup 버튼 보임) | [x] |
| 2 | Signup → SEEKER 선택 | NEAR Wallet Selector 열림 | [x] |
| 3 | `mavis92.testnet`으로 로그인 | 대시보드(/dashboard/seeker) 진입 | [x] |
| 4 | **"Job Seeking" 토글 켜기** | 404 에러 없어야 함 (PR #8 반영) | [x] |
| 5 | 데이터소스 페이지 → GitHub 연결 | GitHub OAuth 리다이렉트 → 승인 → `?github=connected` | [x] |
| 6 | Slack, Discord, Gov24 Mock 연결 | 각 연결 완료 | [x] |
| 7 | 데이터소스 상세 보기 (각 플랫폼) | AI 분석 결과 표시 (PR #7로 추가된 기능) | [x] |
| 8 | 이력서 생성 | 상태: COLLECTING → ANALYZING → COMPLETE (10~30초) | [x] |
| 9 | 완성된 이력서 확인 | skills, experience, education, summary 표시 | [x] |
| 10 | 시장가치 조회 | USD 범위 + 근거 + 협상 포인트 | [x] |
| 11 | 매칭 탭 진입 | 공고가 없으면 빈 목록 (Round 2 이후 확인) | [ ] |

---

## Round 2: EMPLOYER(채용측) 플로우

**다른 NEAR 계정 필요** (새 testnet 지갑 생성 or 별도 브라우저 프로필)

| # | 동작 | 확인 포인트 | 상태 |
|---|------|-----------|------|
| 12 | 로그아웃 → Signup → EMPLOYER 선택 | 다른 testnet 계정으로 로그인 | [x] |
| 13 | Jobs 페이지 → 공고 생성 (AI 채팅) | AI 실제 응답 (PR #9 수정 후) | [x] |
| 14 | 공고 바운더리 설정 (AI chat) | 협상 바운더리 JSON 생성 | [ ] |
| 15 | 공고 발행 완료 | 공고 목록에 표시 | [ ] |

**추가 개선 (PR #11):**
- 대화창 세션 영속화 (localStorage)
- 좌측 사이드바(세션 목록, New Chat, 삭제)
- Lenis smooth scroll 제외로 채팅 내부 스크롤 정상 동작

---

## Round 3: 매칭 + 프로필 열람 + 협상

| # | 동작 | 확인 포인트 | 상태 |
|---|------|-----------|------|
| 16 | EMPLOYER로 공고 → "매칭 후보 보기" | Top-5 구직자 (mavis92 포함) | [ ] |
| 17 | 매칭된 구직자 클릭 → "상세 프로필 보기" | 에스크로 결제 → AI 리포트 생성 (Phase 5) | [ ] |
| 18 | EMPLOYER가 "동의" 클릭 | 구직자 동의 대기 상태 | [ ] |
| 19 | SEEKER로 돌아가서 매칭 페이지 → 공고 확인 → "동의" | 양측 완료 → 협상 세션 자동 생성 (Phase 4 Mock→Real 통합) | [ ] |
| 20 | 협상 페이지 진입 | 승연의 AI 협상 엔진 동작 (라운드별 제안) | [ ] |

---

## 진행 중 발견된 이슈 및 수정 내역

| 이슈 | 해결 PR | 설명 |
|------|--------|------|
| `PUT /seeker/job-seeking-status` 404 | **PR #8** | SeekerModule 신규 생성, User 엔티티에 `jobSeeking` 컬럼 추가 |
| AI Chat Mode 응답 없음 ("AI is on standby") | **PR #9** | JobModule이 로컬 Mock 사용 중이라 공고 생성 프롬프트에 엉뚱한 응답. AgentModule의 실제 Real Client로 교체 |
| 프론트 API 요청 404 (3000 vs 3001) | **PR #11** | `next.config.ts`에서 루트 `.env` 직접 파싱하여 NEXT_PUBLIC_API_URL 주입 |
| 공고 채팅 응답 무시됨 | **PR #11** | `{sessionId, response}` wrapping 언래핑 + sessionId 연속 대화 |
| Form Mode 왕복 시 대화 사라짐 | **PR #11** | 세션 state lifting + localStorage 영속화 |
| 채팅창 자동 스크롤 튕김 | **PR #11** | 하단 80px 이내에서만 auto-scroll |
| 대화창 내부 스크롤 안 됨 | **PR #11** | Lenis smooth scroll 제외 (`data-lenis-prevent`) |
| `/negotiation/sessions` 500 에러 | (미해결) | 별도 조사 필요 |

---

## 관련 PR

| PR | 상태 | 제목 |
|----|------|------|
| #4 | Merged | 준하 AI Pipeline — 이력서/매칭/프로필 백엔드 API 전체 구현 |
| #8 | Merged | SeekerModule — job seeking status 엔드포인트 |
| #9 | Merged | AI 공고 생성 채팅 파이프라인 수정 (Backend Mock 제거 + Frontend 응답 처리) |
| #11 | Open | AI 공고 생성 채팅 UX 개선 (세션 영속화 + 사이드바 + 스크롤 수정) |
