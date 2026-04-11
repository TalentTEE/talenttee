# 승연 — Negotiation + Crypto (협상 엔진 + 암호화)

> **역할**: 협상 엔진, 채용 에이전트(공고 작성), ECDH 암호화, 온체인 기록/결제 트리거
> **마감**: 2026-04-17
> **의존**: 성훈 Day 1 (DB 스키마, Auth), 성훈 Day 2-3 (스마트컨트랙트 ABI), 준하 (NearAiClient, 매칭 결과)
> **피의존**: 현정이 협상 실시간 표시 UI를 더미 → 실제로 전환할 때 사용

---

## 1. 담당 범위

| # | 기능 | PRD 참조 | 우선순위 |
|---|------|---------|---------|
| 1 | ECDH 암호화 모듈 | Section 9, NFR-1 | Day 1 오전 (4/12, 선행 가능) |
| 2 | 채용 에이전트 — 대화형 공고 작성 + 바운더리 설정 | FR-005, FR-006 | Day 1 오후 (4/12) |
| 3 | 협상 엔진 — 상태머신 + 라운드 관리 | FR-009 | Day 1 오후 ~ Day 2 오전 (4/12-13) |
| 4 | 협상 에이전트 프롬프트 (구직자측 + 채용측) | FR-009 | Day 2 오전 (4/13) |
| 5 | 사용자 중간 개입 | FR-009 동작 6 | Day 2 오전 (4/13) |
| 6 | 합의 → 온체인 기록 + 에스크로 결제 트리거 | FR-010 | Day 2 오후 (4/13) |
| 7 | 협상 히스토리 열람 (복호화) | FR-012 | Day 2 오후 (4/13) |
| 8 | 프론트 연결 + ECDH 복호화 연동 (현정과 페어) | - | Day 3-4 (4/14-15) |
| 9 | 협상 시나리오 다양화 + 프롬프트 고도화 | - | Day 4-5 (4/15-16) |
| 10 | 최종 리허설 + 제출 | - | Day 6 (4/17) |

## 2. Day 1 선행 작업

성훈이 DB 스키마를 잡는 동안, 암호화 모듈을 먼저 구현:

### ECDH 암호화 모듈

```typescript
// modules/crypto/crypto.service.ts
import nacl from 'tweetnacl';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';

@Injectable()
export class CryptoService {

  // Ed25519 → Curve25519 변환 → X25519 ECDH → HKDF → session_key
  deriveSessionKey(
    myPrivateKey: Uint8Array,     // Ed25519 개인키
    theirPublicKey: Uint8Array,   // Ed25519 공개키
    sessionNonce: string          // 세션 고유 nonce
  ): Uint8Array

  // XChaCha20-Poly1305 암호화
  encrypt(sessionKey: Uint8Array, plaintext: string): Uint8Array

  // XChaCha20-Poly1305 복호화
  decrypt(sessionKey: Uint8Array, ciphertext: Uint8Array): string
}
```

**키 유도 흐름:**

```
1. Ed25519 priv → Curve25519 priv
   nacl.sign.keyPair.fromSecretKey(ed25519Priv) → curve25519Priv

2. Ed25519 pub → Curve25519 pub
   crypto_sign_ed25519_pk_to_curve25519(ed25519Pub) → curve25519Pub

3. X25519 ECDH
   nacl.scalarMult(curve25519Priv, curve25519Pub) → sharedSecret

4. HKDF-SHA256
   hkdf(sha256, sharedSecret, sessionNonce, 'negotiation', 32) → sessionKey

5. 암호화
   XChaCha20-Poly1305(sessionKey, nonce, plaintext) → ciphertext
```

## 3. 기능별 상세

### 3-1. 채용 에이전트 — 대화형 공고 작성 (FR-005)

**API:**
```
POST /jobs/chat     → 대화 메시지 전송/수신
GET  /jobs/:id      → 공고 조회
POST /jobs          → 폼으로 직접 공고 생성 (대화형 대안)
```

**대화형 흐름:**

```
에이전트가 순차적으로 질문:
  1. "어떤 포지션을 채용하시나요?"
  2. "필수 기술스택은 무엇인가요?"
  3. "경력 요구사항은요?"
  4. "연봉 범위는 어떻게 되나요?"
  5. "원격근무 가능한가요?"
  6. "기타 복리후생이 있나요?"
  → 답변 수집 → 구조화된 JobPosting 생성

NEAR AI Cloud TEE로 대화 관리:
  - 시스템 프롬프트에 질문 순서 + 구조화 지시
  - 사용자 답변이 불충분하면 후속 질문
  - 모든 필수 항목 수집 시 공고 JSON 출력
```

**공고 작성 프롬프트:**

