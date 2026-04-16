use near_sdk::store::IterableMap;
use near_sdk::{env, near, AccountId, PanicOnDefault};
use sha2::{Sha256, Digest};
use ed25519_dalek::{Verifier, VerifyingKey, Signature};

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
    owner: AccountId,
    system_agent: Option<AccountId>,
    agreements: IterableMap<String, AgreementRecord>,
}

#[near]
impl AgreementContract {
    #[init]
    pub fn new() -> Self {
        Self {
            owner: env::predecessor_account_id(),
            system_agent: None,
            agreements: IterableMap::new(b"a"),
        }
    }

    pub fn set_system_agent(&mut self, agent_id: AccountId) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only owner can set system agent"
        );
        self.system_agent = Some(agent_id);
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
        seeker_public_key: Vec<u8>,
        employer_public_key: Vec<u8>,
    ) {
        // P0: Access control — caller must be a party or system agent
        let caller = env::predecessor_account_id();
        let is_party = caller == seeker_account || caller == employer_account;
        let is_system = self.system_agent.as_ref().map_or(false, |sa| &caller == sa);
        assert!(
            is_party || is_system,
            "Unauthorized: only agreement parties or system agent can record"
        );

        // Duplicate check
        assert!(
            !self.agreements.contains_key(&session_id),
            "Agreement already exists for this session"
        );

        // P1: Reject empty signatures
        assert!(!seeker_signature.is_empty(), "Seeker signature must not be empty");
        assert!(!employer_signature.is_empty(), "Employer signature must not be empty");

        // P3: Verify agreement_hash matches SHA-256 of canonical summary
        let canonical = Self::canonical_summary_bytes(&summary);
        let computed_hash = hex::encode(Sha256::digest(&canonical));
        assert_eq!(
            agreement_hash, computed_hash,
            "Agreement hash does not match summary content"
        );

        // P1: Verify Ed25519 signatures over canonical summary bytes
        assert!(
            Self::verify_ed25519_signature(&seeker_public_key, &canonical, &seeker_signature),
            "Invalid seeker signature"
        );
        assert!(
            Self::verify_ed25519_signature(&employer_public_key, &canonical, &employer_signature),
            "Invalid employer signature"
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

    pub(crate) fn canonical_summary_bytes(summary: &AgreementSummary) -> Vec<u8> {
        format!(
            "{}:{}:{}:{}",
            summary.position_title,
            summary.agreed_salary,
            summary.start_date,
            summary.negotiation_rounds
        )
        .into_bytes()
    }

    fn verify_ed25519_signature(
        public_key_bytes: &[u8],
        message: &[u8],
        signature_bytes: &[u8],
    ) -> bool {
        if public_key_bytes.len() != 32 || signature_bytes.len() != 64 {
            return false;
        }
        let Ok(verifying_key) = VerifyingKey::try_from(&public_key_bytes[..32]) else {
            return false;
        };
        let Ok(signature) = Signature::try_from(&signature_bytes[..64]) else {
            return false;
        };
        verifying_key.verify(message, &signature).is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;
    use ed25519_dalek::{SigningKey, Signer};
    use sha2::{Sha256, Digest};

    fn get_context(predecessor: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor);
        builder
    }

    fn make_summary() -> AgreementSummary {
        AgreementSummary {
            position_title: "Senior Developer".to_string(),
            agreed_salary: 80_000_000,
            start_date: "2026-05-01".to_string(),
            negotiation_rounds: 5,
        }
    }

    /// Helper: create a valid signed agreement with real Ed25519 keys
    fn sign_agreement(summary: &AgreementSummary) -> (Vec<u8>, Vec<u8>, Vec<u8>, Vec<u8>, String) {
        let canonical = AgreementContract::canonical_summary_bytes(summary);
        let hash = hex::encode(Sha256::digest(&canonical));

        // Generate seeker keypair
        let seeker_sk = SigningKey::from_bytes(&[1u8; 32]);
        let seeker_pk = seeker_sk.verifying_key();
        let seeker_sig = seeker_sk.sign(&canonical);

        // Generate employer keypair
        let employer_sk = SigningKey::from_bytes(&[2u8; 32]);
        let employer_pk = employer_sk.verifying_key();
        let employer_sig = employer_sk.sign(&canonical);

        (
            seeker_sig.to_bytes().to_vec(),
            employer_sig.to_bytes().to_vec(),
            seeker_pk.to_bytes().to_vec(),
            employer_pk.to_bytes().to_vec(),
            hash,
        )
    }

    #[test]
    fn test_record_and_get_agreement() {
        let seeker: AccountId = "seeker.testnet".parse().unwrap();
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(seeker.clone());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();

        let summary = make_summary();
        let (seeker_sig, employer_sig, seeker_pk, employer_pk, hash) = sign_agreement(&summary);

        contract.record_agreement(
            "session-001".to_string(), hash, summary,
            seeker.clone(), employer.clone(),
            seeker_sig, employer_sig,
            seeker_pk, employer_pk,
        );

        let record = contract.get_agreement("session-001".to_string()).unwrap();
        assert_eq!(record.session_id, "session-001");
        assert_eq!(record.summary.position_title, "Senior Developer");
        assert_eq!(record.summary.agreed_salary, 80_000_000);
    }

    #[test]
    fn test_verify_agreement() {
        let seeker: AccountId = "seeker.testnet".parse().unwrap();
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(seeker.clone());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();
        assert!(!contract.verify_agreement("nonexistent".to_string()));

        let summary = make_summary();
        let (seeker_sig, employer_sig, seeker_pk, employer_pk, hash) = sign_agreement(&summary);

        contract.record_agreement(
            "session-002".to_string(), hash, summary,
            seeker.clone(), employer.clone(),
            seeker_sig, employer_sig,
            seeker_pk, employer_pk,
        );
        assert!(contract.verify_agreement("session-002".to_string()));
    }

    #[test]
    #[should_panic(expected = "Agreement already exists")]
    fn test_duplicate_agreement_panics() {
        let seeker: AccountId = "seeker.testnet".parse().unwrap();
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(seeker.clone());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();

        let summary = make_summary();
        let (seeker_sig, employer_sig, seeker_pk, employer_pk, hash) = sign_agreement(&summary);

        contract.record_agreement(
            "session-003".to_string(), hash.clone(), summary.clone(),
            seeker.clone(), employer.clone(),
            seeker_sig.clone(), employer_sig.clone(),
            seeker_pk.clone(), employer_pk.clone(),
        );
        contract.record_agreement(
            "session-003".to_string(), hash, summary,
            seeker, employer,
            seeker_sig, employer_sig,
            seeker_pk, employer_pk,
        );
    }

    #[test]
    fn test_get_nonexistent() {
        let context = get_context("alice.testnet".parse().unwrap());
        testing_env!(context.build());
        let contract = AgreementContract::new();
        assert!(contract.get_agreement("nonexistent".to_string()).is_none());
    }

    // === NEW SECURITY TESTS ===

    #[test]
    #[should_panic(expected = "Unauthorized: only agreement parties or system agent can record")]
    fn test_third_party_recording_blocked() {
        let seeker: AccountId = "seeker.testnet".parse().unwrap();
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let attacker: AccountId = "attacker.testnet".parse().unwrap();

        // Init as attacker (not a party)
        let context = get_context(attacker.clone());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();

        // attacker tries to set context as attacker and record
        let context = get_context(attacker);
        testing_env!(context.build());

        let summary = make_summary();
        let (seeker_sig, employer_sig, seeker_pk, employer_pk, hash) = sign_agreement(&summary);

        contract.record_agreement(
            "forged-session".to_string(), hash, summary,
            seeker, employer,
            seeker_sig, employer_sig,
            seeker_pk, employer_pk,
        );
    }

    #[test]
    #[should_panic(expected = "Seeker signature must not be empty")]
    fn test_empty_seeker_signature_blocked() {
        let seeker: AccountId = "seeker.testnet".parse().unwrap();
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(seeker.clone());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();

        let summary = make_summary();
        let (_, employer_sig, seeker_pk, employer_pk, hash) = sign_agreement(&summary);

        contract.record_agreement(
            "session-empty-sig".to_string(), hash, summary,
            seeker, employer,
            vec![], employer_sig,  // empty seeker sig
            seeker_pk, employer_pk,
        );
    }

    #[test]
    #[should_panic(expected = "Employer signature must not be empty")]
    fn test_empty_employer_signature_blocked() {
        let seeker: AccountId = "seeker.testnet".parse().unwrap();
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(seeker.clone());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();

        let summary = make_summary();
        let (seeker_sig, _, seeker_pk, employer_pk, hash) = sign_agreement(&summary);

        contract.record_agreement(
            "session-empty-sig-2".to_string(), hash, summary,
            seeker, employer,
            seeker_sig, vec![],  // empty employer sig
            seeker_pk, employer_pk,
        );
    }

    #[test]
    #[should_panic(expected = "Invalid seeker signature")]
    fn test_invalid_seeker_signature_rejected() {
        let seeker: AccountId = "seeker.testnet".parse().unwrap();
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(seeker.clone());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();

        let summary = make_summary();
        let (_, employer_sig, seeker_pk, employer_pk, hash) = sign_agreement(&summary);

        // Use garbage 64-byte signature
        let bad_sig = vec![0xFFu8; 64];

        contract.record_agreement(
            "session-bad-sig".to_string(), hash, summary,
            seeker, employer,
            bad_sig, employer_sig,
            seeker_pk, employer_pk,
        );
    }

    #[test]
    #[should_panic(expected = "Agreement hash does not match summary content")]
    fn test_hash_mismatch_rejected() {
        let seeker: AccountId = "seeker.testnet".parse().unwrap();
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(seeker.clone());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();

        let summary = make_summary();
        let (seeker_sig, employer_sig, seeker_pk, employer_pk, _) = sign_agreement(&summary);

        contract.record_agreement(
            "session-bad-hash".to_string(),
            "totally_wrong_hash".to_string(),  // wrong hash
            summary,
            seeker, employer,
            seeker_sig, employer_sig,
            seeker_pk, employer_pk,
        );
    }

    #[test]
    fn test_system_agent_can_record() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let system_agent: AccountId = "system.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();
        let employer: AccountId = "employer.testnet".parse().unwrap();

        // Owner creates contract and sets system agent
        let context = get_context(owner.clone());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();
        contract.set_system_agent(system_agent.clone());

        // System agent records agreement
        let context = get_context(system_agent);
        testing_env!(context.build());

        let summary = make_summary();
        let (seeker_sig, employer_sig, seeker_pk, employer_pk, hash) = sign_agreement(&summary);

        contract.record_agreement(
            "session-sys".to_string(), hash, summary,
            seeker, employer,
            seeker_sig, employer_sig,
            seeker_pk, employer_pk,
        );

        assert!(contract.verify_agreement("session-sys".to_string()));
    }

    #[test]
    fn test_employer_party_can_record() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        // Someone else is owner, but employer is a party
        let context = get_context("deployer.testnet".parse().unwrap());
        testing_env!(context.build());
        let mut contract = AgreementContract::new();

        // Employer calls record_agreement
        let context = get_context(employer.clone());
        testing_env!(context.build());

        let summary = make_summary();
        let (seeker_sig, employer_sig, seeker_pk, employer_pk, hash) = sign_agreement(&summary);

        contract.record_agreement(
            "session-emp".to_string(), hash, summary,
            seeker, employer,
            seeker_sig, employer_sig,
            seeker_pk, employer_pk,
        );

        assert!(contract.verify_agreement("session-emp".to_string()));
    }
}
