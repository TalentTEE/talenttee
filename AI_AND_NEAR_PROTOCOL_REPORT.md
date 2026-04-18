# TalentTEE: AI & NEAR Protocol Technical Report

> Last Updated: 2026-04-18

---

## 1. Executive Summary

TalentTEE is a Web3 talent platform that combines **NEAR AI's LLM inference**, **NEAR Protocol's on-chain escrow**, and **end-to-end encryption** to create a trustless, AI-driven salary negotiation system. The platform uses AI for resume analysis, job matching, and autonomous salary negotiation, while NEAR Protocol handles on-chain payments, escrow management, and cryptographic identity.

---

## 2. AI Technology Stack

### 2.1 AI Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| LLM API | NEAR AI Cloud (`cloud-api.near.ai/v1`) | Chat, Embedding, Reranking |
| Chat Model | `Qwen/Qwen3.5-122B-A10B` | Negotiation agents, Resume analysis |
| Embedding Model | `Qwen/Qwen3-Embedding-0.6B` | Semantic job-resume matching |
| SDK | OpenAI SDK v6.34.0 (compatible) | API client |
| Vector DB | pgvector (PostgreSQL extension) | ANN similarity search |

**Core AI Client:** `backend/src/agent/near-ai.client.ts`

```
NEAR AI Cloud API (OpenAI-compatible)
  +-- chat()        : LLM inference with system prompt + conversation history
  +-- embed()       : Generate semantic embedding vectors
  +-- rerank()      : Score document relevance using LLM-based ranking
```

---

### 2.2 AI-Powered Features

#### A. Autonomous Salary Negotiation

The core AI feature. Two AI agents (employer-side, seeker-side) negotiate salary terms autonomously.

**Pipeline:**
```
Match Created (Resume + Job)
    |
    v
RealNegotiationHandoff.createSession()
    |-- requestAccess() --> payForProfile (0.1 NEAR escrow payment)
    |-- NegotiationService.createSession()
    v
startNegotiation(sessionId)
    |-- State: EMPLOYER_OFFER
    v
executeRounds() [background, max 5 rounds]
    |
    +-- For each round:
    |     1. Determine actor (employer/seeker agent)
    |     2. Build system prompt (job details + boundary + history)
    |     3. Call aiClient.chat() --> NEAR AI LLM
    |     4. Parse structured JSON response
    |     5. Encrypt response (XChaCha20-Poly1305)
    |     6. Save to DB
    |     7. State transition (COUNTER / ACCEPT / REJECT)
    |
    v
Terminal State (AGREED / FAILED / MAX_ROUNDS)
    |-- Emit SSE event to both parties
    v
User decrypts rounds client-side with personal Ed25519 key
```

**State Machine:** `backend/src/negotiation/negotiation-engine.ts`
```
INITIATED --> EMPLOYER_OFFER --> SEEKER_COUNTER --> EMPLOYER_COUNTER
                  ^                                      |
                  |--------------------------------------+
                  |
                  +--> AGREED / FAILED / MAX_ROUNDS (terminal)
```

**AI Agent Response Schema:**
```json
{
  "round": 1,
  "actor": "EMPLOYER_AGENT | SEEKER_AGENT",
  "proposal": {
    "salary": 65000000,
    "remotePolicy": "HYBRID",
    "additionalTerms": ["stock options", "signing bonus"]
  },
  "reasoning": "Based on market data and candidate experience...",
  "decision": "COUNTER | ACCEPT | REJECT"
}
```

**Key Files:**
- `backend/src/negotiation/negotiation.service.ts` - Orchestrator (round loop)
- `backend/src/negotiation/negotiation-engine.ts` - State machine
- `backend/src/negotiation/prompts/employer-agent.prompt.ts` - Employer AI prompt
- `backend/src/negotiation/prompts/seeker-agent.prompt.ts` - Seeker AI prompt

#### B. Resume Generation & Market Value Analysis

AI analyzes multi-source data to generate structured resumes and estimate market value.

**Data Sources:**
- GitHub: Code quality, contribution patterns, tech stack
- Slack: Communication style, leadership signals
- Discord: Community engagement
- Gov24: Certifications, credentials

**Pipeline:** `backend/src/resume/resume.service.ts`
```
User triggers resume generation
    |-- Status: COLLECTING
    v
runPipeline() [background]
    |-- Fetch data from connected sources
    |-- AI classifies and structures data
    |-- Generate resume JSON (skills, experience, education)
    |-- Compute market value range (min/max salary)
    |-- Extract negotiation points (strengths/weaknesses)
    |-- Status: COMPLETED
```

