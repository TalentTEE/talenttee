# NEAR AI Career Agent Platform — PRD

## 1. 개요

### 핵심 가치

> "NEAR 지갑으로 연결하면, AI 에이전트가 나의 이력을 관리하고, 시장가치를 판단하고, 회사 에이전트와 자율적으로 채용 조건을 협상한다."

구직자와 채용담당자가 각각 자신의 AI 에이전트를 보유하고, 에이전트끼리 NEAR AI Cloud TEE 환경에서 프라이빗하게 채용 조건을 협상한다. 합의에 도달하면 결과를 NEAR 블록체인에 기록하고 에스크로 자동결제를 실행한다.

### 대상 사용자

| 사용자 | 특성 |
|--------|------|
| **구직자** | 개발자, 자신의 커리어 관리를 에이전트에 위임하고 싶은 사람 |
| **채용담당자** | 인사팀이 뚜렷하게 없는 비교적 작은 회사, 공고 작성이 어려운 담당자 |

---

## 2. 에이전트 아키텍처

### 2-1. 에이전트 3종

| 에이전트 | 역할 | 소속 |
|---------|------|------|
| **커리어 에이전트** | 데이터소스에서 이력 수집/최신화, 시장가치 산출, 협상 수행 | 구직자 |
| **채용 에이전트** | 대화형 공고 작성 가이드, 협상 기준 설정, 협상 수행 | 채용담당자 |
| **매칭 오케스트레이터** | 구직자-공고 매칭, 협상 세션 생성/관리, 합의 시 온체인 기록 + 결제 트리거 | 시스템 |

### 2-2. 전체 시스템 흐름

```
[구직자]                                [채용담당자]
   │ NEAR 지갑 로그인                        │ NEAR 지갑 로그인
   │ GitHub OAuth 연결 (나머지 mock)          │ 에스크로에 NEAR 예치
   │                                         │ 채용 에이전트와 대화 → 공고 완성
   ▼                                         ▼
커리어 에이전트                           채용 에이전트
   │ 데이터 수집 → 이력서 최신화               │ 공고 구조화 + 협상 기준 설정
   │ 시장가치 산출                            │
   └──────────────── 매칭 ──────────────────┘
                      │
            매칭 오케스트레이터
                      │
       ┌──── TEE Cloud (프라이빗 협상) ────┐
       │  커리어 에이전트 ←→ 채용 에이전트   │
       │  N라운드 (연봉/조건/직급/시작일)    │
       │  매 라운드 → DB 저장 (ECDH 암호화) │
       └──────────────────────────────────┘
                      │
               합의 도달 시
                      │
       ┌──── NEAR 블록체인 ────────────┐
       │  합의 내용 해시 온체인 기록       │
       │  에스크로 자동결제 실행           │
       └───────────────────────────────┘
                      │
            양측에 결과 통보 → 면접 프로세스
```

---

## 3. NEAR 기술 활용 매핑

| 기능 | NEAR 기술 | 상세 |
|------|----------|------|
| 사용자 인증 | **near-connect** + **near-sign-verify** (NEP-413) | 지갑 서명으로 로그인, 서버에서 Ed25519 검증 후 JWT 발급 |
| 에이전트 LLM 추론 | **NEAR AI Cloud** (`cloud-api.near.ai/v1`) | TEE(Intel TDX + NVIDIA) 환경에서 프라이빗 AI 추론 |
| 이력서 임베딩/매칭 | **NEAR AI Cloud** (Qwen3-Embedding, Qwen3-Reranker) | 벡터 임베딩 + 2단계 리랭킹 |
| 에이전트 자율 결제 | **Function Call Access Key** + **에스크로 스마트컨트랙트** | 사용자 1회 승인 → 에이전트 자동 결제 |
| 합의 내용 온체인 기록 | **near-sdk-rs** (Rust 스마트컨트랙트) | 합의 해시 + 주요 조건 저장, 양측 서명 검증 |
| 협상 데이터 암호화 | **Ed25519 키 (NEAR 지갑 키쌍)** → ECDH 공유키 | 양측만 열람 가능한 E2E 암호화 |
| 가스 없는 사용자 경험 | **Meta Transactions (NEP-366)** | 백엔드가 릴레이어 역할, 사용자 가스비 0 |
| 블록체인 상호작용 | **near-api-js** + **NEAR MCP Server** | 계정 조회, 트랜잭션 검증, 컨트랙트 호출 |
| 스마트컨트랙트 빌드 | **near-sdk-rs** + **cargo-near** | 에스크로 + 합의기록 컨트랙트 빌드/배포 |
| 테스트넷 | **NEAR Faucet** (2 NEAR) + **Circle Faucet** (20 USDC) | 테스트용 토큰 확보 |

