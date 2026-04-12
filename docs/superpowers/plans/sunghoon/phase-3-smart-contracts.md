# Phase 3: Smart Contracts — Agreement + Escrow (Day 1 오후 ~ Day 2 오전)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agreement + Escrow Rust 컨트랙트 구현, 유닛 테스트 통과, WASM 빌드 확인
**선행:** Phase 1 (의존 없지만, Phase 1 이후 시작 권장) — Phase 2와 병렬 가능
**완료 기준:** `cargo test` 전부 통과, `wasm32-unknown-unknown` 빌드 성공
**예상 소요:** ~40분

---

## Task 3.1: Agreement Contract

**Files:**
- Create: `contract/agreement/Cargo.toml`
- Create: `contract/agreement/src/lib.rs`

- [ ] **Step 1: 프로젝트 구조 생성**

Run: `mkdir -p contract/agreement/src`

- [ ] **Step 2: Cargo.toml 작성**

```toml
# contract/agreement/Cargo.toml
[package]
name = "agreement"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
near-sdk = "5.6.0"

[profile.release]
codegen-units = 1
opt-level = "z"
lto = true
debug = false
panic = "abort"
overflow-checks = true
```

- [ ] **Step 3: Agreement Contract 구현 (테스트 포함)**

```rust
// contract/agreement/src/lib.rs

use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault};

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct AgreementSummary {
    pub position_title: String,
    pub agreed_salary: u128,
    pub start_date: String,
    pub negotiation_rounds: u32,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct AgreementRecord {
    pub session_id: String,
    pub agreement_hash: String,
    pub summary: AgreementSummary,
    pub seeker_account: AccountId,
    pub employer_account: AccountId,
    pub seeker_signature: Vec<u8>,
    pub employer_signature: Vec<u8>,
    pub created_at: u64,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct AgreementContract {
    agreements: UnorderedMap<String, AgreementRecord>,
}

#[near_bindgen]
impl AgreementContract {
    #[init]
    pub fn new() -> Self {
        Self {
            agreements: UnorderedMap::new(b"a"),
        }
    }

    pub fn record_agreement(
        &mut self,
        session_id: String,
        agreement_hash: String,
        summary: AgreementSummary,
        seeker_account: AccountId,
        employer_account: AccountId,
        seeker_signature: Vec<u8>,
        employer_signature: Vec<u8>,
    ) {
        assert!(
            self.agreements.get(&session_id).is_none(),
            "Agreement already exists for this session"
        );

        let record = AgreementRecord {
            session_id: session_id.clone(),
            agreement_hash,
            summary,
            seeker_account,
            employer_account,
            seeker_signature,
            employer_signature,
            created_at: env::block_timestamp(),
        };

        self.agreements.insert(&session_id, &record);
    }

    pub fn get_agreement(&self, session_id: String) -> Option<AgreementRecord> {
        self.agreements.get(&session_id)
    }

    pub fn verify_agreement(&self, session_id: String) -> bool {
        self.agreements.get(&session_id).is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor);
        builder
    }

    #[test]
    fn test_record_and_get_agreement() {
        let context = get_context("alice.testnet".parse().unwrap());
        testing_env!(context.build());

        let mut contract = AgreementContract::new();
        let summary = AgreementSummary {
            position_title: "Senior Developer".to_string(),
            agreed_salary: 80_000_000,
            start_date: "2026-05-01".to_string(),
            negotiation_rounds: 5,
        };

        contract.record_agreement(
            "session-001".to_string(), "abc123hash".to_string(), summary,
            "seeker.testnet".parse().unwrap(), "employer.testnet".parse().unwrap(),
            vec![1, 2, 3], vec![4, 5, 6],
        );

        let record = contract.get_agreement("session-001".to_string()).unwrap();
        assert_eq!(record.session_id, "session-001");
        assert_eq!(record.summary.position_title, "Senior Developer");
        assert_eq!(record.summary.agreed_salary, 80_000_000);
    }

    #[test]
    fn test_verify_agreement() {
        let context = get_context("alice.testnet".parse().unwrap());
        testing_env!(context.build());

        let mut contract = AgreementContract::new();
        assert!(!contract.verify_agreement("nonexistent".to_string()));

        let summary = AgreementSummary {
            position_title: "Dev".to_string(), agreed_salary: 50_000_000,
            start_date: "2026-06-01".to_string(), negotiation_rounds: 3,
        };

        contract.record_agreement(
            "session-002".to_string(), "hash456".to_string(), summary,
            "seeker2.testnet".parse().unwrap(), "employer2.testnet".parse().unwrap(),
            vec![], vec![],
        );

        assert!(contract.verify_agreement("session-002".to_string()));
    }

    #[test]
    #[should_panic(expected = "Agreement already exists")]
    fn test_duplicate_agreement_panics() {
        let context = get_context("alice.testnet".parse().unwrap());
        testing_env!(context.build());

        let mut contract = AgreementContract::new();
        let summary = AgreementSummary {
            position_title: "Dev".to_string(), agreed_salary: 50_000_000,
            start_date: "2026-06-01".to_string(), negotiation_rounds: 3,
        };

        contract.record_agreement(
            "session-003".to_string(), "hash789".to_string(), summary.clone(),
            "seeker.testnet".parse().unwrap(), "employer.testnet".parse().unwrap(),
            vec![], vec![],
        );
        contract.record_agreement(
            "session-003".to_string(), "hash789".to_string(), summary,
            "seeker.testnet".parse().unwrap(), "employer.testnet".parse().unwrap(),
            vec![], vec![],
        );
    }

    #[test]
    fn test_get_nonexistent() {
        let context = get_context("alice.testnet".parse().unwrap());
        testing_env!(context.build());
        let contract = AgreementContract::new();
        assert!(contract.get_agreement("nonexistent".to_string()).is_none());
    }
}
```

