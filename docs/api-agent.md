# NEAR AI Career Agent Platform — API Specification for AI Agents

> This document is designed for AI agents that interact with the TalentTee API.
> All endpoints use JSON. Base URL: `http://localhost:3000`.
> Authenticated endpoints require `Authorization: Bearer {jwt}` header.

---

## Authentication Flow

```
1. POST /auth/near/challenge → { nonce, expiresAt }
2. Sign nonce with NEAR wallet (Ed25519)
3. POST /auth/near/verify { nearAccountId, publicKey, signature, nonce, role } → { jwt, user }
4. Use jwt in Authorization header for subsequent requests
```

---

## Endpoints

### AUTH

```yaml
POST /auth/near/challenge:
  auth: none
  body: none
  response: { nonce: string, expiresAt: string }

POST /auth/near/verify:
  auth: none
  body:
    nearAccountId: string    # e.g. "alice.testnet"
    publicKey: string        # "ed25519:BASE64..."
    signature: string        # base64-encoded Ed25519 detached signature of nonce
    nonce: string            # from /challenge
    role: string             # "SEEKER" | "EMPLOYER"
  response: { jwt: string, user: { id, nearAccountId, role, publicKey } }
  errors: [401]
```

### DATASOURCE

```yaml
GET /datasource/connect/github:
  auth: JWT
  action: 302 redirect to GitHub OAuth
  note: Browser-only. After OAuth, redirects to /datasource/callback/github

GET /datasource/callback/github:
  auth: none (GitHub redirect)
  query: { code: string, state: string }
  action: Exchanges code for token, stores connection, redirects to frontend

POST /datasource/connect/mock:
  auth: JWT
  body: { provider: "slack" | "discord" | "gov24" }
  response: DataSourceConnection

GET /datasource/status:
  auth: JWT
  response: DataSourceConnection[]

POST /datasource/sync:
  auth: JWT
  response: { message: string, connectedSources: string[] }
```

### RESUME

```yaml
POST /resume/generate:
  auth: JWT
  body: none
  response: { id: string, status: "COLLECTING", message: string }
  status_code: 202
  note: Async pipeline. Poll /resume/:id/status for progress.

GET /resume/{id}:
  auth: JWT
  response: ResumeProfile  # Full object with skills, experience, education, embedding, marketValue

GET /resume/{id}/status:
  auth: JWT
  response: { id: string, status: "COLLECTING" | "ANALYZING" | "COMPLETE" | "ERROR" }

GET /resume/{id}/market-value:
  auth: JWT
  response:
    marketValueMin: number   # in KRW (만원 단위 아님, 원 단위)
    marketValueMax: number
    reasoning: string
    negotiationPoints: { strengths: string[], improvement_areas: string[] }
```

### JOBS

```yaml
POST /jobs:
  auth: JWT (EMPLOYER only)
  body:
    title: string              # required
    description: string        # required
    requiredSkills: string[]   # optional
    preferredSkills: string[]  # optional
    salaryMin: number          # optional
    salaryMax: number          # optional
    salaryNegotiable: boolean  # optional, default true
    remotePolicy: string       # optional
    workingHours: string       # optional
    benefits: string           # optional
  response: JobPosting
  errors: [403]

POST /jobs/chat:
  auth: JWT (EMPLOYER only)
  body:
    message: string            # User message for conversational job creation
    sessionId: string | null   # Pass previous sessionId for multi-turn
  response: { reply: string, jobId?: string, sessionId: string, complete: boolean }

GET /jobs/{id}:
  auth: JWT
  response: JobPosting

POST /jobs/{id}/boundary/chat:
  auth: JWT (EMPLOYER only)
  body: { message: string, sessionId: string | null }
  response: { reply: string, boundary?: object, complete: boolean }

GET /jobs/{id}/boundary:
  auth: JWT
  response: { negotiationBoundary: object }
```

### MATCHING

