#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String, Symbol};

#[contract]
pub struct StellarSplitToken;

#[contractimpl]
impl StellarSplitToken {
    pub fn initialize(env: Env, admin: Address, name: String, symbol: String) {
        if env.storage().instance().has(&Symbol::new(&env, "admin")) {
            panic!("already initialized");
        }
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().instance().set(&Symbol::new(&env, "name"), &name);
        env.storage().instance().set(&Symbol::new(&env, "symbol"), &symbol);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, "admin")).unwrap();
        admin.require_auth();

        let balance_key = (Symbol::new(&env, "balance"), to.clone());
        let balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        env.storage().persistent().set(&balance_key, &(balance + amount));

        env.events().publish(
            (Symbol::new(&env, "mint"), to),
            amount,
        );
    }

    pub fn balance(env: Env, user: Address) -> i128 {
        let balance_key = (Symbol::new(&env, "balance"), user);
        env.storage().persistent().get(&balance_key).unwrap_or(0)
    }
}