**Key Prompts:**
- `backend/src/resume/prompts/resume-generate.en.prompt.ts` - Resume extraction
- `backend/src/resume/prompts/market-value.prompt.ts` - Salary estimation

#### C. Job-Resume Matching (Two-Stage)

**Stage 1 - ANN (Approximate Nearest Neighbors):**
- pgvector cosine similarity on embeddings
- Top-20 candidates retrieved

**Stage 2 - AI Rerank:**
- NEAR AI LLM scores each candidate against job description
- Returns top-N with relevance scores

**File:** `backend/src/match/match.service.ts`
```
Triggers:
  - RESUME_COMPLETED event
  - JOB_CREATED event
  - JOB_SEEKING_ON event
  - Cron job (every 6 hours)
```

#### D. Profile Detail Report

AI-generated recruiter-facing analysis of candidates.

**Covers:** Technical skills, project highlights, collaboration signals, growth trajectory, certifications, market value

**File:** `backend/src/profile/prompts/detail-report.en.prompt.ts`

#### E. Job Posting Assistance

- Embedding generation for new job descriptions
- AI-assisted salary range recommendation
- Interactive job creation chat dialogue

**File:** `backend/src/job/job.service.ts`

---

### 2.3 End-to-End Encryption (AI Data Protection)

All AI negotiation data is encrypted using a layered cryptographic scheme:

```
Ed25519 (NEAR identity keys)
    |-- Convert to Curve25519 (Montgomery form)
    v
X25519 ECDH (Diffie-Hellman key exchange)
    |-- Server key + User key --> Shared secret
    v
HKDF-SHA256 (Key derivation)
    |-- Shared secret + nonce --> 32-byte session key
    v
XChaCha20-Poly1305 (Authenticated encryption)
    |-- Encrypt each negotiation round
    v
Base64 encoding --> Stored in DB
```

**Libraries:**
| Library | Purpose |
|---------|---------|
| `@noble/curves` | Ed25519 to Curve25519 conversion, X25519 ECDH |
| `@noble/hashes` | SHA256, HKDF key derivation |
| `@noble/ciphers` | XChaCha20-Poly1305 encryption |
| `tweetnacl` | Ed25519 keypair generation |

**Key Files:**
- `backend/src/crypto/crypto.service.ts` - Server-side encryption
- `frontend/src/lib/crypto.ts` - Client-side decryption

---

### 2.4 TEE (Trusted Execution Environment) - Roadmap

Currently software-based encryption. Future plans include:
- NEAR AI confidential computing TEE for AI inference
- Hardware attestation verification (Intel SGX / NVIDIA GPU)
- Frontend attestation badge UI
- On-chain attestation proof storage

**Planned File:** `docs/superpowers/plans/hyunjeong/phase-13-near-core-tech.md`

---

## 3. NEAR Protocol Integration

### 3.1 Smart Contract: Escrow

**Contract:** `escrow.sooondae17.testnet` (NEAR Testnet)
**Source:** `contract/escrow/src/lib.rs` (588 lines, Rust)

#### Contract Methods

| Method | Type | Args | Description |
|--------|------|------|-------------|
| `deposit()` | Call (payable) | - | Employer deposits NEAR into escrow |
| `pay_for_profile(employer_id, seeker_id)` | Call | employer_id, seeker_id | Pay 0.1 NEAR for resume access (80% seeker / 20% platform) |
| `withdraw(amount)` | Call | amount (U128) | Employer withdraws from escrow |
| `authorize_agent(agent_id)` | Call | agent_id (AccountId) | Authorize server agent for payments |
| `revoke_agent(agent_id)` | Call | agent_id (AccountId) | Revoke agent authorization |
| `set_profile_view_cost(cost)` | Call (owner-only) | cost (U128) | Set profile view price |
| `get_balance(employer_id)` | View | employer_id (AccountId) | Query employer escrow balance |
| `get_seeker_earnings(seeker_id)` | View | seeker_id (AccountId) | Query seeker view count + earnings |
| `get_access_history(employer_id)` | View | employer_id (AccountId) | Get profile access records |
| `get_access_history_paginated(employer_id, from, limit)` | View | employer_id, from, limit | Paginated access history |
| `get_profile_view_cost()` | View | - | Get current profile view cost |

#### Contract Constants