---

## 4. 모듈 상세

### 4-1. 커리어 에이전트 (구직자 측)

**역할**: 데이터 수집 → 이력서 최신화 → 시장가치 산출 → 협상 수행

#### 데이터소스 연동

| 소스 | 연동 방식 | 수집 데이터 |
|------|----------|-----------|
| **GitHub** | OAuth 실제 연동 | 커밋 히스토리, 사용 언어, 기여 프로젝트, PR/이슈 활동 |
| **Slack** | Mock (fixture 반환) | 채널 활동, 키워드 빈도 (협업/리더십 시그널) |
| **Discord** | Mock (fixture 반환) | 커뮤니티 활동, 역할 |
| **정부24** | Mock (fixture 반환) | 자격증, 학력 인증 |

연동 시 skill.md 같은 설정 파일을 실행하면 "연결됨" 상태가 되는 UX. 실제 OAuth는 GitHub만 구현하고, 나머지는 연결 UI + fixture 데이터로 데모.

#### 이력서 최신화

- 데이터소스에서 수집한 원시 데이터를 NEAR AI Cloud TEE로 전송
- LLM이 기존 이력서와 새 데이터를 비교/분석
- 이력에 도움이 될 만한 내용을 추려서 이력서에 반영
- 주기적 조회: BullMQ 스케줄러로 주기적 데이터 수집 트리거

#### 데이터 분류 (프롬프트 영역)

Slack/Discord 데이터 수집 시, 메시지 성격을 분류:

| 분류 | 설명 | 이력서 반영 |
|------|------|-----------|
| **작업** | 코드 리뷰, 배포, 버그 수정 등 직접 기여 | 직접 반영 (프로젝트 경험) |
| **논의** | 아키텍처 토론, 기술 선택 참여 | 간접 반영 (기술 이해도/리더십) |
| **피드백** | 코드 리뷰 코멘트, 동료 피드백 | 소프트스킬 근거로 활용 |

분류 로직은 LLM 프롬프트로 처리. 하네스(시스템 프롬프트)에 분류 기준을 정의.

#### 시장가치 산출

```
입력:
  1) 내 이력 분석 결과 (경력년수, 스킬셋, 희소성, 활동량)
  2) DB 내 유사 공고들의 연봉/조건 데이터

처리 (NEAR AI Cloud TEE):
  - 유사 포지션 연봉 범위 분석
  - 내 이력 대비 시장 포지셔닝
  - 강점/약점 대비 협상 포인트 도출

출력:
  - 적정 연봉 범위: X~Y
  - 협상 가능 조건 리스트
  - 근거 요약 (어떤 데이터 기반인지)
```

### 4-2. 채용 에이전트 (회사 측)

**역할**: 대화형 공고 작성 → 협상 기준 설정 → 협상 수행

#### 대화형 공고 작성

챗봇이 질문을 던지면서 공고를 채워나가는 방식:

```
에이전트: "어떤 포지션을 채용하시나요?"
담당자:  "백엔드 개발자요"
에이전트: "필수 기술스택은 무엇인가요?"
담당자:  "Node.js, TypeScript"
에이전트: "경력 요구사항은요?"
담당자:  "3년 이상"
에이전트: "연봉 범위는 어떻게 되나요?"
담당자:  "5,000~7,000만원"
에이전트: "원격근무 가능한가요?"
담당자:  "주 2회 출근, 나머지 재택"
...
→ 구조화된 채용공고 자동 생성
```

#### 협상 기준 설정

