# NEAR AI Career Agent Platform — API Reference

> Version: 1.0.0 (PoC)
> Base URL: `http://localhost:3000`
> 인증: JWT Bearer Token (Authorization: Bearer {token})

---

## 1. 인증 (Authentication)

### POST /auth/near/challenge

NEAR 지갑 서명 검증을 위한 challenge nonce를 발급한다.

**인증**: 불필요

**응답 예시**:
```json
{
  "nonce": "a1b2c3d4e5f6...",
  "expiresAt": "2026-04-13T12:05:00.000Z"
}
```

---

### POST /auth/near/verify

NEAR 지갑의 Ed25519 서명을 검증하고 JWT를 발급한다.

**인증**: 불필요

**요청 본문**:
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| nearAccountId | string | O | NEAR 계정 ID (예: alice.testnet) |
| publicKey | string | O | Ed25519 공개키 (ed25519:BASE64 형식) |
| signature | string | O | nonce에 대한 Ed25519 서명 (base64) |
| nonce | string | O | challenge에서 받은 nonce |
| role | string | O | "SEEKER" 또는 "EMPLOYER" |

**응답 예시**:
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "nearAccountId": "alice.testnet",
    "role": "SEEKER",
    "publicKey": "ed25519:..."
  }
}
```

**에러**:
- `401` — challenge 만료 또는 서명 검증 실패

---

## 2. 데이터소스 연결 (Datasource)

### GET /datasource/connect/github

GitHub OAuth 인증 페이지로 리다이렉트한다.

**인증**: JWT 필요

**동작**: 302 Redirect → `https://github.com/login/oauth/authorize?...`

---

### GET /datasource/callback/github

GitHub OAuth 콜백. 인증 코드를 액세스 토큰으로 교환한 뒤 프론트엔드로 리다이렉트한다.

**인증**: 불필요 (GitHub에서의 리다이렉트)

**쿼리 파라미터**:
| 파라미터 | 설명 |
|----------|------|
| code | GitHub 인증 코드 |
| state | 사용자 ID |

**동작**: 302 Redirect → `{FRONTEND_URL}/datasource?github=connected`

---

### POST /datasource/connect/mock

Mock 데이터소스를 연결한다 (Slack, Discord, 정부24).

**인증**: JWT 필요

**요청 본문**:
```json
{ "provider": "slack" }
```
provider 값: `slack`, `discord`, `gov24`

**응답**: DataSourceConnection 객체

---

### GET /datasource/status

연결된 데이터소스 상태 목록을 조회한다.

**인증**: JWT 필요

**응답 예시**:
```json
[
  { "id": "uuid", "provider": "GITHUB", "status": "CONNECTED", "lastSyncedAt": "..." },
  { "id": "uuid", "provider": "SLACK", "status": "MOCK", "lastSyncedAt": "..." }
]
```

---

### POST /datasource/sync

연결된 모든 데이터소스를 수동 동기화한다.

**인증**: JWT 필요

**응답 예시**:
```json
{ "message": "동기화 완료", "connectedSources": ["github", "slack"] }
```

---

## 3. 이력서 (Resume)

### POST /resume/generate

이력서 생성 파이프라인을 시작한다 (비동기).

**인증**: JWT 필요

**응답** (202 Accepted):
```json
{
  "id": "uuid",
  "status": "COLLECTING",
  "message": "이력서 생성이 시작되었습니다."
}
```

---

### GET /resume/:id

이력서 상세 정보를 조회한다.

**인증**: JWT 필요

**응답**: ResumeProfile 전체 객체 (skills, experience, education, summary, marketValue 등)

---

### GET /resume/:id/status

이력서 생성 진행 상태를 조회한다.

**인증**: JWT 필요

**응답 예시**:
```json
{ "id": "uuid", "status": "ANALYZING" }
```
상태값: `COLLECTING` → `ANALYZING` → `COMPLETE` / `ERROR`

---

### GET /resume/:id/market-value

시장가치 산출 결과를 조회한다.

**인증**: JWT 필요

**응답 예시**:
```json
{
  "marketValueMin": 60000000,
  "marketValueMax": 75000000,
  "reasoning": "유사 포지션 3-5년차 기준...",
  "negotiationPoints": {
    "strengths": ["TypeScript 전문성", "오픈소스 기여"],
    "improvement_areas": ["리더십 경험 부족"]
  }
}
```

