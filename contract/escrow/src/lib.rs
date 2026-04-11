use near_sdk::store::IterableMap;
use near_sdk::{env, near, AccountId, NearToken, PanicOnDefault, Promise};

const PROFILE_VIEW_COST: u128 = 100_000_000_000_000_000_000_000; // 0.1 NEAR

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct EscrowAccount {
    pub employer_id: AccountId,
    pub balance: u128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct ProfileAccessRecord {
    pub employer_id: AccountId,
    pub seeker_id: AccountId,
    pub amount: u128,
    pub timestamp: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct EscrowContract {
    accounts: IterableMap<AccountId, EscrowAccount>,
    access_records: IterableMap<String, Vec<ProfileAccessRecord>>,
}

#[near]
impl EscrowContract {
    #[init]
    pub fn new() -> Self {
        Self {
            accounts: IterableMap::new(b"a"),
            access_records: IterableMap::new(b"r"),
        }
    }

    #[payable]
    pub fn deposit(&mut self) {
        let employer_id = env::predecessor_account_id();
        let deposit_amount: u128 = env::attached_deposit().as_yoctonear();
        assert!(deposit_amount > 0, "Deposit amount must be greater than 0");

        let mut account = self.accounts.get(&employer_id).cloned().unwrap_or(EscrowAccount {
            employer_id: employer_id.clone(),
            balance: 0,
        });
        account.balance += deposit_amount;
        self.accounts.insert(employer_id, account);
    }

    pub fn pay_for_profile(&mut self, employer_id: AccountId, seeker_id: AccountId) {
        let mut account = self.accounts.get(&employer_id)
            .cloned()
            .expect("Employer has no escrow account");

        assert!(account.balance >= PROFILE_VIEW_COST, "Insufficient escrow balance");

        account.balance -= PROFILE_VIEW_COST;
        self.accounts.insert(employer_id.clone(), account);

        Promise::new(seeker_id.clone()).transfer(NearToken::from_yoctonear(PROFILE_VIEW_COST));

        let record = ProfileAccessRecord {
            employer_id: employer_id.clone(),
            seeker_id,
            amount: PROFILE_VIEW_COST,
            timestamp: env::block_timestamp(),
        };

        let key = employer_id.to_string();
        let mut records = self.access_records.get(&key).cloned().unwrap_or_default();
        records.push(record);
        self.access_records.insert(key, records);
    }

    pub fn get_balance(&self, employer_id: AccountId) -> u128 {
        self.accounts.get(&employer_id).map(|a| a.balance).unwrap_or(0)
    }

    pub fn get_access_history(&self, employer_id: AccountId) -> Vec<ProfileAccessRecord> {
        self.access_records.get(&employer_id.to_string()).cloned().unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId, deposit: NearToken) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor);
        builder.attached_deposit(deposit);
        builder
    }

    #[test]
    fn test_deposit() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());

        let mut contract = EscrowContract::new();
        contract.deposit();

        assert_eq!(contract.get_balance(employer), 1_000_000_000_000_000_000_000_000);
    }

    #[test]
    fn test_multiple_deposits() {
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), NearToken::from_millinear(500));
        testing_env!(context.build());
        contract.deposit();

        assert_eq!(contract.get_balance(employer), 1_500_000_000_000_000_000_000_000);
    }

    #[test]
    fn test_pay_for_profile() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.pay_for_profile(employer.clone(), seeker.clone());

        // 1 NEAR - 0.1 NEAR = 0.9 NEAR
        assert_eq!(contract.get_balance(employer.clone()), 900_000_000_000_000_000_000_000);

        let history = contract.get_access_history(employer);
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].seeker_id, seeker);
        assert_eq!(history[0].amount, PROFILE_VIEW_COST);
    }

    #[test]
    #[should_panic(expected = "Insufficient escrow balance")]
    fn test_pay_insufficient_balance() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_millinear(50)); // 0.05 NEAR
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.pay_for_profile(employer, seeker);
    }

    #[test]
    fn test_get_balance_nonexistent() {
        let context = get_context("anyone.testnet".parse().unwrap(), NearToken::from_yoctonear(0));
        testing_env!(context.build());
        let contract = EscrowContract::new();
        assert_eq!(contract.get_balance("nobody.testnet".parse().unwrap()), 0);
    }

    #[test]
    fn test_get_empty_access_history() {
        let context = get_context("anyone.testnet".parse().unwrap(), NearToken::from_yoctonear(0));
        testing_env!(context.build());
        let contract = EscrowContract::new();
        assert!(contract.get_access_history("nobody.testnet".parse().unwrap()).is_empty());
    }
}
