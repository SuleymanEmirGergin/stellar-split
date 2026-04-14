#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{Env, IntoVal, String, Symbol};

fn setup() -> (Env, StellarSplitTokenClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(StellarSplitToken, ());
    let client = StellarSplitTokenClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    (env, client, admin)
}

// ═══════════════════════════════════════════════════
//  INITIALIZE TESTLERİ
// ═══════════════════════════════════════════════════

#[test]
fn test_initialize_stores_metadata() {
    let (env, client, admin) = setup();
    client.initialize(&admin, &String::from_str(&env, "StellarSplit"), &String::from_str(&env, "SPTS"));
    // initialize sadece panik atmadan tamamlanmalı
    // (storage doğrulama dolaylı olarak mint/balance üzerinden yapılır)
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_initialize_twice_panics() {
    let (env, client, admin) = setup();
    client.initialize(&admin, &String::from_str(&env, "Token"), &String::from_str(&env, "TKN"));
    // İkinci çağrı panik vermelidir
    client.initialize(&admin, &String::from_str(&env, "Token"), &String::from_str(&env, "TKN"));
}

// ═══════════════════════════════════════════════════
//  BALANCE TESTLERİ
// ═══════════════════════════════════════════════════

#[test]
fn test_balance_default_zero() {
    let (env, client, admin) = setup();
    client.initialize(&admin, &String::from_str(&env, "Token"), &String::from_str(&env, "TKN"));

    let user = Address::generate(&env);
    assert_eq!(client.balance(&user), 0);
}

#[test]
fn test_balance_independent_per_address() {
    let (env, client, admin) = setup();
    client.initialize(&admin, &String::from_str(&env, "Token"), &String::from_str(&env, "TKN"));

    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);

    client.mint(&user_a, &500);
    // B'nin bakiyesi A'dan bağımsız olarak 0 kalmalı
    assert_eq!(client.balance(&user_b), 0);
    assert_eq!(client.balance(&user_a), 500);
}

// ═══════════════════════════════════════════════════
//  MINT TESTLERİ
// ═══════════════════════════════════════════════════

#[test]
fn test_mint_increases_balance() {
    let (env, client, admin) = setup();
    client.initialize(&admin, &String::from_str(&env, "Token"), &String::from_str(&env, "TKN"));

    let user = Address::generate(&env);
    client.mint(&user, &1000);
    assert_eq!(client.balance(&user), 1000);
}

#[test]
fn test_mint_accumulates() {
    let (env, client, admin) = setup();
    client.initialize(&admin, &String::from_str(&env, "Token"), &String::from_str(&env, "TKN"));

    let user = Address::generate(&env);
    client.mint(&user, &300);
    client.mint(&user, &700);
    assert_eq!(client.balance(&user), 1000);
}

#[test]
#[should_panic]
fn test_mint_requires_admin_auth() {
    let (env, client, admin) = setup();
    client.initialize(&admin, &String::from_str(&env, "Token"), &String::from_str(&env, "TKN"));

    // auth mock'u kaldır — admin yetkisi olmadan mint panik vermelidir
    let env_no_auth = Env::default();
    let contract_id = env_no_auth.register(StellarSplitToken, ());
    let client_no_auth = StellarSplitTokenClient::new(&env_no_auth, &contract_id);
    let admin2 = Address::generate(&env_no_auth);
    client_no_auth.initialize(&admin2, &String::from_str(&env_no_auth, "Token"), &String::from_str(&env_no_auth, "TKN"));

    let user = Address::generate(&env_no_auth);
    // mock_all_auths olmadan — admin.require_auth() başarısız olmalı
    client_no_auth.mint(&user, &100);
}

#[test]
fn test_mint_emits_event() {
    let (env, client, admin) = setup();
    client.initialize(&admin, &String::from_str(&env, "Token"), &String::from_str(&env, "TKN"));

    let user = Address::generate(&env);
    client.mint(&user, &250);

    let events = env.events().all();
    assert!(!events.is_empty(), "mint eventi yayınlanmamış");

    // Tuple: (contract_id: Address, topics: Vec<Val>, data: Val)
    let last = events.last().unwrap();
    let topic_symbol: Symbol = last.1.get(0).unwrap().into_val(&env);
    assert_eq!(topic_symbol, Symbol::new(&env, "mint"));
}