공고 작성 후, 에이전트가 추가 질문으로 협상 바운더리 설정:

```
에이전트: "이 포지션 연봉 상한은 얼마까지 가능한가요?"
담당자:  "8,000만원까지"
에이전트: "원격근무 조건은 양보 가능한가요?"
담당자:  "풀 리모트까지 가능해요"
에이전트: "수습기간은 필수인가요?"
담당자:  "3개월 수습은 필수입니다"

→ 협상 파라미터:
  - 연봉: 5,000~8,000만 (제시: 5,000~7,000 / 상한: 8,000)
  - 원격: 주2출근~풀리모트 (양보 가능)
  - 수습: 3개월 (양보 불가)
  - 시작일: 협상 가능
```

### 4-3. 매칭 오케스트레이터

**역할**: 2단계 시맨틱 매칭

```
Step 1: 벡터 유사도 (ANN)
  - 이력서 임베딩 vs 공고 임베딩
  - Qwen3-Embedding으로 생성
  - pgvector cosine similarity → Top-20

Step 2: 리랭킹 (Precision)
  - Top-20 후보를 Qwen3-Reranker로 정밀 평가
  - 이력서 텍스트 + 공고 텍스트 → 관련성 점수
  - → Top-5 최종 매칭 결과

Step 3: 양측 통보 → 동의 시 협상 세션 생성
```

### 4-4. 협상 엔진

#### 협상 항목

| 카테고리 | 항목 |
|---------|------|
| **연봉/보상** | 기본급, 성과 보너스, 스톡옵션/RSU, 사이닝 보너스 |
| **근무조건** | 원격/출근 비율, 근무시간, 연차/휴가, 장비 지원 |
| **포괄 조건** | 직급/타이틀, 소속 팀, 시작일, 수습기간 |

#### 협상 라운드 진행

```
상태머신:
  INITIATED → EMPLOYER_OFFER → SEEKER_COUNTER → EMPLOYER_COUNTER
  → ... → AGREED | FAILED | MAX_ROUNDS

라운드 진행:
  Round 1: 채용 에이전트 → 초기 오퍼 (공고 기준)
  Round 2: 커리어 에이전트 → 카운터 (시장가치 + 구직자 선호 기반)
  Round 3: 채용 에이전트 → 수정 제안 (바운더리 내에서 양보)
  ...
  Round N: 합의 / MAX_ROUNDS 도달 / 결렬

각 라운드 출력 (구조화된 JSON):
  {
    "round": 3,
    "actor": "employer_agent",
    "proposal": {
      "salary": 68000000,
      "remote_policy": "3일 재택, 2일 출근",
      "title": "Senior Backend Engineer",
      "start_date": "2026-07-01",
      "probation_months": 3
    },
    "reasoning": "구직자의 GitHub 활동량과 경력을 고려하여...",
    "decision": "counter"  // "counter" | "accept" | "reject"
  }
```

#### 종료 조건

| 조건 | 결과 |
|------|------|
| 양측 에이전트 모두 `accept` | AGREED → 온체인 기록 + 결제 |
| 한쪽이 `reject` | FAILED → 종료 |
| `currentRound >= maxRounds` | MAX_ROUNDS → 종료, 마지막 제안 기준 양측에 수동 결정 요청 |

---

## 5. 암호화 체계

### ECDH 공유키 기반 협상 데이터 암호화

양측(구직자 + 채용측)만 협상 내역을 열람할 수 있도록, NEAR 지갑의 Ed25519 키쌍을 활용한 E2E 암호화.

```
구직자 NEAR 키: Ed25519 (pub_seeker, priv_seeker)
채용측 NEAR 키: Ed25519 (pub_employer, priv_employer)

세션 시작 시:
  1. Ed25519 → Curve25519 변환
     (crypto_sign_ed25519_pk_to_curve25519)
  2. X25519 ECDH → shared_secret
  3. HKDF-SHA256(shared_secret, session_id) → session_key

매 라운드 데이터 저장:
  XChaCha20-Poly1305(session_key, round_data) → encrypted_blob → PostgreSQL

복호화:
  어느 쪽이든 자기 priv_key + 상대 pub_key → shared_secret 복원
  → session_key 재생성 → 복호화
```

