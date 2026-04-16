# Smart Contract Audit Report

**Project:** TalentTEE (near-agent)
**Date:** 2026-04-16
**Scope:** `contract/escrow`, `contract/agreement`
**NEAR SDK:** v5.6.0 / Rust Edition 2021

---

## 1. Escrow Contract (`contract/escrow/src/lib.rs`)

### 1.1 개요

Employer가 NEAR를 예치(deposit)하고, 구직자(seeker) 프로필 열람 시 자동 결제하는 에스크로 컨트랙트.

### 1.2 데이터 구조

| 구조체 | 필드 | 설명 |
|--------|------|------|
| `EscrowAccount` | `employer_id`, `balance` | Employer별 예치 잔액 |
| `ProfileAccessRecord` | `employer_id`, `seeker_id`, `amount`, `timestamp` | 프로필 열람 결제 기록 |
| `EscrowContract` | `accounts`, `access_records` | 상태 저장소 (IterableMap) |

### 1.3 메서드 분석

#### `deposit()` — 예치
| 항목 | 내용 |
|------|------|
| 접근제어 | `#[payable]`, `predecessor_account_id()` 기반 — 본인만 자기 계정에 예치 |
| 로직 | 기존 잔액에 `attached_deposit` 누적 |
| 검증 | `deposit > 0` assert |
| 평가 | **정상** |

#### `pay_for_profile(employer_id, seeker_id)` — 프로필 열람 결제
| 항목 | 내용 |
|------|------|
| 접근제어 | **없음** — 누구나 호출 가능 |
| 로직 | employer 잔액에서 0.1 NEAR 차감 → seeker에게 전송 |
| 검증 | 잔액 >= 0.1 NEAR assert만 존재 |
| 평가 | **심각한 취약점** (아래 상세) |

#### `get_balance(employer_id)` — 잔액 조회
| 항목 | 내용 |
|------|------|
| 접근제어 | 없음 (공개 조회) |
| 로직 | 계정 없으면 0 반환 |
| 평가 | **정상** — view 메서드로 적절 |

#### `get_access_history(employer_id)` — 결제 내역 조회
| 항목 | 내용 |
|------|------|
| 접근제어 | 없음 (공개 조회) |
| 로직 | employer별 기록 Vec 반환 |
| 평가 | **정상** — 단, 대량 데이터 시 가스 초과 가능 |

### 1.4 시나리오 분석

#### 정상 시나리오

| # | 시나리오 | 흐름 |
|---|----------|------|
| S1 | 최초 예치 | Employer가 1 NEAR deposit → 계정 생성, 잔액 1 NEAR |
| S2 | 추가 예치 | 기존 Employer가 0.5 NEAR deposit → 잔액 누적 1.5 NEAR |
| S3 | 프로필 결제 | Agent가 pay_for_profile 호출 → 0.1 NEAR 차감, seeker에게 전송 |
| S4 | 잔액 조회 | 아무나 get_balance 호출 → 잔액 반환 |
| S5 | 내역 조회 | 아무나 get_access_history 호출 → 결제 기록 목록 반환 |

#### 엣지 케이스

| # | 시나리오 | 현재 동작 | 기대 동작 |
|---|----------|-----------|-----------|
| E1 | 0 NEAR 예치 시도 | panic (assert) | **정상** |
| E2 | 잔액 부족 상태에서 결제 | panic (assert) | **정상** |
| E3 | 존재하지 않는 employer 잔액 조회 | 0 반환 | **정상** |
| E4 | 존재하지 않는 employer 결제 시도 | panic ("no escrow account") | **정상** |
| E5 | 같은 seeker에게 중복 결제 | 허용됨 (Vec에 추가) | **검토 필요** — 의도적이라면 OK |
| E6 | 제3자가 남의 employer_id로 결제 | **허용됨** | **차단 필요** |

### 1.5 보안 취약점

#### [CRITICAL] pay_for_profile 접근제어 부재

```rust
// 현재 코드 — 누구나 호출 가능
pub fn pay_for_profile(&mut self, employer_id: AccountId, seeker_id: AccountId) {
    let mut account = self.accounts.get(&employer_id)
        .cloned()
        .expect("Employer has no escrow account");
    // ... 차감 및 전송
}
```

