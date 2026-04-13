# 준하 AI Pipeline — Roadmap

**담당:** 준하 (AI Pipeline — 이력서 + 매칭)
**마감:** 2026-04-17
**스펙:** [`specs/team/junha-ai-pipeline.md`](../../specs/team/junha-ai-pipeline.md)
**브랜치:** `jun`

---

## Architecture

NestJS 11 모듈 5개 신규 생성. NEAR AI Cloud(OpenAI 호환 API)로 Chat/Embed/Rerank.
pgvector로 벡터 유사도 검색. 외부 의존(Escrow, Negotiation)은 인터페이스로 분리하여 나중에 통합.

## 명세 항목 ↔ Phase 대조

| # | 명세 항목 | 커버 Phase | Day | 상태 |
|---|----------|-----------|-----|------|
| 1 | NEAR AI Cloud 클라이언트 (OpenAI 호환) | Phase 1 | Day 1 | **구현 완료** |
| 2 | 데이터소스 연결 (GitHub OAuth + Mock) | Phase 2 | Day 1 | **구현 완료** |
| 3 | 이력서 생성/최신화 + 데이터 분류 | Phase 3 | Day 1~2 | **구현 완료** |
| 4 | 벡터 임베딩 (Qwen3-Embedding) | Phase 3 | Day 2 | **구현 완료** |
| 5 | 시장가치 산출 | Phase 3 | Day 2 | **구현 완료** |
| 6 | 2단계 시맨틱 매칭 (ANN + Reranker) | Phase 4 | Day 2 | **구현 완료** |
| 7 | 상세 프로필 열람 API (토큰 결제 연동) | Phase 5 | Day 2 | **구현 완료** |
| 8 | 매칭 동의 + 협상 핸드오프 | Phase 4 | Day 2 | **구현 완료** |
| 9 | 프론트 연결 + 프롬프트 튜닝 | Phase 6 | Day 3-4 | 대기 |
| 10 | 매칭 정확도 검증 + 고도화 | Phase 7 | Day 4-5 | 대기 |
| 11 | 최종 리허설 + 제출 | Phase 8 | Day 6 | 대기 |

## Phase Overview

```
═══════════════════════════════════════════════════
  Phase 1~5: 핵심 백엔드 구현 (Day 1~2) ✅ 완료
═══════════════════════════════════════════════════

Phase 1 ─── Foundation: NearAiClient 실구현 + Interface 확장 + 엔티티 보강
  │         ↓ 모든 후속 Phase의 기반
  │
Phase 2 ─── Datasource Module: GitHub Mock + Slack/Discord/Gov24 fixture
  │         ↓ 이력서 생성의 입력 데이터 확보
  │
Phase 3 ─── Resume Module: 이력서 생성 파이프라인 + 시장가치 산출
  │         ↓ 벡터 임베딩 포함, 매칭의 입력
  │
Phase 4 ─── Match Module: ANN(pgvector) + Reranker + 동의 API
  │         ↓ 매칭 결과 생성, 프로필 열람의 전제
  │
Phase 5 ─── Profile Module: 상세 열람 + 에스크로 결제 연동
            ↓ Day 2 마감: 모든 백엔드 API 동작

═══════════════════════════════════════════════════
  Phase 6~8: 통합 + 검증 + 제출 (Day 3~6) 🔜 예정
═══════════════════════════════════════════════════

Phase 6 ─── 프론트 연결 + 프롬프트 튜닝 (Day 3-4)
  │         - 이력서/매칭/프로필 API ↔ 프론트엔드 실제 연결
  │         - Mock 인터페이스 → 실제 서비스 통합 (Escrow, Negotiation)
  │         - AI 프롬프트 품질 개선
  │
Phase 7 ─── 매칭 정확도 검증 + 고도화 (Day 4-5)
  │         - E2E 플로우 검증 (구직자 가입 → 이력서 → 매칭 → 열람 → 협상)
  │         - 시장가치 정밀화, 매칭 점수 튜닝
  │         - 버그 수정 + 엣지케이스 처리
  │
Phase 8 ─── 최종 리허설 + 제출 (Day 6)
            - 클린 환경 데모 테스트 (처음부터 끝까지)
            - 데모 시나리오 스크립트 확정
            - 제출
```

## Phase 의존 관계

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5
                                                    │
                                                    ↓
