# 성훈 — Foundation + Smart Contract

> **역할**: 기반 인프라, 인증, 스마트컨트랙트
> **마감**: 2026-04-17
> **의존**: 없음 (최우선, Day 1에 스키마/인터페이스 확정 필수)
> **피의존**: 준하, 승연, 현정 모두 성훈의 DB 스키마 + Auth에 의존

---

## 1. 담당 범위

| # | 기능 | PRD 참조 | 우선순위 |
|---|------|---------|---------|
| 1 | Docker Compose (PostgreSQL + pgvector + Redis) | NFR-6, 7 | Day 1 오전 (4/12) |
| 2 | DB 스키마 + TypeORM 엔티티 + 마이그레이션 + 공유 타입 | Section 4.6, 4.7 | Day 1 오전 (4/12) |
| 3 | NEAR 지갑 로그인 (NEP-413 서명 검증 + JWT) | FR-001 | Day 1 오후 (4/12) |
| 4 | Agreement + Escrow Smart Contract (Rust) | Section 8.1, 8.2 | Day 1 오후 ~ Day 2 오전 (4/12-13) |
| 5 | Escrow 예치 API + Function Call Key 부여 | FR-012 | Day 2 오후 (4/13) |
| 6 | 프론트 연결 지원 + E2E 시나리오 테스트 | - | Day 3-4 (4/14-15) |
| 7 | 온체인 트랜잭션 검증 + 고도화 | - | Day 4-5 (4/15-16) |
| 8 | 최종 리허설 + 제출 | - | Day 6 (4/17) |

## 2. Day 1 산출물 (다른 팀원 언블록 용)

### 2-1. DB 스키마 확정

전체 PRD Section 4.7의 8개 테이블을 TypeORM 엔티티로 구현:

- `user` — nearAccountId, role(SEEKER|EMPLOYER), publicKey
- `resume_profile` — userId, parsedData, skills, embedding(vector)
- `data_source_connection` — userId, provider, status
- `job_posting` — employerId, negotiationBoundary, embedding(vector)
- `negotiation_session` — state, currentRound, maxRounds, agreementHash
- `negotiation_round` — sessionId, actor, encryptedData, decision
- `escrow_deposit` — employerId, amount, remainingBalance, agentKeyPublicKey
- `profile_access_grant` — employerId, seekerId, amount, nearTxHash
- `payment_record` — sessionId, amount, nearTxHash, agreementHash
- `match_result` — seekerId, jobId, annScore, rerankScore, finalRank

**중요**: pgvector 확장 활성화 + VECTOR(1536) 컬럼 타입 설정 필수.

### 2-2. Auth API 확정

```
POST /auth/near/challenge → { nonce, expiresAt }
POST /auth/near/verify    → { jwt, user }
```

- `near-sign-verify` 패키지로 NEP-413 Ed25519 서명 검증
- JWT payload: `{ sub: nearAccountId, role: SEEKER|EMPLOYER, publicKey }`
- JwtGuard 미들웨어 → 다른 모든 엔드포인트에서 사용

### 2-3. 인터페이스/타입 공유

Day 1에 `backend/src/common/types/` 디렉토리에 공유 타입 정의:

```typescript
// 협상 라운드 제안 구조 (승연이 사용)
interface NegotiationProposal {
  salary: number;
  remotePolicy: string;
  workingHours: string;
  title: string;
  startDate: string;
  probationMonths: number;
  signingBonus?: number;
  stockOptions?: string;
}

// 협상 바운더리 구조 (준하/승연이 사용)
interface NegotiationBoundary {
  salaryMin: number;
  salaryMax: number;
  salaryHardMax: number;
  remotePolicyOptions: string[];
  nonNegotiableItems: string[];
}

// 에이전트 응답 구조 (준하/승연이 사용)
interface AgentResponse {
  round: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  proposal: NegotiationProposal;
  reasoning: string;
  decision: 'COUNTER' | 'ACCEPT' | 'REJECT';
}
```

## 3. Smart Contract 상세

### 3-1. Agreement Contract

```rust
// near-sdk-rs, Rust
// 배포 대상: agreement.testnet (또는 서브계정)

pub struct AgreementRecord {
    pub session_id: String,
    pub agreement_hash: String,       // SHA-256
    pub summary: AgreementSummary,
    pub seeker_account: AccountId,
    pub employer_account: AccountId,
    pub seeker_signature: Vec<u8>,
    pub employer_signature: Vec<u8>,
    pub created_at: u64,
}

pub struct AgreementSummary {
    pub position_title: String,
    pub agreed_salary: u128,
    pub start_date: String,
    pub negotiation_rounds: u32,
}

// 함수
fn record_agreement(session_id, agreement_hash, summary, seeker_sig, employer_sig)
fn get_agreement(session_id) -> Option<AgreementRecord>
fn verify_agreement(session_id) -> bool
```

### 3-2. Escrow Contract

```rust
// 배포 대상: escrow.testnet (또는 서브계정)

pub struct EscrowAccount {
    pub employer_id: AccountId,
    pub balance: Balance,
    pub agent_key: PublicKey,
}

pub struct ProfileAccessRecord {
    pub employer_id: AccountId,
    pub seeker_id: AccountId,
    pub amount: Balance,
    pub timestamp: u64,
}

// 함수
#[payable]
fn deposit()                                                // 채용측 NEAR 예치
fn pay_for_profile(seeker_id: AccountId)                    // 에이전트가 호출 → 프로필 열람 결제
fn get_balance(employer_id) -> Balance
fn get_access_history(employer_id) -> Vec<ProfileAccessRecord>
```

### 3-3. Escrow 예치 + Function Call Key API

```
POST /escrow/deposit  → 프론트엔드가 지갑으로 deposit() 호출하도록 안내
GET  /escrow/balance  → 잔액 조회 (NEAR RPC로 컨트랙트 상태 조회)
```

- Function Call Access Key: `escrow_contract`의 `pay_for_profile`만 호출 가능
- 키 부여는 프론트엔드에서 지갑 팝업으로 처리 (near-api-js `addKey`)

## 4. 인프라

### Docker Compose

```yaml
# PostgreSQL 16 + pgvector
# Redis 7 (BullMQ용)
```

Day 1에 `docker-compose.yml` 작성 + pgvector 확장 활성화 + 마이그레이션 실행 스크립트.

## 5. 다른 팀원에게 제공하는 것

| 팀원 | 제공 항목 | 시점 |
|------|----------|------|
| 준하 | DB 스키마, TypeORM 엔티티, JwtGuard | Day 1 |
| 승연 | DB 스키마, TypeORM 엔티티, JwtGuard, 스마트컨트랙트 ABI | Day 1 (스키마), Day 2-3 (컨트랙트) |
| 현정 | Auth API 스펙 (challenge/verify), JWT 토큰 구조 | Day 1 |

## 6. 수락 기준

- [ ] `docker-compose up` → PostgreSQL + pgvector + Redis 정상 기동
- [ ] 마이그레이션 실행 → 9개 테이블 생성 (profile_access_grant 포함), pgvector 확장 활성화
- [ ] `POST /auth/near/verify` → 유효한 서명 시 JWT 반환
- [ ] Agreement Contract가 Testnet에 배포되고, `record_agreement` + `get_agreement` 동작
- [ ] Escrow Contract가 Testnet에 배포되고, `deposit` + `pay_for_profile` + `get_balance` 동작
- [ ] Function Call Key로 `pay_for_profile` 호출 가능 (지갑 팝업 없이)