**공격 시나리오:**
1. 악의적 사용자가 `pay_for_profile("victim.testnet", "attacker.testnet")` 호출
2. victim의 잔액에서 0.1 NEAR 차감
3. attacker에게 0.1 NEAR 전송
4. 반복하면 victim의 전체 잔액 탈취 가능

**권장 수정:**
```rust
pub fn pay_for_profile(&mut self, employer_id: AccountId, seeker_id: AccountId) {
    let caller = env::predecessor_account_id();
    assert!(
        caller == employer_id || self.is_authorized_agent(&employer_id, &caller),
        "Unauthorized: only employer or authorized agent can pay"
    );
    // ... 기존 로직
}
```

#### [HIGH] 출금(withdraw) 기능 없음

예치된 NEAR를 회수할 방법이 없음. Employer가 서비스를 그만두고 싶어도 자금이 컨트랙트에 영구 잠김.

#### [MEDIUM] 스토리지 비용 미관리

`access_records`가 Vec으로 무한 증가. 스토리지 비용이 컨트랙트 계정에 누적되어 결국 잔액 부족으로 동작 불가 가능.

#### [LOW] 결제 금액 고정

`PROFILE_VIEW_COST`가 0.1 NEAR로 하드코딩. NEAR 가격 변동 시 조정 불가. owner가 업데이트할 수 있는 설정 메서드 권장.

### 1.6 테스트 커버리지 분석

| 테스트 | 커버 시나리오 | 평가 |
|--------|---------------|------|
| `test_deposit` | S1 — 최초 1 NEAR 예치 | OK |
| `test_multiple_deposits` | S2 — 1 NEAR + 0.5 NEAR 누적 | OK |
| `test_pay_for_profile` | S3 — 결제 후 잔액 차감 + 기록 생성 | OK |
| `test_pay_insufficient_balance` | E2 — 잔액 부족 시 panic | OK |
| `test_get_balance_nonexistent` | E3 — 미등록 계정 조회 | OK |
| `test_get_empty_access_history` | E5 — 미등록 계정 기록 조회 | OK |

#### 누락된 테스트

| # | 누락 시나리오 | 중요도 |
|---|---------------|--------|
| T1 | 제3자가 pay_for_profile 호출 시 차단 여부 | **Critical** (현재 차단 안됨) |
| T2 | 0 NEAR deposit 시도 | Medium |
| T3 | 동일 seeker에 대한 중복 결제 | Low |
| T4 | 매우 큰 금액 (u128 오버플로우 경계) 예치 | Low |
| T5 | deposit 후 잔액 정확히 0.1 NEAR일 때 결제 (경계값) | Medium |
| T6 | 다수 employer가 동시에 deposit/pay | Medium |
| T7 | seeker_id가 유효하지 않은 계정일 때 전송 | Medium |

---

## 2. Agreement Contract (`contract/agreement/src/lib.rs`)

### 2.1 개요

협상 완료 후 합의 내용(연봉, 시작일, 직책 등)을 온체인에 기록하고 검증하는 컨트랙트.

### 2.2 데이터 구조

| 구조체 | 필드 | 설명 |
|--------|------|------|
| `AgreementSummary` | `position_title`, `agreed_salary`, `start_date`, `negotiation_rounds` | 합의 요약 |
| `AgreementRecord` | `session_id`, `agreement_hash`, `summary`, `seeker/employer_account`, `seeker/employer_signature`, `created_at` | 전체 합의 기록 |
| `AgreementContract` | `agreements` (IterableMap) | session_id → AgreementRecord |

### 2.3 메서드 분석

#### `record_agreement(...)` — 합의 기록
| 항목 | 내용 |
|------|------|
| 접근제어 | **없음** — 누구나 호출 가능 |
| 로직 | session_id 중복 체크 → 기록 저장 |
| 검증 | 중복 session_id만 체크 |
| 평가 | **취약** — 접근제어 + 서명 검증 없음 |

#### `get_agreement(session_id)` — 합의 조회
| 항목 | 내용 |
|------|------|
| 접근제어 | 없음 (공개 조회) |
| 평가 | **정상** |

#### `verify_agreement(session_id)` — 합의 존재 여부 확인
| 항목 | 내용 |
|------|------|
| 로직 | session_id 키 존재 여부만 반환 |
| 평가 | **불완전** — 서명 검증 없이 존재만 확인 |

### 2.4 시나리오 분석

#### 정상 시나리오