- [ ] **Step 4: 테스트 실행**

Run: `cd contract/agreement && cargo test`
Expected: 4 tests passed

- [ ] **Step 5: WASM 빌드 확인**

Run: `rustup target add wasm32-unknown-unknown && cd contract/agreement && cargo build --target wasm32-unknown-unknown --release`
Expected: 빌드 성공

- [ ] **Step 6: Commit**

```bash
git add contract/agreement/
git commit -m "feat: add Agreement smart contract with record/get/verify"
```

---

## Task 3.2: Escrow Contract

**Files:**
- Create: `contract/escrow/Cargo.toml`
- Create: `contract/escrow/src/lib.rs`

- [ ] **Step 1: 프로젝트 구조 생성**

Run: `mkdir -p contract/escrow/src`

- [ ] **Step 2: Cargo.toml 작성**

```toml
# contract/escrow/Cargo.toml
[package]
name = "escrow"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
near-sdk = "5.6.0"

[profile.release]
codegen-units = 1
opt-level = "z"
lto = true
debug = false
panic = "abort"
overflow-checks = true
```

- [ ] **Step 3: Escrow Contract 구현 (테스트 포함)**

```rust
// contract/escrow/src/lib.rs

use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, AccountId, Balance, PanicOnDefault, Promise};

const PROFILE_VIEW_COST: Balance = 100_000_000_000_000_000_000_000; // 0.1 NEAR

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct EscrowAccount {
    pub employer_id: AccountId,
    pub balance: Balance,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct ProfileAccessRecord {
    pub employer_id: AccountId,
    pub seeker_id: AccountId,
    pub amount: Balance,
    pub timestamp: u64,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct EscrowContract {
    accounts: UnorderedMap<AccountId, EscrowAccount>,
    access_records: UnorderedMap<String, Vec<ProfileAccessRecord>>,
}

#[near_bindgen]
impl EscrowContract {
    #[init]
    pub fn new() -> Self {
        Self {
            accounts: UnorderedMap::new(b"a"),
            access_records: UnorderedMap::new(b"r"),
        }
    }

    #[payable]
    pub fn deposit(&mut self) {
        let employer_id = env::predecessor_account_id();
        let deposit_amount = env::attached_deposit();
        assert!(deposit_amount > 0, "Deposit amount must be greater than 0");

        let mut account = self.accounts.get(&employer_id).unwrap_or(EscrowAccount {
            employer_id: employer_id.clone(),
            balance: 0,
        });
        account.balance += deposit_amount;
        self.accounts.insert(&employer_id, &account);
    }

    pub fn pay_for_profile(&mut self, employer_id: AccountId, seeker_id: AccountId) {
        let mut account = self.accounts.get(&employer_id)
            .expect("Employer has no escrow account");

        assert!(account.balance >= PROFILE_VIEW_COST, "Insufficient escrow balance");

        account.balance -= PROFILE_VIEW_COST;
        self.accounts.insert(&employer_id, &account);

        Promise::new(seeker_id.clone()).transfer(PROFILE_VIEW_COST);

        let record = ProfileAccessRecord {
            employer_id: employer_id.clone(),
            seeker_id,
            amount: PROFILE_VIEW_COST,
            timestamp: env::block_timestamp(),
        };

        let key = employer_id.to_string();
        let mut records = self.access_records.get(&key).unwrap_or_default();
        records.push(record);
        self.access_records.insert(&key, &records);
    }

    pub fn get_balance(&self, employer_id: AccountId) -> Balance {
        self.accounts.get(&employer_id).map(|a| a.balance).unwrap_or(0)
    }

    pub fn get_access_history(&self, employer_id: AccountId) -> Vec<ProfileAccessRecord> {
        self.access_records.get(&employer_id.to_string()).unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId, deposit: Balance) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor);
        builder.attached_deposit(deposit);
        builder
    }

    #[test]
    fn test_deposit() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let context = get_context(employer.clone(), 1_000_000_000_000_000_000_000_000);
        testing_env!(context.build());

        let mut contract = EscrowContract::new();
        contract.deposit();

        assert_eq!(contract.get_balance(employer), 1_000_000_000_000_000_000_000_000);
    }

    #[test]
    fn test_multiple_deposits() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let context = get_context(employer.clone(), 1_000_000_000_000_000_000_000_000);
        testing_env!(context.build());

        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), 500_000_000_000_000_000_000_000);
        testing_env!(context.build());
        contract.deposit();

        assert_eq!(contract.get_balance(employer), 1_500_000_000_000_000_000_000_000);
    }

    #[test]
    fn test_pay_for_profile() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        let context = get_context(employer.clone(), 1_000_000_000_000_000_000_000_000);
        testing_env!(context.build());

        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), 0);
        testing_env!(context.build());
        contract.pay_for_profile(employer.clone(), seeker.clone());

        assert_eq!(contract.get_balance(employer.clone()), 900_000_000_000_000_000_000_000);

        let history = contract.get_access_history(employer);
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].seeker_id, seeker);
    }

    #[test]
    #[should_panic(expected = "Insufficient escrow balance")]
    fn test_pay_insufficient_balance() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        let context = get_context(employer.clone(), 50_000_000_000_000_000_000_000); // 0.05 NEAR
        testing_env!(context.build());

        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), 0);
        testing_env!(context.build());
        contract.pay_for_profile(employer, seeker);
    }

    #[test]
    fn test_get_balance_nonexistent() {
        let context = get_context("anyone.testnet".parse().unwrap(), 0);
        testing_env!(context.build());
        let contract = EscrowContract::new();
        assert_eq!(contract.get_balance("nobody.testnet".parse().unwrap()), 0);
    }

    #[test]
    fn test_get_empty_access_history() {
        let context = get_context("anyone.testnet".parse().unwrap(), 0);
        testing_env!(context.build());
        let contract = EscrowContract::new();
        assert!(contract.get_access_history("nobody.testnet".parse().unwrap()).is_empty());
    }
}
```

- [ ] **Step 4: 테스트 실행**

Run: `cd contract/escrow && cargo test`
Expected: 6 tests passed

- [ ] **Step 5: WASM 빌드 확인**

Run: `cd contract/escrow && cargo build --target wasm32-unknown-unknown --release`
Expected: 빌드 성공

- [ ] **Step 6: Commit**

```bash
git add contract/escrow/
git commit -m "feat: add Escrow smart contract with deposit/pay/balance/history"
```

---

## Phase 3 완료 기준

- [ ] Agreement Contract — `cargo test` 4개 전부 통과
- [ ] Escrow Contract — `cargo test` 6개 전부 통과
- [ ] 두 컨트랙트 모두 `wasm32-unknown-unknown` 빌드 성공
- [ ] 팀에 "Phase 3 완료 — 스마트컨트랙트 ABI 참조 가능" 공유