### 저장 구조

| 저장소 | 내용 | 암호화 |
|--------|------|--------|
| **PostgreSQL (오프체인)** | 라운드별 전체 협상 데이터 | ECDH 공유키로 암호화 (당사자만 복호화) |
| **NEAR 블록체인 (온체인)** | 합의 내용 해시 + 주요 조건 요약 + 양측 서명 | 퍼블릭 (합의 증명용) |

---

## 6. 스마트컨트랙트

### 6-1. Agreement Contract (합의 기록)

```rust
// 합의 내용을 온체인에 기록하고 양측 서명으로 검증

pub struct AgreementRecord {
    pub session_id: String,
    pub agreement_hash: String,       // 합의 내용 전체의 SHA-256 해시
    pub summary: AgreementSummary,     // 주요 조건 요약 (온체인 공개)
    pub seeker_account: AccountId,
    pub employer_account: AccountId,
    pub seeker_signature: Vec<u8>,     // 합의 내용에 대한 구직자 서명
    pub employer_signature: Vec<u8>,   // 합의 내용에 대한 채용측 서명
    pub created_at: u64,
}

pub struct AgreementSummary {
    pub position_title: String,
    pub agreed_salary: u128,
    pub start_date: String,
    pub negotiation_rounds: u32,
}

// 주요 함수
fn record_agreement(session_id, agreement_hash, summary, seeker_sig, employer_sig)
fn get_agreement(session_id) -> Option<AgreementRecord>
fn verify_agreement(session_id) -> bool  // 서명 검증
```

### 6-2. Escrow Contract (에스크로 결제)

```rust
// 채용측이 예치하고, 에이전트가 합의 시 자동 결제

pub struct EscrowAccount {
    pub employer_id: AccountId,
    pub balance: Balance,
    pub agent_key: PublicKey,          // Function Call Access Key
}

pub struct PaymentRecord {
    pub session_id: String,
    pub amount: Balance,
    pub from: AccountId,
    pub to: AccountId,
    pub agreement_hash: String,        // 어떤 합의에 의해 결제되었는지
    pub timestamp: u64,
}

// 주요 함수
fn deposit()                                    // 채용측이 NEAR 예치 (payable)
fn release_payment(session_id, amount, to, agreement_hash)  // 에이전트가 호출
fn get_balance(employer_id) -> Balance
fn get_payment_history(employer_id) -> Vec<PaymentRecord>
```

#### 에이전트 자율 결제 흐름

```
1. 채용담당자가 에스크로 컨트랙트에 NEAR 예치     (1회 지갑 승인)
2. Function Call Access Key를 에이전트에 부여      (1회 지갑 승인)
   → 키 제한: escrow_contract의 release_payment만 호출 가능
3. 협상 합의 도달 시:
   → 에이전트가 release_payment() 호출             (지갑 팝업 없음)
   → 컨트랙트가 내부적으로 NEAR 전송 실행
   → PaymentRecord에 agreement_hash 기록 (결제 근거)
```

---

## 7. 기술 스택

### 백엔드

| 기술 | 용도 |
|------|------|
| NestJS 11 | API 서버 프레임워크 |
| TypeScript 5.7 | 타입 안전성 |
| PostgreSQL 16 + pgvector | 관계형 DB + 벡터 검색 |
| TypeORM 0.3 | ORM (pgvector 커스텀 컬럼 지원) |
| BullMQ + Redis | 비동기 작업 큐 (임베딩, 데이터 수집, 협상 라운드) |
| OpenAI SDK (v6+) | NEAR AI Cloud 호출 (OpenAI 호환 API) |

### NEAR / 블록체인

| 기술 | 용도 |
|------|------|
| near-connect | 지갑 연결 (프론트엔드) |
| near-sign-verify | NEP-413 서명 검증 (백엔드) |
| near-api-js | NEAR RPC 호출, 트랜잭션 검증 |
| near-sdk-rs + cargo-near | 스마트컨트랙트 개발/배포 (Rust) |
| NEAR MCP Server | 에이전트의 블록체인 상호작용 도구 |
| NEAR Testnet | 개발/데모 환경 |

