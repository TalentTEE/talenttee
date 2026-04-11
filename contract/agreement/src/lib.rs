use near_sdk::store::IterableMap;
use near_sdk::{env, near, AccountId, PanicOnDefault};

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct AgreementSummary {
    pub position_title: String,
    pub agreed_salary: u128,
    pub start_date: String,
    pub negotiation_rounds: u32,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
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

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct AgreementContract {
    agreements: IterableMap<String, AgreementRecord>,
}

#[near]
impl AgreementContract {
    #[init]
    pub fn new() -> Self {
        Self {
            agreements: IterableMap::new(b"a"),
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
            !self.agreements.contains_key(&session_id),
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

        self.agreements.insert(session_id, record);
    }

    pub fn get_agreement(&self, session_id: String) -> Option<&AgreementRecord> {
        self.agreements.get(&session_id)
    }

    pub fn verify_agreement(&self, session_id: String) -> bool {
        self.agreements.contains_key(&session_id)
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
