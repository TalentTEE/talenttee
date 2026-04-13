# Phase 11: 온보딩 UX + 데모 시나리오 다듬기

> **Goal:** 구직자 회원가입 → 데이터 소스 연결 → 자동 업데이트 표시까지 자연스러운 데모 플로우 완성
> **선행:** Phase 10 (인터페이스 정렬 완료)
> **예상 소요:** ~3시간

---

## 배경

해커톤 데모의 1단계: "구직자가 가입 후 자신의 업무 데이터를 쉽게 연결하고, 그것이 자동 업데이트된다"를 보여줘야 함.
현재 문제:
1. 회원가입 후 대시보드로 이동하지만, 데이터 소스 연결을 유도하는 안내가 없음
2. 데이터 소스 페이지의 더미 데이터가 이미 전부 연결된 상태로 하드코딩
3. "하루 1번 자동 업데이트" 개념이 UI에 없음

---

## Task 11.1: 회원가입 후 온보딩 유도

**Files:**
- Modify: `frontend/src/app/dashboard/seeker/page.tsx`

- [ ] **Step 1: 데이터 소스 미연결 시 온보딩 카드 표시**

대시보드 최상단에 조건부 카드:
- 데이터 소스 0개 연결 → "Get started: Connect your data sources" CTA
- 1~3개 연결 → "Almost there: Connect more sources for better AI analysis"
- 4개 전부 연결 → 카드 숨김

- [ ] **Step 2: 회원가입 직후 자동 리다이렉트**

signup 완료 시 대시보드 대신 `/datasource`로 바로 이동하는 옵션 고려.
또는 대시보드의 온보딩 카드 클릭 → `/datasource` 이동.

---

## Task 11.2: 데이터 소스 연결 플로우 개선

**Files:**
- Modify: `frontend/src/app/datasource/page.tsx`
- Modify: `frontend/src/lib/dummy/datasources.ts`

- [ ] **Step 1: 더미 데이터를 "미연결" 초기 상태로 변경**

현재: 4개 전부 CONNECTED/MOCK으로 하드코딩
변경: 초기 상태는 빈 배열 `[]` → Connect 클릭 시 하나씩 추가

- [ ] **Step 2: 연결 시 애니메이션 + 수집 진행 표시**

Connect 클릭 → "Connecting..." → "Syncing data..." → "Connected!" 단계 표시.
각 소스별 수집되는 데이터 설명 표시:
- GitHub: "Analyzing 127 repositories, 2,340 commits..."
- Slack: "Processing 15,000 messages across 8 channels..."

---

## Task 11.3: 자동 업데이트 스케줄 표시

**Files:**
- Modify: `frontend/src/app/datasource/page.tsx`

- [ ] **Step 1: 연결된 소스에 자동 업데이트 정보 표시**

각 Connected 카드 하단에:
```
Auto-sync: Daily at 9:00 AM KST
Last synced: Apr 13, 2026 at 9:00 AM
Next sync: Apr 14, 2026 at 9:00 AM
```

- [ ] **Step 2: 전체 요약 배너**

페이지 상단에:
"Your data sources sync automatically every day. AI keeps your profile fresh without any manual work."

---

## Task 11.4: 빌드 + 데모 시나리오 검증

- [ ] 빌드 성공 + 테스트 통과
- [ ] 데모 시나리오 리허설:
  1. 랜딩 페이지 → Sign Up 클릭
  2. Job Seeker 선택 → Connect Wallet → 지갑 연결
  3. 대시보드 → 온보딩 카드 → Data Sources 이동
  4. GitHub → Connect → 연결 완료 + 데이터 수집 표시
  5. Slack, Discord, Gov24 순차 연결
  6. "Daily auto-sync" 표시 확인
  7. 대시보드 복귀 → 온보딩 카드 사라짐

---

## Phase 11 완료 기준

- [ ] 회원가입 후 데이터 소스 연결 유도 자연스러움
- [ ] 데이터 소스 초기 상태 = 미연결 (하드코딩 제거)
- [ ] 연결 과정에서 데이터 수집 느낌의 피드백
- [ ] "하루 1번 자동 업데이트" 정보 UI에 표시
- [ ] 전체 데모 시나리오 1회 리허설 통과
