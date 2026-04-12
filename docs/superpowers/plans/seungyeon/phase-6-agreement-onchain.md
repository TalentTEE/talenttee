# Phase 6: 합의 → 온체인 기록 (Agreement Contract)

> 스펙 참조: seungyeon-negotiation.md §3-6
> PRD 참조: FR-011
> 검증 결과: **PASS**

---

## 구현 파일

| 파일 | 경로 |
|------|------|
| AgreementService | `backend/src/agreement/agreement.service.ts` |
| AgreementController | `backend/src/agreement/agreement.controller.ts` |
| AgreementModule | `backend/src/agreement/agreement.module.ts` |
| Agreement Contract (Rust) | `contract/agreement/src/lib.rs` |

---

## 합의 승인 플로우 검증

### 스펙 플로우

```
양측 에이전트 accept → 세션 상태 AGREED
→ POST /approve (양측 각각)
→ 양측 모두 승인 확인
→ SHA-256 해시 생성
→ record_agreement() txParams 반환
→ 클라이언트가 NEAR 지갑으로 트랜잭션 실행
→ POST /confirm-tx (txHash 기록)
```

### 구현 확인

| 단계 | 구현 | 라인 | 상태 |
|------|------|------|------|
| 양측 승인 추적 | `seekerApproved`, `employerApproved` 컬럼 | Entity | **PASS** |
| 역할별 승인 설정 | nearAccountId로 seeker/employer 식별 | L33-38 | **PASS** |
| 한쪽만 승인 시 대기 | `waiting_for_other_party` 반환 | L41-43 | **PASS** |
| 양측 승인 시 해시 생성 | `computeAgreementHash()` 호출 | L45 | **PASS** |
| txParams 반환 | `getRecordAgreementTxParams()` 호출 | L48-50 | **PASS** |
| TX 확인 | `confirmTx(sessionId, txHash)` | L96-102 | **PASS** |

### 비관적 락 (Pessimistic Lock)

```typescript
// L22-27: 트랜잭션 + 비관적 쓰기 락
this.sessionRepo.manager.transaction(async (manager) => {
  const session = await manager.findOne(NegotiationSession, {
    where: { id: sessionId },
    lock: { mode: 'pessimistic_write' },  // ← TOCTOU 방지
  });
  // ...
});
```

이렇게 하면 두 사용자가 동시에 approve()를 호출해도 레이스 컨디션이 발생하지 않는다.

---

## SHA-256 해시 생성 검증

```typescript
// computeAgreementHash() — L60-71
const data = {
  employerId: session.employerId,    // 알파벳순 정렬
  finalRound: session.currentRound,
  jobId: session.jobId,
  seekerId: session.seekerId,
  sessionId: session.id,
};
const canonical = JSON.stringify(data);  // 결정적 JSON
return createHash('sha256').update(canonical).digest('hex');
```

- **키 알파벳순 정렬**: ✅ — employerId < finalRound < jobId < seekerId < sessionId
- **결정적 해시**: ✅ — 같은 입력이면 항상 같은 해시

---

## txParams 구조 검증

```typescript
// getRecordAgreementTxParams() — L73-94
{
  contractId: 'agreement.testnet',
  methodName: 'record_agreement',
  args: {
    session_id: session.id,
    agreement_hash: agreementHash,
    summary: {
      position_title: session.job?.title,
      agreed_salary: '...',
      start_date: '...',
      negotiation_rounds: session.currentRound,
    },
    seeker_account: session.seeker?.nearAccountId,
    employer_account: session.employer?.nearAccountId,
    seeker_signature: '...',
    employer_signature: '...',
  },
  deposit: '0',
  gas: '30000000000000',  // 30 TGas
}
```

---

## 스마트 컨트랙트 검증

### Agreement Contract (`contract/agreement/src/lib.rs`)

| 메서드 | 서비스 호출 | 컨트랙트 구현 | 상태 |
|--------|------------|--------------|------|
| `record_agreement()` | txParams로 클라이언트에서 호출 | L41-68: IterableMap에 저장, 중복 방지 | **PASS** |
| `get_agreement()` | `getAgreement()` RPC 호출 | L70-72: Option<&AgreementRecord> 반환 | **PASS** |
| `verify_agreement()` | `verifyAgreement()` RPC 호출 | L74-76: bool 반환 | **PASS** |

### 컨트랙트 데이터 구조

```rust
AgreementRecord {
  session_id: String,
  agreement_hash: String,
  summary: AgreementSummary,
  seeker_account: AccountId,
  employer_account: AccountId,
  seeker_signature: Vec<u8>,
  employer_signature: Vec<u8>,
  created_at: u64,  // env::block_timestamp()
}
```

### 컨트랙트 테스트

| 테스트 | 검증 내용 | 상태 |
|--------|-----------|------|
| record_and_get | 기록 후 조회 | **PASS** |
| verify_agreement | 존재 확인 | **PASS** |
| duplicate_panics | 중복 기록 시 panic | **PASS** |
| get_nonexistent | 없는 세션 → None | **PASS** |

---

## NEAR RPC 호출 검증

### getAgreement (L104-128)

```
POST https://rpc.testnet.near.org
{
  jsonrpc: "2.0",
  method: "query",
  params: {
    request_type: "call_function",
    finality: "final",
    account_id: "agreement.testnet",
    method_name: "get_agreement",
    args_base64: Base64({ session_id })
  }
}
→ 응답 파싱 → AgreementRecord 또는 null
```

### verifyAgreement (L130-154)

동일한 RPC 패턴, `method_name: "verify_agreement"` → boolean 반환

---

## 결론

Phase 6는 합의→온체인 기록 전체 플로우를 구현했다. 비관적 락으로 동시성 안전하고, SHA-256 해시가 결정적이며, 스마트 컨트랙트와 백엔드 서비스 간 인터페이스가 일치한다. 컨트랙트 테스트 4개도 통과.