| # | 시나리오 | 흐름 |
|---|----------|------|
| S1 | 합의 기록 | 협상 완료 → record_agreement 호출 → 온체인 저장 |
| S2 | 합의 조회 | session_id로 get_agreement → AgreementRecord 반환 |
| S3 | 합의 검증 | session_id로 verify_agreement → true/false |

#### 엣지 케이스

| # | 시나리오 | 현재 동작 | 기대 동작 |
|---|----------|-----------|-----------|
| E1 | 동일 session_id로 중복 기록 | panic | **정상** |
| E2 | 존재하지 않는 session_id 조회 | None 반환 | **정상** |
| E3 | 빈 서명으로 기록 | 허용됨 | **검토 필요** |
| E4 | 제3자가 위조 합의 기록 | **허용됨** | **차단 필요** |

### 2.5 보안 취약점

#### [CRITICAL] record_agreement 접근제어 부재

누구나 임의의 seeker/employer 계정으로 합의를 기록할 수 있음. 위조 합의가 온체인에 영구 저장됨.

**공격 시나리오:**
1. 악의적 사용자가 임의의 session_id, 위조 서명으로 `record_agreement` 호출
2. 존재하지 않는 합의가 온체인에 기록됨
3. `verify_agreement`가 true 반환 → 시스템이 유효한 합의로 오인

#### [HIGH] 서명 검증 없음

`seeker_signature`, `employer_signature` 필드가 있지만 온체인에서 검증하지 않음. 서명 값은 임의의 바이트열을 넣어도 통과.

#### [MEDIUM] agreement_hash 무결성 검증 없음

`agreement_hash`가 실제 합의 내용의 해시인지 검증하지 않음. 해시와 summary가 불일치해도 기록됨.

### 2.6 테스트 커버리지 분석

| 테스트 | 커버 시나리오 | 평가 |
|--------|---------------|------|
| `test_record_and_get_agreement` | S1+S2 — 기록 후 조회 | OK |
| `test_verify_agreement` | S3 — 존재 여부 확인 | OK |
| `test_duplicate_agreement_panics` | E1 — 중복 기록 차단 | OK |
| `test_get_nonexistent` | E2 — 미존재 조회 | OK |

#### 누락된 테스트

| # | 누락 시나리오 | 중요도 |
|---|---------------|--------|
| T1 | 제3자가 위조 합의 기록 시 차단 여부 | **Critical** (현재 차단 안됨) |
| T2 | 빈 서명(empty Vec)으로 기록 | Medium |
| T3 | 서명 유효성 검증 | **Critical** (현재 미구현) |
| T4 | agreement_hash와 summary 불일치 | Medium |
| T5 | 매우 긴 문자열 (position_title 등) 입력 | Low |

---

## 3. 종합 평가

### 보안 등급

| 컨트랙트 | 등급 | 사유 |
|----------|------|------|
| Escrow | **위험** | 자금 탈취 가능한 접근제어 부재 |
| Agreement | **위험** | 합의 위조 가능한 접근제어 + 서명 검증 부재 |

### 우선순위별 수정 사항

| 순위 | 컨트랙트 | 수정 사항 |
|------|----------|-----------|
| P0 | Escrow | `pay_for_profile`에 caller 권한 검증 추가 |
| P0 | Agreement | `record_agreement`에 caller 권한 검증 또는 서명 온체인 검증 추가 |
| P1 | Escrow | `withdraw` 메서드 추가 |
| P1 | Agreement | Ed25519 서명 검증 로직 구현 |
| P2 | Escrow | 스토리지 비용 관리 (storage deposit 패턴) |
| P2 | Escrow | `PROFILE_VIEW_COST` 동적 설정 메서드 |
| P3 | Agreement | `agreement_hash` 무결성 검증 |

### 테스트 현황 요약

| 컨트랙트 | 기존 테스트 | 누락 (Critical) | 누락 (기타) | 커버리지 추정 |
|----------|------------|-----------------|-------------|---------------|
| Escrow | 6개 | 1개 | 6개 | ~45% |
| Agreement | 4개 | 2개 | 3개 | ~40% |

> **결론:** 두 컨트랙트 모두 핵심 비즈니스 로직은 구현되어 있으나, 접근제어가 전반적으로 부재하여 testnet 배포 전 반드시 수정이 필요합니다.