```yaml
GET /match/seeker/{seekerId}:
  auth: JWT
  response: MatchResult[]
  note: Triggers 2-stage matching (ANN Top-20 → Reranker Top-5). May take 5-10s.
  fields_per_result:
    id: string
    seekerId: string
    jobId: string
    annScore: float        # 0.0-1.0 cosine similarity
    rerankScore: float     # 0.0-1.0 reranker relevance
    finalRank: integer     # 1-5
    seekerAgreed: boolean
    employerAgreed: boolean
    negotiationSessionId: string | null

GET /match/job/{jobId}:
  auth: JWT
  response: MatchResult[]
  note: Same as above but matches seekers to a specific job

POST /match/{matchId}/agree:
  auth: JWT
  body: none
  response: MatchResult (updated)
  side_effect: If both parties agree, NegotiationSession is auto-created
  note: Role is determined from JWT. SEEKER sets seekerAgreed, EMPLOYER sets employerAgreed.

GET /match/{matchId}/status:
  auth: JWT
  response: { id, seekerAgreed, employerAgreed, negotiationSessionId }
```

### PROFILE ACCESS

```yaml
POST /profile/{seekerId}/access:
  auth: JWT (EMPLOYER only)
  body: none
  response: ProfileAccessGrant
  side_effect: Escrow payment of 0.1 NEAR deducted
  errors: [403, 402_insufficient_balance]

GET /profile/{seekerId}/report:
  auth: JWT (EMPLOYER only, must have access grant)
  response: Detailed profile report (skills, projects, collaboration signals, growth, certifications, market value)

GET /profile/access/history:
  auth: JWT (EMPLOYER only)
  response: ProfileAccessGrant[]
```

### NEGOTIATION

```yaml
POST /negotiation/sessions:
  auth: JWT
  body:
    jobId: string
    seekerId: string
    maxRounds: number      # optional, default 5
  response: NegotiationSession

POST /negotiation/sessions/{id}/start:
  auth: JWT
  body: none
  response: { message: "Negotiation started", sessionId: string }
  status_code: 202
  side_effect: Starts async N-round negotiation in background

GET /negotiation/sessions/{id}:
  auth: JWT
  response: NegotiationSession (with job, seeker, employer relations)
  key_fields:
    state: "INITIATED" | "EMPLOYER_OFFER" | "SEEKER_COUNTER" | "EMPLOYER_COUNTER" | "AGREED" | "FAILED" | "MAX_ROUNDS"
    currentRound: integer
    maxRounds: integer
    seekerApproved: boolean
    employerApproved: boolean
    agreementHash: string | null
    onChainTxHash: string | null

GET /negotiation/sessions/{id}/rounds:
  auth: JWT
  response: NegotiationRound[] (encrypted)
  note: Returns encrypted data. Use /decrypt to get plaintext.

POST /negotiation/sessions/{id}/decrypt:
  auth: JWT
  body:
    sessionKey: string     # hex-encoded 32-byte key derived via ECDH
  response: Array of:
    round: integer
    actor: "SEEKER_AGENT" | "EMPLOYER_AGENT"
    decision: "COUNTER" | "ACCEPT" | "REJECT"
    data: object | null    # Decrypted proposal JSON; null if decryption fails
    error: string | null   # Error message if decryption failed
    timestamp: string
  note: |
    Session key derivation (client-side):
    1. Ed25519 keys → Curve25519 conversion
    2. X25519 ECDH(myPrivKey, serverPublicKey) → sharedSecret
    3. HKDF-SHA256(sharedSecret, sessionKeyNonce) → 32-byte sessionKey
    4. Hex-encode and send as sessionKey parameter

POST /negotiation/sessions/{id}/intervene:
  auth: JWT
  body:
    direction: string      # Free-text instruction, e.g. "연봉은 양보하지 마"
  response: { message: "Intervention registered", sessionId: string }
  note: Direction is applied to the next round for the caller's agent

POST /negotiation/sessions/{id}/approve:
  auth: JWT
  body: none
  response:
    case_waiting: { status: "waiting_for_other_party" }
    case_both_approved:
      status: "both_approved"
      txParams:
        contractId: string
        methodName: "record_agreement"
        args: { session_id, agreement_hash, summary, seeker_account, employer_account, seeker_signature, employer_signature }
        deposit: "0"
        gas: "30000000000000"
  note: Frontend should execute txParams as a NEAR transaction, then call /confirm-tx

POST /negotiation/sessions/{id}/confirm-tx:
  auth: JWT
  body: { txHash: string }
  response: { message: "Transaction hash recorded", sessionId: string }
```

### AGREEMENT (On-chain)