```
DEFAULT_PROFILE_VIEW_COST = 0.1 NEAR (100,000,000,000,000,000,000,000 yoctoNEAR)
SEEKER_SHARE_PERCENT      = 80%
PLATFORM_SHARE_PERCENT    = 20%
MAX_RECORDS_PER_EMPLOYER  = 1,000
```

#### Revenue Split Flow
```
Employer pays 0.1 NEAR
    |
    +-- 80% (0.08 NEAR) --> Seeker (resume owner)
    +-- 20% (0.02 NEAR) --> Platform (contract owner)
```

#### Contract Data Structures
```rust
struct EscrowAccount {
    balance: u128,
    authorized_agents: Vec<AccountId>,
    access_records: Vec<ProfileAccessRecord>,
}

struct ProfileAccessRecord {
    employer_id: AccountId,
    seeker_id: AccountId,
    amount: u128,
    timestamp: u64,
}

struct SeekerEarnings {
    view_count: u32,
    total_earned: u128,
}
```

---

### 3.2 Frontend NEAR Functions

**File:** `frontend/src/lib/near.ts`

| Function | NEAR API Used | Purpose |
|----------|--------------|---------|
| `getProvider()` | `JsonRpcProvider` | Create RPC connection to testnet |
| `getSignerAccount()` | `Account`, `KeyPairSigner.fromSecretKey()` | Create signing account |
| `depositViaWallet()` | `account.callFunction('deposit')` | Deposit NEAR to escrow |
| `addAgentKey()` | `account.addFunctionCallAccessKey()` | Register server agent key |
| `getEscrowBalanceOnChain()` | `provider.callFunction('get_balance')` | Query on-chain balance |
| `getSeekerEarningsOnChain()` | `provider.callFunction('get_seeker_earnings')` | Query seeker earnings |
| `hasAgentKeyOnChain()` | RPC `view_access_key_list` | Verify agent key exists |

**File:** `frontend/src/lib/wallet-selector.tsx`

| Wallet | Module |
|--------|--------|
| MyNearWallet | `setupMyNearWallet()` |
| Meteor Wallet | `setupMeteorWallet()` |
| Here Wallet | `setupHereWallet()` |
| Ethereum (MetaMask) | wagmi + NEAR EVM bridge |

**Escrow Page Actions:** `frontend/src/app/escrow/page.tsx`
```
Deposit:
  wallet.signAndSendTransaction({
    receiverId: ESCROW_CONTRACT_ID,
    actions: [functionCall('deposit', {}, 30TGAS, yoctoAmount)]
  })

Agent Key Registration:
  wallet.signAndSendTransaction({
    receiverId: user.nearAccountId,
    actions: [addKey(agentPublicKey, functionCallAccessKey(contractId, ['pay_for_profile'], 5_NEAR))]
  })
```

---

### 3.3 Backend NEAR Functions

**File:** `backend/src/escrow/real-escrow-payment.ts`

| Method | NEAR Operation | Purpose |
|--------|---------------|---------|
| `getAgentPublicKey()` | Key derivation (SHA256 seed) | Return server agent public key |
| `checkBalance()` | `provider.callFunction('get_balance')` | Check employer escrow balance |
| `payForProfile()` | `account.callFunction('pay_for_profile')` | Deduct 0.1 NEAR for resume access |

**Agent Key System:**
```
SERVER_KEYPAIR_SEED (env)
    |-- SHA256 hash --> 32-byte seed
    |-- nacl.sign.keyPair.fromSeed(seed) --> Ed25519 keypair
    |-- Encode as ed25519:<bs58-encoded-key>
    v
Server agent uses FunctionCall Access Key
    |-- Registered on employer's NEAR account
    |-- Allowed method: pay_for_profile only
    |-- Allowance: 5 NEAR
```

---

### 3.4 near-api-js v7 Usage Patterns

```typescript
// ESM-only dynamic import (required for CJS backend)
const nearApi = await import('near-api-js');

// Account creation
const signer = KeyPairSigner.fromSecretKey(privateKey);
const provider = new JsonRpcProvider({ url: rpcUrl });
const account = new Account(accountId, provider, signer);

// View call (no signing required)
const result = await provider.callFunction(contractId, 'get_balance', { employer_id });

// State-changing call
await account.callFunction({
  contractId,
  methodName: 'pay_for_profile',
  args: { employer_id, seeker_id },
  gas: 30_000_000_000_000n,
  deposit: 0n,
});

// FunctionCall Access Key
await account.addFunctionCallAccessKey(agentPublicKey, contractId, ['pay_for_profile'], allowance);
```

---

## 4. Complete Data Flow

