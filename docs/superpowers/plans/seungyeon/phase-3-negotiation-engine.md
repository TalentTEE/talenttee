# Phase 3: 협상 엔진 — 상태머신 + 라운드 관리

> 스펙 참조: seungyeon-negotiation.md §3-3
> PRD 참조: FR-010 (TEE 자율 협상)
> 검증 결과: **PASS**

---

## 구현 파일

| 파일 | 경로 |
|------|------|
| NegotiationEngine (상태머신) | `backend/src/negotiation/negotiation-engine.ts` |
| NegotiationService | `backend/src/negotiation/negotiation.service.ts` |
| NegotiationController | `backend/src/negotiation/negotiation.controller.ts` |
| NegotiationModule | `backend/src/negotiation/negotiation.module.ts` |
| CreateSessionDto | `backend/src/negotiation/dto/create-session.dto.ts` |
| InterveneDto | `backend/src/negotiation/dto/intervene.dto.ts` |
| 테스트 | `backend/src/negotiation/__tests__/negotiation-engine.spec.ts` |

---

## 상태머신 검증

### 상태 전이표

| 현재 상태 | Decision | 결과 상태 | 구현 라인 | 상태 |
|-----------|----------|-----------|-----------|------|
| * | ACCEPT | AGREED | L21 | **PASS** |
| * | REJECT | FAILED | L22 | **PASS** |
| * (round >= maxRounds) | COUNTER | MAX_ROUNDS | L23 | **PASS** |
| EMPLOYER_OFFER | COUNTER | SEEKER_COUNTER | L28 | **PASS** |
| SEEKER_COUNTER | COUNTER | EMPLOYER_COUNTER | L30 | **PASS** |
| EMPLOYER_COUNTER | COUNTER | SEEKER_COUNTER | L32 | **PASS** |

### Actor 결정

| 상태 | Actor | 구현 라인 | 상태 |
|------|-------|-----------|------|
| EMPLOYER_OFFER | EMPLOYER_AGENT | L7 | **PASS** |
| EMPLOYER_COUNTER | EMPLOYER_AGENT | L6 | **PASS** |
| SEEKER_COUNTER | SEEKER_AGENT | L9 | **PASS** |
| INITIATED | throw Error | L11 | **PASS** |
| Terminal states | throw Error | L11 | **PASS** |

### 터미널 상태

```
isTerminal() → [AGREED, FAILED, MAX_ROUNDS] 중 하나면 true
```

---

## API 엔드포인트 검증

| 스펙 | 구현 | HTTP | 상태 |
|------|------|------|------|
| 세션 생성 | `POST /negotiation/sessions` | 202 | **PASS** |
| 협상 시작 | `POST /negotiation/sessions/:id/start` | 202 | **PASS** |
| 세션 상태 | `GET /negotiation/sessions/:id` | 200 | **PASS** |
| 라운드 목록 | `GET /negotiation/sessions/:id/rounds` | 200 | **PASS** |
| 사용자 개입 | `POST /negotiation/sessions/:id/intervene` | 200 | **PASS** |

---

## 라운드 실행 루프 검증 (executeRounds)

스펙의 8단계 실행 흐름:

| # | 스펙 단계 | 구현 위치 | 상태 |
|---|-----------|-----------|------|
| 1 | 현재 차례 에이전트 결정 | `getActorForState(state)` L132 | **PASS** |
| 2 | 입력 구성 (이력서/공고 + 히스토리 + 개입) | `buildEmployerPrompt` / `buildSeekerPrompt` L136-168 | **PASS** |
| 3 | NEAR AI Cloud TEE 호출 | `aiClient.chat()` L170-174 | **PASS** (Mock) |
| 4 | 응답 파싱 → AgentResponse | `JSON.parse(response)` L178 + 재시도 L179-187 | **PASS** |
| 5 | CryptoService.encrypt | `cryptoService.encrypt(sessionKey, JSON.stringify(parsed))` L191 | **PASS** |
| 6 | NegotiationRound 저장 | `roundRepo.save()` L192-199 | **PASS** |
| 7 | 상태 전이 판단 | `transition(state, decision, round, maxRounds)` L203 | **PASS** |
| 8 | 실시간 통보 | **미구현** — SSE/WebSocket 없음, 폴링만 가능 | **PARTIAL** |

### 스펙 차이점

| 항목 | 스펙 | 실제 구현 | 영향도 |
|------|------|-----------|--------|
| 비동기 처리 | BullMQ Job | async fire-and-forget (Promise) | 중 — 서버 재시작 시 진행 중 협상 소실 |
| 실시간 통보 | SSE 또는 polling | polling만 가능 (`GET /sessions/:id`) | 중 — UX 저하, 프론트에서 폴링 구현 필요 |
| 세션키 유도 | 구직자 공개키 + nonce | `deriveServerSessionKey(seekerPublicKey, nonce)` | 없음 — 의도대로 동작 |

---

## 테스트 커버리지

### getActorForState (6 테스트)

| 테스트 | 입력 | 기대 출력 |
|--------|------|-----------|
| EMPLOYER_OFFER → EMPLOYER_AGENT | ✅ |
| SEEKER_COUNTER → SEEKER_AGENT | ✅ |
| EMPLOYER_COUNTER → EMPLOYER_AGENT | ✅ |
| INITIATED → throw | ✅ |
| AGREED → throw | ✅ |
| FAILED, MAX_ROUNDS → throw | ✅ |

### transition (7 테스트)

| 테스트 | 시나리오 |
|--------|----------|
| ACCEPT → AGREED | ✅ |
| REJECT → FAILED | ✅ |
| COUNTER at maxRounds → MAX_ROUNDS | ✅ |
| EMPLOYER_OFFER + COUNTER → SEEKER_COUNTER | ✅ |
| SEEKER_COUNTER + COUNTER → EMPLOYER_COUNTER | ✅ |
| EMPLOYER_COUNTER + COUNTER → SEEKER_COUNTER | ✅ |
| 3라운드 전체 사이클 → AGREED | ✅ |

### isTerminal (7 테스트)

- AGREED, FAILED, MAX_ROUNDS → true ✅
- INITIATED, EMPLOYER_OFFER, SEEKER_COUNTER, EMPLOYER_COUNTER → false ✅

**총 20개 테스트, 상태머신 전 경로 커버**

---

## JSON 파싱 안정성

```
1차 시도: JSON.parse(response.content) → 성공 시 사용
실패 시 →
2차 시도: AI에 "반드시 JSON으로만 응답" 재요청 → 파싱
2차도 실패 시 → 기본값 { decision: COUNTER, proposal: {}, reasoning: 'parse error' }
```

이 3단계 fallback으로 AI 응답 형식 불안정에 대한 방어가 되어 있다.

---

## 결론

Phase 3는 협상 엔진의 핵심 로직(상태머신, 라운드 실행, 암호화 저장)을 스펙대로 구현했다. 테스트 커버리지가 높고 JSON 파싱 방어도 있다. BullMQ 미사용과 실시간 통보 미구현은 Phase 8(프론트 연결)에서 해결 필요.