Phase 6 (프론트 연결) ──→ Phase 7 (검증/고도화) ──→ Phase 8 (제출)
```

## 외부 의존 격리 & 통합 전략

### 격리 원칙

다른 팀원의 서비스를 직접 import하지 않고, **인터페이스만 정의 + Mock으로 독립 동작**시킨다.
통합 시점에 각 Module의 `useClass: MockXxx` → `useClass: 실제Service`로 교체하면 끝.

### 인터페이스 목록

| 의존 대상 | 인터페이스 파일 | Mock 파일 | 사용 모듈 | 통합 시점 |
|-----------|----------------|-----------|-----------|-----------|
| 성훈 `EscrowService` | `common/interfaces/escrow-payment.interface.ts` | `common/mocks/mock-escrow-payment.ts` | ProfileModule (프로필 열람 결제) | Phase 6 (Day 3-4) |
| 승연 `NegotiationService` | `common/interfaces/negotiation-handoff.interface.ts` | `common/mocks/mock-negotiation-handoff.ts` | MatchModule (양측 동의 → 협상 세션) | Phase 6 (Day 3-4) |

### Mock 동작

| Mock | 동작 |
|------|------|
| `MockEscrowPayment.checkBalance()` | 항상 `'10000000000000000000000000'` (10 NEAR) 반환 |
| `MockEscrowPayment.payForProfile()` | 랜덤 txHash 반환 (실제 차감 없음) |
| `MockNegotiationHandoff.createSession()` | 랜덤 UUID sessionId 반환 |

### 기존 코드 보호 (승연 파트)

승연의 `JobModule`/`NegotiationModule`은 `NEAR_AI_CLIENT`를 **로컬 provider**로 `MockNearAiClient`에 주입 중:

```typescript
// 승연의 NegotiationModule — 변경 없음
{ provide: NEAR_AI_CLIENT, useClass: MockNearAiClient }
```

우리가 `AgentModule`을 `@Global()`로 등록했지만, **NestJS는 로컬 provider가 글로벌보다 우선**하므로 승연 코드는 계속 Mock 사용. 승연 쪽 코드를 한 줄도 수정하지 않았음.

단, `NearAiClient` 인터페이스에 `embed()`/`rerank()` 추가 시, `MockNearAiClient`에도 stub을 추가하여 빌드 호환성 유지.

### Phase 6 통합 체크리스트

- [ ] `ProfileModule`: `useClass: MockEscrowPayment` → `useClass: EscrowService` (성훈)로 교체
- [ ] `MatchModule`: `useClass: MockNegotiationHandoff` → `useClass: NegotiationService` (승연)로 교체
- [ ] 승연 `JobModule`/`NegotiationModule`: 로컬 `MockNearAiClient` → 제거 (글로벌 `AgentModule` 사용)
- [ ] `.env`에 `NEAR_AI_API_KEY` 실제 키 설정
- [ ] E2E 테스트: 이력서 생성 → 매칭 → 프로필 열람 → 협상 핸드오프 풀 플로우 검증

## Phase Plans (개별 문서)

| Phase | 문서 | 상태 | 커밋 |
|-------|------|------|------|
| 1 | [phase-1-foundation.md](./phase-1-foundation.md) | **구현 완료** | `ab1a481`..`9951796` (4 commits) |
| 2 | [phase-2-datasource.md](./phase-2-datasource.md) | **구현 완료** | `0e464df` |
| 3 | [phase-3-resume.md](./phase-3-resume.md) | **구현 완료** | `b8a0eed` |
| 4 | [phase-4-match.md](./phase-4-match.md) | **구현 완료** | `72c88d6` |
| 5 | [phase-5-profile.md](./phase-5-profile.md) | **구현 완료** | `953d584` |
| 6 | phase-6-frontend-integration.md | 미작성 | - |
| 7 | phase-7-accuracy-tuning.md | 미작성 | - |
| 8 | phase-8-rehearsal-submit.md | 미작성 | - |

## 수락 기준 (스펙 Section 6)

- [ ] GitHub OAuth 연결 → 커밋/언어/프로젝트 데이터 수집 성공
- [ ] Mock 연결 → Slack/Discord/정부24 fixture 데이터 로드
- [ ] `POST /resume/generate` → 상태가 수집 중 → 분석 중 → 완성으로 전이
- [ ] 완성된 이력서에 skills[], experience[], education[] 포함
- [ ] 시장가치 산출 → marketValueMin/Max + reasoning 반환
- [ ] 이력서 + 공고 벡터 임베딩 → pgvector 저장
- [ ] 매칭 쿼리 → Top-5 결과 반환 (ANN + Rerank)
- [ ] `POST /profile/:seekerId/access` → 에스크로 차감 + 상세 리포트 반환
- [ ] 열람 권한 없이 `/profile/:seekerId/report` 호출 시 접근 거부
- [ ] 양측 동의 → 승연 협상 엔진으로 핸드오프 성공