---

## 4. 채용공고 (Jobs)

### POST /jobs

폼 입력으로 채용공고를 직접 생성한다.

**인증**: JWT 필요 (EMPLOYER만)

**요청 본문**:
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | O | 포지션명 |
| description | string | O | 공고 상세 |
| requiredSkills | string[] | X | 필수 기술 |
| preferredSkills | string[] | X | 우대 기술 |
| salaryMin | number | X | 연봉 하한 |
| salaryMax | number | X | 연봉 상한 |
| salaryNegotiable | boolean | X | 연봉 협상 가능 여부 (기본: true) |
| remotePolicy | string | X | 원격근무 정책 |
| workingHours | string | X | 근무시간 |
| benefits | string | X | 복리후생 |

---

### POST /jobs/chat

채용 에이전트와의 대화를 통해 공고를 작성한다.

**인증**: JWT 필요 (EMPLOYER만)

**요청 본문**:
```json
{
  "message": "백엔드 개발자를 찾고 있어요",
  "sessionId": "optional-session-id"
}
```

**응답**: 에이전트 응답 (다음 질문 또는 완성된 공고)

---

### GET /jobs/:id

공고 상세를 조회한다.

**인증**: JWT 필요

---

### POST /jobs/:id/boundary/chat

채용 에이전트와의 대화로 협상 바운더리를 설정한다.

**인증**: JWT 필요 (EMPLOYER만)

**요청 본문**:
```json
{
  "message": "연봉 상한은 8000만원, 원격근무 가능",
  "sessionId": "optional-session-id"
}
```

---

### GET /jobs/:id/boundary

설정된 협상 바운더리를 조회한다.

**인증**: JWT 필요

---

## 5. 매칭 (Matching)

### GET /match/seeker/:seekerId

구직자 기준 매칭 공고 Top-5를 조회한다.
- Step 1: pgvector cosine similarity → Top-20
- Step 2: AI Reranker → Top-5

**인증**: JWT 필요

**응답 예시**:
```json
[
  {
    "id": "uuid",
    "seekerId": "uuid",
    "jobId": "uuid",
    "annScore": 0.87,
    "rerankScore": 0.92,
    "finalRank": 1,
    "seekerAgreed": false,
    "employerAgreed": false
  }
]
```

---

### GET /match/job/:jobId

공고 기준 매칭 후보자 Top-5를 조회한다.

**인증**: JWT 필요

---

### POST /match/:matchId/agree

매칭에 동의한다. 양측 동의 시 협상 세션이 자동 생성된다.

**인증**: JWT 필요

**응답**: 업데이트된 MatchResult (seekerAgreed/employerAgreed 상태, negotiationSessionId)

---

### GET /match/:matchId/status

매칭 동의 상태를 조회한다.

**인증**: JWT 필요

**응답 예시**:
```json
{
  "id": "uuid",
  "seekerAgreed": true,
  "employerAgreed": false,
  "negotiationSessionId": null
}
```

---

## 6. 프로필 열람 (Profile Access)

### POST /profile/:seekerId/access

상세 프로필 열람을 요청한다 (에스크로 결제 필요).

**인증**: JWT 필요 (EMPLOYER만)

---

### GET /profile/:seekerId/report

열람 권한이 있는 상세 프로필 리포트를 조회한다.

**인증**: JWT 필요 (EMPLOYER만)

---

### GET /profile/access/history

프로필 열람 내역을 조회한다.

**인증**: JWT 필요 (EMPLOYER만)

---

## 7. 협상 (Negotiation)

### POST /negotiation/sessions

협상 세션을 생성한다.

**인증**: JWT 필요

**요청 본문**:
```json
{
  "jobId": "uuid",
  "seekerId": "uuid",
  "maxRounds": 5
}
```

---

### POST /negotiation/sessions/:id/start

자동 협상을 시작한다 (비동기).

**인증**: JWT 필요

**응답** (202):
```json
{ "message": "Negotiation started", "sessionId": "uuid" }
```

---

### GET /negotiation/sessions/:id

세션 상태를 조회한다.

**인증**: JWT 필요

**응답**: NegotiationSession 객체 (state, currentRound, maxRounds, job, seeker, employer 포함)

상태값: `INITIATED` → `EMPLOYER_OFFER` → `SEEKER_COUNTER` → `EMPLOYER_COUNTER` → ... → `AGREED` / `FAILED` / `MAX_ROUNDS`

