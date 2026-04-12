# Phase 4: 협상 에이전트 프롬프트

> 스펙 참조: seungyeon-negotiation.md §3-4
> PRD 참조: FR-010
> 검증 결과: **PASS**

---

## 구현 파일

| 파일 | 경로 |
|------|------|
| 채용 에이전트 프롬프트 | `backend/src/negotiation/prompts/employer-agent.prompt.ts` |
| 구직자 에이전트 프롬프트 | `backend/src/negotiation/prompts/seeker-agent.prompt.ts` |

---

## 채용 에이전트 프롬프트 (employer-agent.prompt.ts) 검증

### 입력 파라미터

| 스펙 파라미터 | 구현 파라미터 | 상태 |
|--------------|--------------|------|
| {job_posting} | jobTitle, jobDescription | **PASS** |
| {negotiation_boundary} | boundary (salaryMin/Max, hardMax, remoteOptions, nonNegotiables, flexibles, style) | **PASS** |
| {user_intervention} | userIntervention (기본값 "없음") | **PASS** |
| {negotiation_history} | negotiationHistory | **PASS** |
| {current_counter} | currentCounter | **PASS** |
| round 번호 | round | **PASS** |

### 규칙 검증

| # | 스펙 규칙 | 구현 | 상태 |
|---|-----------|------|------|
| 1 | salaryHardMax 초과 금지 | "salaryHardMax를 절대 초과하지 마세요" | **PASS** |
| 2 | nonNegotiableItems 양보 금지 | "nonNegotiableItems은 양보하지 마세요" | **PASS** |
| 3 | flexibleItems 단계적 양보 | "flexibleItems은 양보 가능하되, 단계적으로 양보하세요" | **PASS** |
| 4 | 사용자 지시 최우선 | "사용자의 추가 지시가 있으면 최우선으로 반영하세요" | **PASS** |
| 5 | 바운더리 내 제안이면 accept | "상대방 제안이 바운더리 내이면 accept하세요" | **PASS** |

### JSON 응답 형식

```json
{
  "round": N,
  "actor": "EMPLOYER_AGENT",
  "proposal": {
    "salary": 65000000,
    "remotePolicy": "주2출근",
    "title": "...",
    "startDate": "...",
    "probationMonths": 3
  },
  "reasoning": "...",
  "decision": "COUNTER | ACCEPT | REJECT"
}
```

**스펙과 동일한 구조** ✅

---

## 구직자 에이전트 프롬프트 (seeker-agent.prompt.ts) 검증

### 입력 파라미터

| 스펙 파라미터 | 구현 파라미터 | 상태 |
|--------------|--------------|------|
| {resume_parsed_data} | resumeData | **PASS** |
| {marketValueMin}~{marketValueMax} | marketValueMin, marketValueMax | **PASS** |
| {strengths} | strengths | **PASS** |
| {weaknesses} | weaknesses | **PASS** |
| {user_preferences} | preferences | **PASS** |
| {user_intervention} | userIntervention (기본값 "없음") | **PASS** |
| {negotiation_history} | negotiationHistory | **PASS** |
| {current_offer} | currentOffer | **PASS** |
| round 번호 | round | **PASS** |

### 규칙 검증

| # | 스펙 규칙 | 구현 | 상태 |
|---|-----------|------|------|
| 1 | 시장가치 범위 기준 협상 | "시장가치 범위를 기준으로 협상하세요" | **PASS** |
| 2 | 사용자 지시 최우선 | "사용자의 추가 지시가 있으면 최우선으로 반영하세요" | **PASS** |
| 3 | 합리적 근거 제시 | "합리적 근거를 제시하며 카운터하세요" | **PASS** |
| 4 | 수용 가능 시 accept | "모든 조건이 수용 가능하면 accept하세요" | **PASS** |

### JSON 응답 형식

```json
{
  "round": N,
  "actor": "SEEKER_AGENT",
  "proposal": { ... },
  "reasoning": "시장가치 분석 기반으로...",
  "decision": "COUNTER | ACCEPT | REJECT"
}
```

**스펙과 동일한 구조** ✅

---

## 프롬프트 빌더 함수 (negotiation.service.ts 내)

NegotiationService에서 프롬프트를 조립하는 로직:

### buildEmployerPrompt 호출 (L146-154)
```
입력: jobTitle, jobDescription, boundary, history, currentCounter, intervention, round
→ employer-agent.prompt.ts의 템플릿에 값 주입
→ 완성된 시스템 프롬프트 반환
```

### buildSeekerPrompt 호출 (L156-167)
```
입력: resumeData, marketValue, strengths, weaknesses, preferences, history, currentOffer, intervention, round
→ seeker-agent.prompt.ts의 템플릿에 값 주입
→ 완성된 시스템 프롬프트 반환
```

### 구직자 프로필 데이터 소스

```
MockMatchResultQuery.getSeekerProfile(seekerId) → {
  resumeData, marketValueMin, marketValueMax,
  strengths[], weaknesses[], preferences
}
```

현재 Mock 데이터 사용 — 준하의 매칭/이력서 모듈 연동 시 실제 데이터로 전환 필요.

---

## 결론

Phase 4는 양측 에이전트 프롬프트를 스펙과 정확히 일치하게 구현했다. 모든 입력 파라미터, 규칙, 응답 형식이 스펙대로이다. Mock 데이터 → 실제 데이터 전환만 남아 있다.