### AI / 모델

| 모델 | 용도 |
|------|------|
| Qwen3 (Chat) | 이력서 분석, 시장가치 산출, 협상 추론, 공고 작성 가이드 |
| Qwen3-Embedding | 이력서/공고 벡터 임베딩 |
| Qwen3-Reranker | 매칭 정밀 리랭킹 |

### 암호화

| 기술 | 용도 |
|------|------|
| libsodium (tweetnacl) | Ed25519→Curve25519 변환, X25519 ECDH |
| HKDF-SHA256 | 공유 비밀에서 세션키 유도 |
| XChaCha20-Poly1305 | 협상 데이터 대칭 암호화 |

---

## 8. 데이터 모델 (핵심 엔티티)

```
User {
  id, nearAccountId, role(SEEKER|EMPLOYER), publicKey,
  createdAt, updatedAt
}

ResumeProfile {
  id, userId, rawText, parsedData(JSON),
  skills[], experience[], education[],
  marketValueMin, marketValueMax, marketValueReasoning,
  embedding(vector), updatedAt
}

DataSourceConnection {
  id, userId, provider(GITHUB|SLACK|DISCORD|GOV24),
  status(CONNECTED|MOCK), accessToken?, lastSyncedAt
}

JobPosting {
  id, employerId, title, description,
  requiredSkills[], preferredSkills[],
  salaryMin, salaryMax, salaryNegotiable(bool),
  remotePolicy, workingHours, benefits,
  negotiationBoundary(JSON),  // 에이전트 협상 바운더리
  embedding(vector), status(ACTIVE|CLOSED), createdAt
}

NegotiationSession {
  id, jobId, seekerId, employerId,
  state(INITIATED|EMPLOYER_OFFER|SEEKER_COUNTER|EMPLOYER_COUNTER|AGREED|FAILED|MAX_ROUNDS),
  currentRound, maxRounds,
  sessionKey_nonce,  // ECDH 세션키 유도용
  agreementHash?,    // 합의 시 해시
  onChainTxHash?,    // 온체인 기록 트랜잭션 해시
  createdAt, updatedAt
}

NegotiationRound {
  id, sessionId, round,
  actor(SEEKER_AGENT|EMPLOYER_AGENT),
  encryptedData(blob),   // ECDH 공유키로 암호화된 제안/응답 전체
  decision(COUNTER|ACCEPT|REJECT),
  timestamp
}

EscrowDeposit {
  id, employerId, nearTxHash, amount, remainingBalance,
  agentKeyPublicKey, createdAt
}

PaymentRecord {
  id, sessionId, employerId, seekerId,
  amount, nearTxHash, agreementHash,
  createdAt
}

MatchResult {
  id, seekerId, jobId,
  annScore, rerankScore, finalRank,
  createdAt
}
```

---

## 9. API 엔드포인트 (핵심)

### 인증

```
POST /auth/near/challenge        → { nonce, expiresAt }
POST /auth/near/verify           → { jwt, user }
```

### 데이터소스 연동

```
GET  /datasource/connect/github  → OAuth redirect
GET  /datasource/callback/github → OAuth callback → JWT
POST /datasource/connect/mock    → { provider: "slack" } → mock 연결
GET  /datasource/status          → 연결 상태 목록
POST /datasource/sync            → 수동 동기화 트리거
```

### 이력서

```
POST /resume/upload              → PDF 업로드 → 202 Accepted
GET  /resume/:id                 → 이력서 조회
GET  /resume/:id/status          → 처리 상태
GET  /resume/:id/market-value    → 시장가치 산출 결과
```

### 채용공고

```
POST /jobs/chat                  → 채용 에이전트와 대화 (공고 작성)
GET  /jobs/:id                   → 공고 조회
GET  /jobs/:id/boundary          → 협상 바운더리 조회 (채용측만)
```

### 매칭

```
GET  /match/seeker/:seekerId     → 구직자 기준 매칭 공고 Top-5
GET  /match/job/:jobId           → 공고 기준 매칭 후보자 Top-5
```