---

### GET /negotiation/sessions/:id/rounds

라운드 히스토리를 조회한다 (암호화 상태).

**인증**: JWT 필요

---

### POST /negotiation/sessions/:id/decrypt

세션키를 사용하여 라운드 히스토리를 복호화한다.

**인증**: JWT 필요

**요청 본문**:
```json
{ "sessionKey": "hex-encoded-32-byte-session-key" }
```

**응답 예시**:
```json
[
  {
    "round": 1,
    "actor": "EMPLOYER_AGENT",
    "decision": "COUNTER",
    "data": {
      "round": 1,
      "actor": "EMPLOYER_AGENT",
      "proposal": { "salary": 70000000, "remote": "hybrid", ... },
      "reasoning": "공고 기준 초기 제안...",
      "decision": "COUNTER"
    },
    "timestamp": "2026-04-13T10:00:00.000Z"
  }
]
```

복호화 실패 시 `data: null`, `error: "Decryption failed"` 반환.

---

### POST /negotiation/sessions/:id/intervene

사용자가 에이전트에게 방향 지시를 보낸다.

**인증**: JWT 필요

**요청 본문**:
```json
{ "direction": "연봉은 양보하지 마" }
```

---

### POST /negotiation/sessions/:id/approve

합의 내용을 승인한다. 양측 승인 시 온체인 기록용 TX 파라미터를 반환한다.

**인증**: JWT 필요

**응답 예시 (한쪽 승인 시)**:
```json
{ "status": "waiting_for_other_party" }
```

**응답 예시 (양측 승인 시)**:
```json
{
  "status": "both_approved",
  "txParams": {
    "contractId": "agreement.testnet",
    "methodName": "record_agreement",
    "args": { ... },
    "deposit": "0",
    "gas": "30000000000000"
  }
}
```

---

### POST /negotiation/sessions/:id/confirm-tx

프론트엔드에서 온체인 기록 TX 완료 후 TX 해시를 확인한다.

**인증**: JWT 필요

**요청 본문**:
```json
{ "txHash": "ABCD1234..." }
```

---

## 8. 합의 기록 (Agreement)

### GET /agreement/:sessionId

온체인에 기록된 합의 정보를 조회한다 (NEAR RPC view call).

**인증**: JWT 필요

---

### GET /agreement/:sessionId/verify

온체인 합의 기록 존재 여부를 검증한다.

**인증**: JWT 필요

**응답 예시**:
```json
{ "sessionId": "uuid", "verified": true }
```

---

## 9. 에스크로 / 결제 (Escrow & Payments)

### POST /escrow/deposit

에스크로 예치를 위한 TX 파라미터를 반환한다.

**인증**: JWT 필요

**요청 본문**:
```json
{ "amount": "1000000000000000000000000" }
```
amount: yoctoNEAR 단위 (1 NEAR = 10^24 yoctoNEAR)

**응답 예시**:
```json
{
  "contractId": "escrow.testnet",
  "methodName": "deposit",
  "args": {},
  "deposit": "1000000000000000000000000"
}
```

---

### GET /escrow/balance?accountId={nearAccountId}

에스크로 잔액을 조회한다.

**인증**: JWT 필요

**응답 예시**:
```json
{ "balance": "900000000000000000000000" }
```

---

### GET /escrow/payments/history

결제 내역을 조회한다 (employer/seeker 양쪽 모두 조회 가능).

**인증**: JWT 필요

**응답 예시**:
```json
[
  {
    "id": "uuid",
    "sessionId": "uuid",
    "employerId": "uuid",
    "seekerId": "uuid",
    "amount": 100000000,
    "nearTxHash": "ABCD...",
    "agreementHash": "abcdef...",
    "createdAt": "2026-04-13T10:00:00.000Z"
  }
]
```

---

## 에러 응답 형식

모든 에러는 NestJS 표준 형식을 따른다:

```json
{
  "statusCode": 401,
  "message": "Ed25519 signature verification failed",
  "error": "Unauthorized"
}
```

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 (필수 필드 누락 등) |
| 401 | 인증 실패 (JWT 만료, 서명 검증 실패) |
| 403 | 권한 없음 (EMPLOYER 전용 API에 SEEKER 접근) |
| 404 | 리소스 없음 |
| 409 | 상태 충돌 (이미 시작된 협상 재시작 등) |