```yaml
GET /agreement/{sessionId}:
  auth: JWT
  response: AgreementRecord | null
  note: Queries NEAR blockchain via RPC view call

GET /agreement/{sessionId}/verify:
  auth: JWT
  response: { sessionId: string, verified: boolean }
  note: Returns true if agreement exists on-chain
```

### ESCROW & PAYMENTS

```yaml
POST /escrow/deposit:
  auth: JWT
  body: { amount: string }     # yoctoNEAR (1 NEAR = "1000000000000000000000000")
  response:
    contractId: string
    methodName: "deposit"
    args: {}
    deposit: string
  note: Frontend should execute this as a NEAR transaction with the deposit amount

GET /escrow/balance?accountId={nearAccountId}:
  auth: JWT
  response: { balance: string }  # yoctoNEAR

GET /escrow/payments/history:
  auth: JWT
  response: PaymentRecord[]
  fields:
    id: string
    sessionId: string
    employerId: string
    seekerId: string
    amount: number
    nearTxHash: string
    agreementHash: string
    createdAt: string
```

---

## Data Types

### Enums

```
UserRole:            SEEKER | EMPLOYER
DataSourceProvider:  GITHUB | SLACK | DISCORD | GOV24
DataSourceStatus:    CONNECTED | MOCK
JobPostingStatus:    ACTIVE | CLOSED
ResumeStatus:        COLLECTING | ANALYZING | COMPLETE | ERROR
NegotiationState:    INITIATED | EMPLOYER_OFFER | SEEKER_COUNTER | EMPLOYER_COUNTER | AGREED | FAILED | MAX_ROUNDS
NegotiationActor:    SEEKER_AGENT | EMPLOYER_AGENT
NegotiationDecision: COUNTER | ACCEPT | REJECT
```

### Negotiation Round Data (decrypted)

```json
{
  "round": 1,
  "actor": "EMPLOYER_AGENT",
  "proposal": {
    "salary": 70000000,
    "signingBonus": 5000000,
    "remote": "hybrid",
    "workingHours": "flexible",
    "vacation": 20,
    "title": "Senior Developer",
    "startDate": "2026-06-01",
    "probation": "3months"
  },
  "reasoning": "공고 기준 초기 제안. 시장 평균 반영.",
  "decision": "COUNTER"
}
```

---

## Typical Agent Workflow

### Seeker Agent Flow
```
1. POST /auth/near/challenge → get nonce
2. POST /auth/near/verify → get JWT
3. POST /datasource/connect/mock { provider: "github" }
4. POST /datasource/connect/mock { provider: "slack" }
5. POST /resume/generate → get resume ID
6. Poll GET /resume/{id}/status until COMPLETE
7. GET /resume/{id}/market-value → salary range
8. GET /match/seeker/{userId} → top 5 matches
9. POST /match/{matchId}/agree → agree to match
10. Poll GET /match/{matchId}/status until negotiationSessionId != null
11. Poll GET /negotiation/sessions/{id} until state is terminal
12. POST /negotiation/sessions/{id}/approve → approve agreement
```

### Employer Agent Flow
```
1. POST /auth/near/challenge → get nonce
2. POST /auth/near/verify → get JWT (role: EMPLOYER)
3. POST /escrow/deposit { amount: "5000000000000000000000000" } → get txParams → execute on-chain
4. POST /jobs { title, description, ... } → create job posting
5. POST /jobs/{id}/boundary/chat → set negotiation boundaries
6. GET /match/job/{jobId} → top 5 candidate matches
7. POST /profile/{seekerId}/access → pay for detailed profile
8. GET /profile/{seekerId}/report → read detailed report
9. POST /match/{matchId}/agree → agree to match
10. Poll GET /negotiation/sessions/{id} until state is terminal
11. POST /negotiation/sessions/{id}/approve → approve agreement
12. Execute txParams on NEAR blockchain
13. POST /negotiation/sessions/{id}/confirm-tx { txHash }
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request — missing/invalid fields |
| 401 | Unauthorized — JWT expired or signature invalid |
| 403 | Forbidden — wrong role (e.g. SEEKER accessing EMPLOYER endpoint) |
| 404 | Not found — resource doesn't exist |
| 409 | Conflict — invalid state transition (e.g. starting already-running negotiation) |

Error response format:
```json
{ "statusCode": 401, "message": "description", "error": "Unauthorized" }
```