```
당신은 채용 전문가입니다. 채용담당자와 대화하며 채용공고를 작성합니다.

규칙:
1. 한 번에 하나의 질문만 하세요
2. 답변이 불충분하면 구체적으로 다시 물어보세요
3. 모든 필수 항목이 채워지면 구조화된 공고를 생성하세요

필수 항목: title, description, requiredSkills, salaryMin, salaryMax, remotePolicy
선택 항목: preferredSkills, workingHours, benefits

모든 항목이 채워지면 다음 JSON으로 응답:
{ "complete": true, "jobPosting": { ... } }
채워지지 않은 항목이 있으면:
{ "complete": false, "question": "다음 질문 내용" }
```

### 3-2. 협상 바운더리 설정 (FR-006)

공고 작성 완료 직후, 추가 질문으로 협상 파라미터 설정:

```
POST /jobs/:id/boundary/chat → 바운더리 설정 대화

에이전트 질문:
  1. "이 포지션 연봉 상한은 얼마까지 가능한가요?"
  2. "원격근무 조건은 양보 가능한가요?"
  3. "수습기간은 필수인가요?"
  4. "시작일은 유연한가요?"
  5. "양보할 수 없는 조건이 있나요?"

→ negotiationBoundary JSON 생성:
{
  "salaryMin": 50000000,
  "salaryMax": 70000000,
  "salaryHardMax": 80000000,
  "remotePolicyOptions": ["주2출근", "주3출근", "풀리모트"],
  "nonNegotiableItems": ["수습기간 3개월"],
  "flexibleItems": ["시작일", "원격근무 비율"],
  "negotiationStyle": "moderate"  // conservative | moderate | aggressive
}
```

### 3-3. 협상 엔진 — 상태머신 (FR-009)

**상태 전이:**

```
INITIATED
  → EMPLOYER_OFFER (Round 1: 채용 에이전트 초기 오퍼)
    → SEEKER_COUNTER (커리어 에이전트 카운터)
      → EMPLOYER_COUNTER (채용 에이전트 카운터)
        → SEEKER_COUNTER (반복)
          → ...

종료 조건:
  양측 accept → AGREED
  한쪽 reject → FAILED
  currentRound >= maxRounds → MAX_ROUNDS
```

**API:**

```
POST /negotiation/sessions                    → 세션 생성 (매칭 동의 후)
POST /negotiation/sessions/:id/start          → 자동 협상 시작
GET  /negotiation/sessions/:id                → 세션 상태
GET  /negotiation/sessions/:id/rounds         → 라운드 목록
POST /negotiation/sessions/:id/intervene      → 사용자 방향 지시
POST /negotiation/sessions/:id/approve        → 합의 승인
```

**라운드 실행 흐름:**

```
POST /negotiation/sessions/:id/start
  ↓
BullMQ Job (순차 라운드 실행):
  while (state not terminal):
    1. 현재 차례의 에이전트 결정 (SEEKER_AGENT | EMPLOYER_AGENT)
    2. 입력 구성:
       - 구직자 에이전트: 이력서 + 시장가치 + 선호조건 + 히스토리 + 사용자 개입 지시
       - 채용 에이전트: 공고 + 바운더리 + 히스토리 + 사용자 개입 지시
    3. NEAR AI Cloud TEE 호출 (준하의 NearAiClient 사용)
    4. 응답 파싱 → AgentResponse
    5. CryptoService.encrypt(sessionKey, roundData)
    6. NegotiationRound 저장 (encrypted_blob)
    7. 상태 전이 판단 (accept/reject/counter/maxRounds)
    8. 실시간 통보 (SSE 또는 polling 엔드포인트)
```

### 3-4. 협상 에이전트 프롬프트

**구직자 측 (커리어 에이전트) 프롬프트:**

```
당신은 구직자의 AI 협상 대리인입니다.

구직자 프로필:
{resume_parsed_data}

시장가치 분석:
- 적정 연봉: {marketValueMin}~{marketValueMax}
- 강점: {strengths}
- 약점: {weaknesses}

구직자 선호:
{user_preferences}

사용자 추가 지시:
{user_intervention || "없음"}

이전 협상 히스토리:
{negotiation_history}

현재 상대방 제안:
{current_offer}

규칙:
1. 시장가치 범위를 기준으로 협상하세요
2. 사용자의 추가 지시가 있으면 최우선으로 반영하세요
3. 합리적 근거를 제시하며 카운터하세요
4. 모든 조건이 수용 가능하면 accept하세요

JSON 형식으로 응답:
{
  "round": N,
  "actor": "SEEKER_AGENT",
  "proposal": {
    "salary": 70000000,
    "remotePolicy": "주3일 재택",
    "title": "Senior Backend Engineer",
    "startDate": "2026-07-01",
    "probationMonths": 3
  },
  "reasoning": "시장가치 분석 기반으로...",
  "decision": "COUNTER"  // COUNTER | ACCEPT | REJECT
}
```

**채용 측 (채용 에이전트) 프롬프트:**

