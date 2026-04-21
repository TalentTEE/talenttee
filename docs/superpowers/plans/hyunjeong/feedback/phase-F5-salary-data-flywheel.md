# Phase F-5: Salary Data Flywheel

> Priority: Medium | Effort: High | Duration: 1-2 weeks

## Judge Feedback

> "Where are you pulling the data from? For the salary data?"

## Goal

협상 성공 데이터가 축적될수록 AI 연봉 추천이 정확해지는 "데이터 플라이휠" 구축.

---

## Current State

- AI 연봉 추천: LLM의 일반 지식 기반 (cold start)
- 협상 결과: DB에 저장되지만 다음 추천에 활용 안 됨
- 사용자 신뢰: "이 숫자가 어디서 나왔지?" 의문

---

## Tasks

### 1. Negotiation Outcome 데이터 수집

- 합의 완료 시 구조화된 outcome 저장:
  - role, level, location, remote_policy
  - initial_ask, initial_offer
  - final_agreed_salary
  - negotiation_rounds_count
  - skills_matched
- 익명화 처리 (개인 식별 불가)

### 2. Salary Benchmark API

- `GET /salary/benchmark?role=&level=&location=`
- 플랫폼 내 성공 협상 데이터 기반 통계:
  - 평균, 중앙값, 25th/75th percentile
  - 샘플 수 (신뢰도 표시)
- 데이터 부족 시: "아직 충분한 데이터가 없습니다 (N=3)" + AI 추정값 병행

### 3. AI Recommendation 개선

- 협상 시작 시 AI 프롬프트에 benchmark 데이터 주입
- "이 포지션의 플랫폼 평균 연봉은 $X입니다 (N=Y건 기준)"
- 후보자에게 시각적으로 "당신의 위치" 표시 (percentile chart)

### 4. Transparency UI

- 연봉 추천 시 "데이터 소스" 표시:
  - AI 추정 (데이터 부족 시)
  - 플랫폼 데이터 기반 (충분한 샘플 시)
  - 혼합 (일부 데이터 + AI 보정)
- 추천 근거 설명: "비슷한 조건의 N건 협상에서 평균 $X 합의"

### 5. Cold Start 해결 전략

- Phase 1: 외부 salary API 연동 (Levels.fyi, Glassdoor API 등)
- Phase 2: 플랫폼 자체 데이터 축적
- Phase 3: 플랫폼 데이터 우선, 외부 데이터 보조

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `backend/src/salary/salary-benchmark.service.ts` | **NEW** — Benchmark 계산 |
| `backend/src/salary/salary-benchmark.controller.ts` | **NEW** — API |
| `backend/src/negotiation/negotiation.service.ts` | Outcome 저장 + benchmark 주입 |
| `frontend/src/components/salary/BenchmarkChart.tsx` | **NEW** — Percentile 차트 |
| `frontend/src/components/negotiation/SalaryRecommendation.tsx` | **NEW** — 추천 UI |
| `backend/migration/add-salary-outcomes.ts` | **NEW** — 테이블 생성 |

---

## Data Schema

```sql
CREATE TABLE salary_outcomes (
  id UUID PRIMARY KEY,
  role VARCHAR NOT NULL,
  level VARCHAR,
  location VARCHAR,
  remote_policy VARCHAR,
  skills JSONB,
  initial_ask DECIMAL,
  initial_offer DECIMAL,
  final_salary DECIMAL,
  rounds_count INT,
  created_at TIMESTAMP DEFAULT NOW()
);
-- 개인 식별 정보 없음 (employer_id, seeker_id 미저장)
```

---

## Success Criteria

- [ ] 협상 완료 시 익명화된 outcome 자동 저장
- [ ] Benchmark API가 role/level/location별 통계 반환
- [ ] AI 추천에 플랫폼 데이터 반영
- [ ] UI에서 "이 추천의 근거" 투명하게 표시
- [ ] 피치에서 "데이터가 쌓일수록 정확해집니다" 설명 가능