```
                          NEAR Protocol Layer
                    +---------------------------+
                    |  Escrow Contract           |
                    |  (escrow.sooondae17.testnet)|
                    |                           |
                    |  deposit() <-- Employer   |
                    |  pay_for_profile() <-- Agent|
                    |  80% --> Seeker            |
                    |  20% --> Platform          |
                    +---------------------------+
                              ^
                              | (on-chain tx)
                              |
+----------------+    +-------+--------+    +------------------+
|   Frontend     |    |    Backend     |    |   NEAR AI Cloud  |
|   (Next.js)    |    |   (NestJS)    |    |                  |
|                |    |               |    | Qwen 3.5-122B    |
| Wallet Connect +--->+ Escrow Svc    |    | (chat/embed/     |
| Deposit NEAR   |    | Profile Svc   |    |  rerank)         |
| Agent Key Reg  |    | Resume Svc    +--->+                  |
| Decrypt Rounds |    | Match Svc     |    +------------------+
|                |<---+ Negotiation   |
| View Results   |    | Svc           |
+----------------+    +---------------+
                              |
                    +---------+---------+
                    |   PostgreSQL      |
                    |   + pgvector      |
                    |                   |
                    | Users, Jobs,      |
                    | Resumes, Matches, |
                    | Sessions, Rounds  |
                    | (encrypted),      |
                    | Embeddings        |
                    +-------------------+
```

---

## 5. Security Architecture

| Layer | Technology | Protection |
|-------|-----------|-----------|
| Identity | NEAR Ed25519 keys | User authentication & key ownership |
| Key Exchange | X25519 ECDH | Secure session key derivation |
| Key Derivation | HKDF-SHA256 | Deterministic session keys from ECDH |
| Data Encryption | XChaCha20-Poly1305 | Authenticated encryption of negotiation data |
| On-chain Auth | FunctionCall Access Key | Limited agent permissions (pay_for_profile only) |
| Escrow | Smart Contract | Trustless payment with automated revenue split |
| AI Privacy | Server-side only inference | No user data sent to frontend AI |

---

## 6. Deployment

| Component | Platform | URL |
|-----------|---------|-----|
| Frontend | Vercel | `https://talenttee-sepia.vercel.app` |
| Backend | Railway | `https://talenttee-api-production.up.railway.app` |
| Database | Railway PostgreSQL | `postgres.railway.internal` |
| Smart Contract | NEAR Testnet | `escrow.sooondae17.testnet` |
| AI API | NEAR AI Cloud | `https://cloud-api.near.ai/v1` |

---

## 7. Appendix: Key File Index

| Category | File | Description |
|----------|------|-------------|
| AI Client | `backend/src/agent/near-ai.client.ts` | NEAR AI Cloud API wrapper |
| AI Module | `backend/src/agent/agent.module.ts` | Global DI for AI client |
| Negotiation | `backend/src/negotiation/negotiation.service.ts` | AI negotiation orchestrator |
| State Machine | `backend/src/negotiation/negotiation-engine.ts` | Negotiation state transitions |
| Employer Prompt | `backend/src/negotiation/prompts/employer-agent.prompt.ts` | Employer AI system prompt |
| Seeker Prompt | `backend/src/negotiation/prompts/seeker-agent.prompt.ts` | Seeker AI system prompt |
| Resume Prompt | `backend/src/resume/prompts/resume-generate.en.prompt.ts` | Resume extraction prompt |
| Market Value | `backend/src/resume/prompts/market-value.prompt.ts` | Salary estimation prompt |
| Profile Report | `backend/src/profile/prompts/detail-report.en.prompt.ts` | Recruiter report prompt |
| Matching | `backend/src/match/match.service.ts` | ANN + AI rerank |
| Smart Contract | `contract/escrow/src/lib.rs` | NEAR escrow contract (Rust) |
| Frontend NEAR | `frontend/src/lib/near.ts` | NEAR account & tx functions |
| Wallet | `frontend/src/lib/wallet-selector.tsx` | Multi-wallet integration |
| Crypto (BE) | `backend/src/crypto/crypto.service.ts` | Server-side ECDH + encryption |
| Crypto (FE) | `frontend/src/lib/crypto.ts` | Client-side decryption |
| Escrow Page | `frontend/src/app/escrow/page.tsx` | Deposit & agent key UI |
| Escrow Payment | `backend/src/escrow/real-escrow-payment.ts` | Agent-based on-chain payments |
| Seed Script | `backend/src/seed.ts` | Test data + real negotiation trigger |
