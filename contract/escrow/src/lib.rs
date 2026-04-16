use near_sdk::store::IterableMap;
use near_sdk::{env, json_types::U128, near, AccountId, NearToken, PanicOnDefault, Promise};

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
    owner: AccountId,
    accounts: IterableMap<AccountId, EscrowAccount>,
    access_records: IterableMap<String, Vec<ProfileAccessRecord>>,
    authorized_agents: IterableMap<AccountId, Vec<AccountId>>,
}

#[near]
impl EscrowContract {
    #[init]
    pub fn new() -> Self {
        Self {
            owner: env::predecessor_account_id(),
            accounts: IterableMap::new(b"a"),
            access_records: IterableMap::new(b"r"),
            authorized_agents: IterableMap::new(b"g"),
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
        let caller = env::predecessor_account_id();
        assert!(
            caller == employer_id || self.is_authorized_agent(&employer_id, &caller),
            "Unauthorized: only employer or authorized agent can pay"
        );

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

    pub fn withdraw(&mut self, amount: U128) {
        let employer_id = env::predecessor_account_id();
        let mut account = self.accounts.get(&employer_id)
            .cloned()
            .expect("Employer has no escrow account");
        let withdraw_amount: u128 = amount.into();
        assert!(withdraw_amount > 0, "Withdraw amount must be greater than 0");
        assert!(account.balance >= withdraw_amount, "Insufficient escrow balance for withdrawal");
        account.balance -= withdraw_amount;
        self.accounts.insert(employer_id.clone(), account);
        Promise::new(employer_id).transfer(NearToken::from_yoctonear(withdraw_amount));
    }

    pub fn authorize_agent(&mut self, agent_id: AccountId) {
        let employer_id = env::predecessor_account_id();
        let mut agents = self.authorized_agents.get(&employer_id).cloned().unwrap_or_default();
        if !agents.contains(&agent_id) {
            agents.push(agent_id);
        }
        self.authorized_agents.insert(employer_id, agents);
    }

    pub fn revoke_agent(&mut self, agent_id: AccountId) {
        let employer_id = env::predecessor_account_id();
        let mut agents = self.authorized_agents.get(&employer_id).cloned().unwrap_or_default();
        agents.retain(|a| a != &agent_id);
        self.authorized_agents.insert(employer_id, agents);
    }

    pub fn get_balance(&self, employer_id: AccountId) -> u128 {
        self.accounts.get(&employer_id).map(|a| a.balance).unwrap_or(0)
    }

    pub fn get_access_history(&self, employer_id: AccountId) -> Vec<ProfileAccessRecord> {
        self.access_records.get(&employer_id.to_string()).cloned().unwrap_or_default()
    }

    fn is_authorized_agent(&self, employer_id: &AccountId, caller: &AccountId) -> bool {
        self.authorized_agents
            .get(employer_id)
            .map(|agents| agents.contains(caller))
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::json_types::U128;
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

    #[test]
    #[should_panic(expected = "Unauthorized: only employer or authorized agent can pay")]
    fn test_third_party_pay_blocked() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let attacker: AccountId = "attacker.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();

        // Attacker tries to drain employer's funds
        let context = get_context(attacker, NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.pay_for_profile(employer, seeker);
    }

    #[test]
    fn test_employer_can_pay_for_profile() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.pay_for_profile(employer.clone(), seeker);
        assert_eq!(contract.get_balance(employer), 900_000_000_000_000_000_000_000);
    }

    #[test]
    fn test_authorized_agent_can_pay() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let agent: AccountId = "agent.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();
        contract.authorize_agent(agent.clone());

        let context = get_context(agent, NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.pay_for_profile(employer.clone(), seeker);
        assert_eq!(contract.get_balance(employer), 900_000_000_000_000_000_000_000);
    }

    #[test]
    fn test_withdraw_success() {
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.withdraw(U128::from(500_000_000_000_000_000_000_000u128)); // 0.5 NEAR
        assert_eq!(contract.get_balance(employer), 500_000_000_000_000_000_000_000);
    }

    #[test]
    #[should_panic(expected = "Insufficient escrow balance for withdrawal")]
    fn test_withdraw_insufficient_balance() {
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.withdraw(U128::from(2_000_000_000_000_000_000_000_000u128)); // 2 NEAR > 1 NEAR
    }

    #[test]
    #[should_panic(expected = "Employer has no escrow account")]
    fn test_withdraw_no_account() {
        let nobody: AccountId = "nobody.testnet".parse().unwrap();

        let context = get_context(nobody, NearToken::from_yoctonear(0));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.withdraw(U128::from(1u128));
    }

    #[test]
    #[should_panic(expected = "Withdraw amount must be greater than 0")]
    fn test_withdraw_zero_amount() {
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer, NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.withdraw(U128::from(0u128));
    }

    #[test]
    fn test_exact_boundary_payment() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        // Deposit exactly 0.1 NEAR
        let context = get_context(employer.clone(), NearToken::from_yoctonear(PROFILE_VIEW_COST));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();

        let context = get_context(employer.clone(), NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.pay_for_profile(employer.clone(), seeker);
        assert_eq!(contract.get_balance(employer), 0);
    }

    #[test]
    #[should_panic(expected = "Deposit amount must be greater than 0")]
    fn test_zero_deposit() {
        let employer: AccountId = "employer.testnet".parse().unwrap();

        let context = get_context(employer, NearToken::from_yoctonear(0));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();
    }

    #[test]
    #[should_panic(expected = "Unauthorized: only employer or authorized agent can pay")]
    fn test_revoke_agent_blocks_payment() {
        let employer: AccountId = "employer.testnet".parse().unwrap();
        let agent: AccountId = "agent.testnet".parse().unwrap();
        let seeker: AccountId = "seeker.testnet".parse().unwrap();

        let context = get_context(employer.clone(), NearToken::from_near(1));
        testing_env!(context.build());
        let mut contract = EscrowContract::new();
        contract.deposit();
        contract.authorize_agent(agent.clone());
        contract.revoke_agent(agent.clone());

        let context = get_context(agent, NearToken::from_yoctonear(0));
        testing_env!(context.build());
        contract.pay_for_profile(employer, seeker);
    }
}