### 협상

```
POST /negotiation/sessions       → 협상 세션 생성
POST /negotiation/sessions/:id/start  → 자동 협상 시작
GET  /negotiation/sessions/:id   → 세션 상태 조회
GET  /negotiation/sessions/:id/rounds → 라운드 히스토리 (복호화 필요)
POST /negotiation/sessions/:id/decrypt → { privateKey } → 복호화된 히스토리
```

### 에스크로 / 결제

```
POST /escrow/deposit             → 에스크로 예치 안내 (프론트엔드 → 지갑)
GET  /escrow/balance             → 잔액 조회
GET  /payments/history           → 결제 내역
```

### 온체인 기록

```
GET  /agreement/:sessionId       → 온체인 합의 기록 조회
GET  /agreement/:sessionId/verify → 합의 서명 검증
```

---

## 10. 데모 시나리오

```
1. 구직자 "Alice" → NEAR 지갑으로 로그인
   → GitHub 연결 (실제 OAuth)
   → Slack, Discord "연결됨" (mock)
   → 커리어 에이전트가 자동으로 이력서 생성
   → "당신의 적정 연봉 범위: 6,000~7,500만원"

2. 채용담당자 "Bob" → NEAR 지갑으로 로그인
   → 에스크로 컨트랙트에 5 NEAR 예치 (1회 지갑 승인)
   → 에이전트에게 Function Call Key 부여 (1회 지갑 승인)
   → 채용 에이전트와 대화 → 백엔드 개발자 공고 완성
   → 협상 바운더리 설정: "연봉 상한 8,000만, 풀리모트 가능, 수습 3개월 필수"

3. 매칭 실행 → Alice가 Bob의 공고에 Top-3 매칭

4. 협상 시작 (TEE에서 자동 진행, 화면에 실시간 표시)
   Round 1: Bob 에이전트 → "연봉 6,500만, 주4일 출근, 시니어 타이틀"
   Round 2: Alice 에이전트 → "7,000만 요청, 주3일 출근 희망, 시작일 7/1"
   Round 3: Bob 에이전트 → "6,800만, 주3일 출근 수용, 시작일 7/1 OK"
   Round 4: Alice 에이전트 → "수락"
   → 합의!

5. 온체인 기록 자동 실행
   → Agreement Contract: 합의 해시 + 조건 요약 + 양측 서명 기록
   → Escrow Contract: 자동 결제 실행 (에이전트가 release_payment 호출)
   → 양측에 "합의 완료, 면접 프로세스로 진행" 통보

6. 양측 모두 협상 히스토리 열람 가능
   → 자기 NEAR 개인키로 ECDH 공유키 복원 → 전체 라운드 복호화
```

---

## 11. 범위 밖 (Out of Scope)

- 프론트엔드 구현 (별도 팀 담당)
- 모바일 앱
- 실시간 채팅 (협상은 비동기 라운드 방식)
- 실제 면접 프로세스 관리
- 법적 구속력 있는 계약 체결
- 정부24 실제 API 연동 (mock만)
- Slack/Discord 실제 OAuth 연동 (mock만)

---

## 12. 미결 항목

| 항목 | 설명 | 결정 시점 |
|------|------|----------|
| 협상 최대 라운드 수 (MAX_ROUNDS) | 5~10 사이 추천, 데모에서 확인 후 결정 | Phase 4 시작 전 |
| 에스크로 결제 금액 기준 | 고정 금액 vs 합의 연봉 비례 | Phase 4 시작 전 |
| 시장가치 산출 모델 세부 로직 | LLM 프롬프트 기반 vs 통계 모델 조합 | Phase 2에서 실험 |
| 협상 에이전트 프롬프트 튜닝 | 공격적/보수적 협상 스타일 파라미터 | Phase 4에서 반복 실험 |
| Meta Transaction 릴레이어 구현 범위 | 전체 트랜잭션 vs 에스크로만 | Phase 1에서 결정 |

---

*작성일: 2026-04-10*
*상태: Draft — 브레인스토밍 완료, 리뷰 대기*
