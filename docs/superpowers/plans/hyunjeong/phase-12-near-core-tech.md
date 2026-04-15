# Phase 12 — NEAR 핵심 기술 추가 구현

**목적:** NEAR 프로토콜의 5대 핵심 기술을 TalentTEE에 단계별 적용
**우선순위:** 적용 가능성 높은 순 (현재 코드베이스와의 갭 기준)

---

## 현황 요약

| # | 기술 | 현재 상태 | 이 Phase에서 |
|---|------|-----------|-------------|
| 5 | 보안 에이전트 프레임워크 | 부분 구현 (프레임워크만, 보안 취약) | **Step 1** |
| 4 | TEE (신뢰 실행 환경) | 부분 구현 (소프트웨어 암호화만) | **Step 2** |
| 3 | NEAR Intents | 미구현 | **Step 3** |
| 2 | 체인 추상화 | 미구현 | **Step 4** |
| 1 | 프로토콜 확장성 | 미구현 (NEAR 자체 제공) | **Step 5** |

---

## Step 1: 보안 에이전트 프레임워크 강화

> **적용 가능성: 높음** — 현재 코드에서 바로 개선 가능

### 1-1. 프롬프트 인젝션 방어

**문제:** 사용자 intervention이 검증 없이 프롬프트에 직접 삽입됨
- `negotiation.service.ts` — `this.interventions.set(key, direction)` 무검증 저장
- 프롬프트: "사용자의 추가 지시가 있으면 최우선으로 반영하세요" → 인젝션 유도

**구현:**
```
backend/src/negotiation/
├── guards/
│   └── intervention-sanitizer.ts    ← 새로 생성
├── validators/
│   └── agent-response.validator.ts  ← 새로 생성
```

- [ ] `intervention-sanitizer.ts` — 사용자 입력에서 위험 패턴 필터링
  - JSON 탈출 시도 차단 (`}`, `"reasoning":` 등)
  - 시스템 프롬프트 오버라이드 패턴 차단 ("ignore previous", "you are now" 등)
  - 최대 길이 제한 (500자)
  - 허용된 지시 유형만 통과 (연봉 범위, 원격근무 선호 등)

- [ ] `agent-response.validator.ts` — AI 응답 스키마 검증
  - Zod 스키마로 `AgentResponse` 구조 검증
  - `proposal.salary`가 boundary 범위 내인지 서버 측 재검증
  - `decision` 값이 유효한 enum인지 확인
  - 검증 실패 시 재시도 (최대 2회) 후 REJECT 처리

- [ ] 프롬프트 구조 개선
  - "사용자 지시 최우선" → "사용자 지시를 boundary 범위 내에서 반영"으로 변경
  - 시스템 프롬프트와 사용자 입력 사이 명확한 구분자 삽입

### 1-2. 온체인 에이전트 권한 강화

**문제:** `addFunctionCallAccessKey`로 추가된 키가 범위 제한 없이 사용됨

- [ ] FunctionCall Access Key에 `methodNames` 제한 추가
  - Employer 키: `['deposit', 'pay_for_profile']`만 허용
  - Seeker 키: `['get_balance']` 등 읽기만 허용
- [ ] 에이전트 호출 시 서버 측 nonce 검증 추가
- [ ] 트랜잭션 로그 기록 (어떤 에이전트가 어떤 메서드를 호출했는지)

### 수정 파일
- `backend/src/negotiation/negotiation.service.ts` — sanitizer 적용
- `backend/src/negotiation/prompts/*.prompt.ts` — 프롬프트 구조 개선
- `frontend/src/lib/near.ts` — `addAgentKey()` methodNames 제한
- 신규: `intervention-sanitizer.ts`, `agent-response.validator.ts`

---

## Step 2: TEE 하드웨어 보안 강화

> **적용 가능성: 높음** — NEAR AI의 confidential computing 환경 활용

### 2-1. NEAR AI Confidential Inference 연동

**현재:** 서버에서 평문으로 AI 추론 → 결과 암호화 저장
**목표:** TEE 내부에서 AI 추론 → 서버도 협상 내용을 볼 수 없음

- [ ] NEAR AI의 TEE 기반 추론 API 조사 및 연동
  - `near-ai.client.ts`에서 confidential inference 엔드포인트 사용
  - TEE attestation 응답 검증 로직 추가

- [ ] Attestation 검증 파이프라인
  ```
  backend/src/crypto/
  ├── crypto.service.ts          ← 기존
  ├── attestation.service.ts     ← 새로 생성
  └── attestation.types.ts       ← 새로 생성
  ```
  - TEE attestation report 파싱
  - Intel SGX / NVIDIA GPU attestation 서명 검증
  - 검증 결과를 협상 라운드 메타데이터에 저장

### 2-2. 프론트엔드 Attestation 표시

- [ ] 협상 모니터 페이지에 TEE 인증 배지 표시
  - "Verified by TEE" 아이콘 + attestation hash
  - 클릭 시 attestation 상세 정보 모달
- [ ] Agreement 페이지에 TEE 인증 상태 포함

### 수정 파일
- `backend/src/agent/near-ai.client.ts` — confidential inference 호출
- `backend/src/negotiation/negotiation.service.ts` — attestation 저장
- `frontend/src/app/negotiation/[sessionId]/page.tsx` — TEE 배지 UI
- 신규: `attestation.service.ts`, `attestation.types.ts`

---

## Step 3: NEAR Intents 도입