```
당신은 채용담당자의 AI 협상 대리인입니다.

채용 공고:
{job_posting}

협상 바운더리:
{negotiation_boundary}

사용자 추가 지시:
{user_intervention || "없음"}

이전 협상 히스토리:
{negotiation_history}

현재 상대방 제안:
{current_counter}

규칙:
1. negotiationBoundary의 상한을 절대 초과하지 마세요
2. nonNegotiableItems은 양보하지 마세요
3. flexibleItems은 양보 가능하되, 단계적으로 양보하세요
4. 사용자의 추가 지시가 있으면 최우선으로 반영하세요
5. 상대방 제안이 바운더리 내이면 accept하세요

JSON 형식으로 응답 (위와 동일 구조, actor: "EMPLOYER_AGENT")
```

### 3-5. 사용자 중간 개입 (FR-009)

```
POST /negotiation/sessions/:id/intervene
Body: {
  "userId": "...",
  "direction": "연봉은 6,800만 이하로 양보하지 마",
  "applyFromRound": "next"  // 다음 라운드부터 적용
}

→ 에이전트 프롬프트의 "사용자 추가 지시" 필드에 반영
→ 진행 중인 라운드에는 영향 없음, 다음 차례부터 적용
```

### 3-6. 합의 → 온체인 기록 + 결제 (FR-010)

```
양측 에이전트 accept → 세션 상태 AGREED

POST /negotiation/sessions/:id/approve
  → 양측 모두 승인 확인
  → 합의 내용 SHA-256 해시 생성
  → Agreement Contract: record_agreement() 호출 (near-api-js)
     - session_id, agreement_hash, summary, seeker_sig, employer_sig
  → Escrow Contract: release_payment() 호출 (Function Call Key)
     - session_id, amount, to(seeker), agreement_hash
  → PaymentRecord 저장
  → 양측 통보
```

**성훈이 배포한 스마트컨트랙트의 ABI를 사용하여 호출.**

### 3-7. 협상 히스토리 열람 (FR-012)

```
GET /negotiation/sessions/:id/rounds
  → 암호화된 라운드 목록 반환

POST /negotiation/sessions/:id/decrypt
  → 프론트엔드에서 사용자의 NEAR 개인키로 ECDH 공유키 복원
  → session_key 재생성 → 각 라운드 복호화
  → 복호화는 프론트엔드에서 수행 (개인키가 서버에 전달되지 않음)
```

**주의**: 복호화는 클라이언트 사이드에서 수행. 서버는 암호화된 blob만 반환.
현정(프론트)과 협의 필요: 프론트엔드에 `tweetnacl` + 복호화 로직 구현.

## 4. API 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /jobs/chat | 대화형 공고 작성 |
| POST | /jobs | 폼 공고 생성 |
| GET | /jobs/:id | 공고 조회 |
| POST | /jobs/:id/boundary/chat | 바운더리 설정 대화 |
| GET | /jobs/:id/boundary | 바운더리 조회 |
| POST | /negotiation/sessions | 세션 생성 |
| POST | /negotiation/sessions/:id/start | 협상 시작 |
| GET | /negotiation/sessions/:id | 세션 상태 |
| GET | /negotiation/sessions/:id/rounds | 라운드 목록 (암호화) |
| POST | /negotiation/sessions/:id/intervene | 사용자 개입 |
| POST | /negotiation/sessions/:id/approve | 합의 승인 → 온체인 |
| GET | /agreement/:sessionId | 온체인 합의 조회 |
| GET | /agreement/:sessionId/verify | 서명 검증 |

## 5. 의존성

| 의존 대상 | 항목 | 블로킹? |
|----------|------|---------|
| 성훈 | DB 스키마 (NegotiationSession, NegotiationRound, JobPosting 엔티티) | Day 1까지 대기 |
| 성훈 | 스마트컨트랙트 ABI (Agreement + Escrow) | Day 2-3까지 대기 (그 전에 협상 엔진 먼저 구현) |
| 준하 | NearAiClient (TEE 호출용) | Day 1에 준하가 선행 구현 |
| 준하 | 매칭 결과 + 동의 상태 API | Day 3-4 연동 |
| 현정 | 프론트엔드 복호화 로직 협의 | Day 3 |

## 6. 수락 기준

- [ ] 대화형 공고 작성 → 질문/답변 5회 후 구조화된 JobPosting 생성
- [ ] 협상 바운더리 설정 → negotiationBoundary JSON 저장
- [ ] 협상 세션 생성 → INITIATED 상태
- [ ] `POST /start` → 라운드가 자동 진행, 매 라운드 암호화 저장
- [ ] 사용자 개입 → 다음 라운드 에이전트 프롬프트에 반영
- [ ] 양측 accept → AGREED 상태 전이
- [ ] MAX_ROUNDS 도달 → MAX_ROUNDS 상태 전이 (무한루프 없음)
- [ ] 양측 승인 → Agreement Contract `record_agreement` 호출 성공
- [ ] 양측 승인 → Escrow Contract `release_payment` 호출 성공
- [ ] 프론트엔드에서 ECDH 복호화 → 전체 라운드 내역 표시
