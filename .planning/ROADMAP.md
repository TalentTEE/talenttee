# Roadmap: NEAR AI Career Agent Platform

## Overview

A 4-phase build that starts with the foundation every other module depends on (auth, DB, agent client), then builds the resume ingestion and AI processing pipeline that produces embeddable career data, then adds job matching using two-stage semantic retrieval, and finally closes the economic loop with autonomous two-sided negotiation and token-gated payment. Each phase delivers a complete, demo-able capability and unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Infrastructure, auth, and TEE agent client — everything else builds on this
- [ ] **Phase 2: Resume Pipeline** - AI resume generation, embeddings, and OAuth data ingestion
- [ ] **Phase 3: Job Matching** - Employer job CRUD, semantic matching, and reranking
- [ ] **Phase 4: Negotiation and Payment** - Two-sided AI negotiation agent and token-gated resume access
- [ ] **Phase 5: 통합 조사 및 통합 테스트 작성** - 각자 구현 내용 통합 조사 및 통합 테스트 작성

## Phase Details

### Phase 1: Foundation
**Goal**: The backend is running with a working database, authenticated users, and a proven NEAR AI Cloud TEE agent call — all downstream modules can build against published contracts without TEE dependency.
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, AUTH-01, AUTH-02, AUTH-03, AGENT-01, AGENT-06
**Success Criteria** (what must be TRUE):
  1. A job seeker can authenticate with their NEAR wallet and receive a JWT that gates protected routes
  2. A recruiter can authenticate with their NEAR wallet and receive a JWT with employer role
  3. A hello-world agent call succeeds against NEAR AI Cloud TEE and returns a parsed response (AGENT_MODE=tee)
  4. MockAgentService returns fixture data when AGENT_MODE=mock, enabling offline development for all other phases
  5. All database entities and migrations are applied; pgvector extension is enabled and a sample vector insert/query succeeds
**Plans**: TBD

### Phase 2: Resume Pipeline
**Goal**: A job seeker can upload a resume (PDF or OAuth-sourced data), have it processed by the AI agent into a structured profile, embedded as a vector, and stored — ready for matching.
**Depends on**: Phase 1
**Requirements**: AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-07, AGENT-08, RESUME-01, RESUME-02, RESUME-03, RESUME-04, OAUTH-01, OAUTH-02, OAUTH-03
**Success Criteria** (what must be TRUE):
  1. A job seeker can upload a PDF resume and see extracted text returned (Korean text validated — minimum 100 chars, Korean character presence check)
  2. An AI-generated structured resume profile is saved to the database after upload, reflecting the agent's analysis
  3. The AI surfaces at least one resume improvement suggestion the seeker can view
  4. A job seeker can connect their GitHub account via OAuth and see their career data incorporated into their profile
  5. A seeker's resume is stored as a pgvector embedding and can be queried by cosine similarity
**Plans**: TBD

### Phase 3: Job Matching
**Goal**: A recruiter can post a job with salary and benefits, and the system returns a ranked list of matching candidates using semantic vector search and Qwen3-Reranker precision reranking.
**Depends on**: Phase 2
**Requirements**: MATCH-01, MATCH-02, MATCH-03, MATCH-04, MATCH-05
**Success Criteria** (what must be TRUE):
  1. A recruiter can create, edit, and delete a job posting with salary table and benefits fields
  2. A newly created job posting is embedded asynchronously (via BullMQ) and appears in similarity search results
  3. Querying matches for a job returns a ranked candidate list ordered by semantic similarity (ANN top-20 then reranked top-5)
  4. A recruiter can view the top-5 matched candidates for any active job posting
**Plans**: TBD

### Phase 4: Negotiation and Payment
**Goal**: A matched candidate's AI agent and the recruiter's AI agent can conduct multi-round salary and conditions negotiation, with every round persisted; a recruiter can pay NEAR tokens to unlock full resume access.
**Depends on**: Phase 3
**Requirements**: NEGO-01, NEGO-02, NEGO-03, NEGO-04, PAY-01, PAY-02
**Success Criteria** (what must be TRUE):
  1. A negotiation session can be initiated for a matched job-candidate pair and at least one round completes with structured JSON output from both sides
  2. Negotiation automatically terminates at MAX_ROUNDS and reaches a terminal state (AGREED / FAILED / MAX_ROUNDS) — no infinite loops
  3. Full negotiation history (all rounds, all offers) is retrievable by both parties
  4. A recruiter can submit a NEAR token payment transaction and have resume access granted using the tx hash as idempotency key
  5. A resume endpoint rejects access without a valid payment grant and returns an access-denied response
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Resume Pipeline | 0/TBD | Not started | - |
| 3. Job Matching | 0/TBD | Not started | - |
| 4. Negotiation and Payment | 0/TBD | Not started | - |
| 5. 통합 조사 및 통합 테스트 작성 | 1/3 | In Progress|  |

### Phase 5: 통합 조사 및 통합 테스트 작성

**Goal:** 현재 각자 구현한 내용과 범위를 조사하고, 통합에 필요한 사항을 파악하여 통합 테스트를 작성한다.
**Requirements**: INT-01, INT-02, INT-03, INT-04, INT-05
**Depends on:** Phase 4
**Plans:** 1/3 plans executed

Plans:
- [ ] 05-01-PLAN.md — Integration gap analysis + shared test infrastructure
- [ ] 05-02-PLAN.md — Auth flow + Job-Resume-Match pipeline integration tests
- [ ] 05-03-PLAN.md — Negotiation-Agreement + Profile access integration tests

### Phase 6: Fix smart contract security vulnerabilities from audit

**Goal:** Fix all security vulnerabilities (P0-P3) identified in the smart contract audit for contract/escrow and contract/agreement, add missing functionality (withdraw, signature verification), and achieve comprehensive test coverage for all identified gaps.
**Requirements**: P0-ESCROW, P0-AGREEMENT, P1-ESCROW, P1-AGREEMENT, P2-ESCROW-STORAGE, P2-ESCROW-DYNAMIC-COST, P3-AGREEMENT
**Depends on:** Phase 5
**Plans:** 3 plans

Plans:
- [ ] 06-01-PLAN.md — Escrow P0 access control + P1 withdraw functionality
- [ ] 06-02-PLAN.md — Agreement P0 access control + P1 signature verification + P3 hash integrity
- [ ] 06-03-PLAN.md — Escrow P2 dynamic cost + bounded storage management