> **적용 가능성: 중간** — 에스크로 결제 흐름에 적용 가능

### 3-1. Intent 기반 결제

**현재:** Employer가 직접 `deposit()` 트랜잭션 서명
**목표:** "이 후보자에게 결제하겠다"는 Intent 전송 → solver가 최적 경로로 실행

- [ ] NEAR Intents SDK 조사 및 의존성 추가
- [ ] `pay_for_profile` 흐름을 Intent 기반으로 전환
  ```
  기존: Employer → deposit() → pay_for_profile() (2단계 직접 호출)
  변경: Employer → Intent("pay seeker X for profile access") → Solver가 자동 실행
  ```

### 3-2. Intent 기반 협상 자동화

- [ ] 협상 합의 후 자동 실행 Intent
  - 합의 도달 → "합의 내용을 온체인에 기록하고 에스크로에서 결제" Intent 생성
  - Solver가 agreement 기록 + escrow 결제를 원자적으로 처리
- [ ] Intent 상태 추적 UI
  - 프론트엔드에서 Intent 진행 상태 표시 (pending → solving → executed)

### 수정 파일
- `frontend/src/lib/near.ts` — Intent 생성/전송 함수
- `backend/src/negotiation/negotiation.service.ts` — 합의 후 Intent 트리거
- `frontend/src/app/escrow/page.tsx` — Intent 기반 결제 UI
- 신규: `frontend/src/lib/intents.ts`

---

## Step 4: 체인 추상화

> **적용 가능성: 낮음~중간** — 멀티체인 사용자 유입 시 의미

### 4-1. 멀티체인 지갑 지원

**현재:** NEAR 지갑만 지원 (Wallet Selector에 EVM RPC는 NEAR 전용)
**목표:** ETH/Polygon 등 다른 체인 자산으로도 에스크로 입금 가능

- [ ] NEAR Chain Signatures 연동 조사
  - 다른 체인의 서명을 NEAR에서 검증하는 메커니즘
- [ ] 크로스체인 에스크로 입금
  - Ethereum USDC → NEAR Intents → Escrow deposit 변환
  - 프론트엔드에서 "Pay with ETH" / "Pay with NEAR" 선택 UI

### 4-2. 통합 계정 추상화

- [ ] 이메일/소셜 로그인으로 NEAR 계정 자동 생성
  - NEAR의 FastAuth 또는 Account Abstraction 활용
  - 블록체인을 모르는 사용자도 가입 가능
- [ ] 기존 NEP-413 인증과의 호환

### 수정 파일
- `frontend/src/lib/wallet-selector.tsx` — 멀티체인 지갑 추가
- `frontend/src/app/escrow/page.tsx` — 체인 선택 UI
- `backend/src/auth/` — FastAuth 연동
- 신규: `frontend/src/lib/chain-abstraction.ts`

---

## Step 5: 프로토콜 확장성

> **적용 가능성: 낮음** — NEAR 프로토콜 레벨에서 자동 제공

### 5-1. 인프라 레벨 최적화

NEAR의 Nightshade 샤딩은 프로토콜 레벨에서 자동 적용되므로
애플리케이션 코드 변경은 최소화됨.

- [ ] 트랜잭션 배치 처리
  - 여러 `pay_for_profile` 호출을 단일 배치 트랜잭션으로 묶기
  - `near-api-js`의 batch transaction API 활용
- [ ] 인덱서 연동
  - NEAR Lake Indexer로 온체인 이벤트 실시간 수신
  - 협상 합의/에스크로 결제 이벤트를 백엔드에서 자동 감지
  - 현재의 폴링 방식 → 이벤트 드리븐으로 전환

### 5-2. 모니터링

- [ ] NEAR Explorer 링크 연동
  - 트랜잭션 해시 클릭 시 Explorer로 이동
  - 에스크로 잔액 실시간 조회 (RPC 직접 호출 → 캐시)
- [ ] 성능 메트릭 대시보드 (선택사항)

### 수정 파일
- `frontend/src/lib/near.ts` — batch transaction 지원
- `backend/src/` — NEAR Lake Indexer 연동 모듈
- `frontend/src/app/escrow/page.tsx` — Explorer 링크

---

## 의존 관계

```
Step 1 (보안 에이전트) ──→ Step 2 (TEE)
   │                          │
   │  (Step 1 완료 후         │  (TEE attestation이
   │   에이전트 보안 기반      │   있어야 Intents에서
   │   확보)                  │   신뢰 가능)
   │                          │
   └──────────┬───────────────┘
              ↓
         Step 3 (Intents) ──→ Step 4 (체인 추상화)
              │                    │
              │  (Intent 인프라가   │
              │   있어야 크로스체인  │
              │   결제 가능)        │
              │                    │
              └────────┬───────────┘
                       ↓
                  Step 5 (확장성)
```

## 예상 일정

| Step | 예상 소요 | 난이도 | 비고 |
|------|-----------|--------|------|
| Step 1 | 1~2일 | 중 | 현재 코드에서 바로 가능 |
| Step 2 | 2~3일 | 상 | NEAR AI TEE API 문서 확인 필요 |
| Step 3 | 2~3일 | 상 | NEAR Intents SDK 학습 필요 |
| Step 4 | 3~5일 | 상 | Chain Signatures + FastAuth 연동 |
| Step 5 | 1~2일 | 하 | 대부분 프로토콜 자동 제공 |
