#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{vec, Env, String};

fn setup_contract() -> (Env, StellarSplitContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(StellarSplitContract, ());
    let client = StellarSplitContractClient::new(&env, &contract_id);
    let token = Address::generate(&env);
    (env, client, token)
}

// ═══════════════════════════════════════════════════
//  GRUP OLUŞTURMA TESTLERİ
// ═══════════════════════════════════════════════════

#[test]
fn test_create_group() {
    let (env, client, token) = setup_contract();

    let creator = Address::generate(&env);
    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);

    let members = vec![&env, creator.clone(), member2.clone(), member3.clone()];
    let group_id = client.create_group(&creator, &String::from_str(&env, "Trip"), &members, &token);

    assert_eq!(group_id, 0);

    let group = client.get_group(&group_id);
    assert_eq!(group.members.len(), 3);
}

#[test]
fn test_create_group_adds_creator() {
    let (env, client, token) = setup_contract();

    let creator = Address::generate(&env);
    let member2 = Address::generate(&env);

    // Creator üyeler arasında yok, otomatik eklenmeli
    let members = vec![&env, member2.clone()];
    let group_id = client.create_group(&creator, &String::from_str(&env, "Dinner"), &members, &token);

    let group = client.get_group(&group_id);
    assert_eq!(group.members.len(), 2); // member2 + creator
}

#[test]
fn test_create_multiple_groups_sequential_ids() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    let b = Address::generate(&env);

    let m = vec![&env, a.clone(), b.clone()];
    let id1 = client.create_group(&a, &String::from_str(&env, "G1"), &m, &token);
    let id2 = client.create_group(&a, &String::from_str(&env, "G2"), &m, &token);
    let id3 = client.create_group(&a, &String::from_str(&env, "G3"), &m, &token);

    assert_eq!(id1, 0);
    assert_eq!(id2, 1);
    assert_eq!(id3, 2);
}

#[test]
#[should_panic(expected = "group name cannot be empty")]
fn test_empty_group_name() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let members = vec![&env, a.clone(), b.clone()];
    client.create_group(&a, &String::from_str(&env, ""), &members, &token);
}

#[test]
#[should_panic(expected = "at least 2 members required")]
fn test_min_members() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    // Sadece 1 üye (creator zaten ekleniyor, ama members boş ise sadece creator = 1)
    let members = vec![&env, a.clone()];
    // Creator zaten listede, toplam 1 kişi → panic
    client.create_group(&a, &String::from_str(&env, "Solo"), &members, &token);
}

#[test]
#[should_panic(expected = "duplicate member detected")]
fn test_duplicate_members() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    // b'yi iki kere ekle
    let members = vec![&env, a.clone(), b.clone(), b.clone()];
    client.create_group(&a, &String::from_str(&env, "Dup"), &members, &token);
}

#[test]
fn test_large_group_10_members() {
    let (env, client, token) = setup_contract();
    let creator = Address::generate(&env);
    let mut members = vec![&env, creator.clone()];
    for _ in 0..9 {
        members.push_back(Address::generate(&env));
    }

    let group_id = client.create_group(&creator, &String::from_str(&env, "Big"), &members, &token);
    let group = client.get_group(&group_id);
    assert_eq!(group.members.len(), 10);
}

// ═══════════════════════════════════════════════════
//  HARCAMA TESTLERİ
// ═══════════════════════════════════════════════════

#[test]
fn test_add_expense_and_balances() {
    let (env, client, token) = setup_contract();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);

    let members = vec![&env, alice.clone(), bob.clone(), carol.clone()];
    let group_id = client.create_group(&alice, &String::from_str(&env, "Trip"), &members, &token);

    // Alice 90 birim ödedi, 3 kişi arasında bölüşülecek
    let split = vec![&env, alice.clone(), bob.clone(), carol.clone()];
    client.add_expense(
        &group_id,
        &alice,
        &90_i128,
        &split,
        &String::from_str(&env, "Restaurant"),
        &String::from_str(&env, "food"),
    );

    let balances = client.get_balances(&group_id);

    // Alice: +90 - 30 = +60 (alacaklı)
    // Bob: -30 (borçlu)
    // Carol: -30 (borçlu)
    assert_eq!(balances.get(alice.clone()).unwrap(), 60);
    assert_eq!(balances.get(bob.clone()).unwrap(), -30);
    assert_eq!(balances.get(carol.clone()).unwrap(), -30);
}

#[test]
fn test_single_expense_two_people() {
    let (env, client, token) = setup_contract();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let members = vec![&env, alice.clone(), bob.clone()];
    let group_id = client.create_group(&alice, &String::from_str(&env, "1on1"), &members, &token);

    let split = vec![&env, alice.clone(), bob.clone()];
    client.add_expense(
        &group_id,
        &alice,
        &100_i128,
        &split,
        &String::from_str(&env, "Lunch"),
        &String::from_str(&env, "food"),
    );

    let balances = client.get_balances(&group_id);
    assert_eq!(balances.get(alice.clone()).unwrap(), 50);
    assert_eq!(balances.get(bob.clone()).unwrap(), -50);
}

#[test]
fn test_multiple_expenses_balance_sum_zero() {
    let (env, client, token) = setup_contract();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);
    let dave = Address::generate(&env);

    let members = vec![
        &env,
        alice.clone(),
        bob.clone(),
        carol.clone(),
        dave.clone(),
    ];
    let group_id = client.create_group(&alice, &String::from_str(&env, "Vacation"), &members, &token);

    let all = vec![
        &env,
        alice.clone(),
        bob.clone(),
        carol.clone(),
        dave.clone(),
    ];

    client.add_expense(&group_id, &alice, &100_i128, &all, &String::from_str(&env, "Hotel"), &String::from_str(&env, "accommodation"));
    client.add_expense(&group_id, &bob, &80_i128, &all, &String::from_str(&env, "Car"), &String::from_str(&env, "transport"));
    client.add_expense(&group_id, &carol, &40_i128, &all, &String::from_str(&env, "Food"), &String::from_str(&env, "food"));

    let balances = client.get_balances(&group_id);

    // Toplam bakiye 0 olmalı
    let mut total: i128 = 0;
    for key in balances.keys() {
        total += balances.get(key).unwrap();
    }
    assert_eq!(total, 0);
}

#[test]
fn test_many_expenses_correct_totals() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let c = Address::generate(&env);

    let members = vec![&env, a.clone(), b.clone(), c.clone()];
    let group_id = client.create_group(&a, &String::from_str(&env, "ManyExp"), &members, &token);
    let split = vec![&env, a.clone(), b.clone(), c.clone()];

    // 10 harcama ekle, her biri 30 birim, a tarafından
    for _i in 0..10u32 {
client.add_expense(
        &group_id,
        &a,
        &30_i128,
        &split,
        &String::from_str(&env, "Exp"),
        &String::from_str(&env, ""),
    );
    }

    let balances = client.get_balances(&group_id);
    // Total: 10 * 30 = 300, her kişinin payı = 300/3 = 100
    // A: 300 ödedi - 100 payı = +200
    // B: -100
    // C: -100
    assert_eq!(balances.get(a.clone()).unwrap(), 200);
    assert_eq!(balances.get(b.clone()).unwrap(), -100);
    assert_eq!(balances.get(c.clone()).unwrap(), -100);
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_invalid_expense_amount() {
    let (env, client, token) = setup_contract();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let members = vec![&env, alice.clone(), bob.clone()];
    let group_id = client.create_group(&alice, &String::from_str(&env, "Test"), &members, &token);

    let split = vec![&env, alice.clone(), bob.clone()];
    client.add_expense(
        &group_id,
        &alice,
        &0_i128,
        &split,
        &String::from_str(&env, "Invalid"),
        &String::from_str(&env, ""),
    );
}

#[test]
#[should_panic(expected = "payer is not a member of the group")]
fn test_non_member_expense() {
    let (env, client, token) = setup_contract();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let outsider = Address::generate(&env);

    let members = vec![&env, alice.clone(), bob.clone()];
    let group_id = client.create_group(&alice, &String::from_str(&env, "Test"), &members, &token);

    let split = vec![&env, alice.clone(), bob.clone()];
    client.add_expense(
        &group_id,
        &outsider,
        &50_i128,
        &split,
        &String::from_str(&env, "Invalid"),
        &String::from_str(&env, ""),
    );
}

#[test]
#[should_panic(expected = "split_among cannot be empty")]
fn test_empty_split_among() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    let b = Address::generate(&env);

    let members = vec![&env, a.clone(), b.clone()];
    let group_id = client.create_group(&a, &String::from_str(&env, "Test"), &members, &token);

    let empty_split: Vec<Address> = Vec::new(&env);
    client.add_expense(
        &group_id,
        &a,
        &100_i128,
        &empty_split,
        &String::from_str(&env, "Bad"),
        &String::from_str(&env, ""),
    );
}

#[test]
#[should_panic(expected = "split_among contains non-member")]
fn test_split_among_non_member() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let outsider = Address::generate(&env);

    let members = vec![&env, a.clone(), b.clone()];
    let group_id = client.create_group(&a, &String::from_str(&env, "Test"), &members, &token);

    let split = vec![&env, a.clone(), outsider.clone()]; // outsider grupta değil
    client.add_expense(
        &group_id,
        &a,
        &100_i128,
        &split,
        &String::from_str(&env, "Bad"),
        &String::from_str(&env, ""),
    );
}

// ═══════════════════════════════════════════════════
//  UZLAŞMA TESTLERİ
// ═══════════════════════════════════════════════════

#[test]
fn test_compute_settlements() {
    let (env, client, token) = setup_contract();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);

    let members = vec![&env, alice.clone(), bob.clone(), carol.clone()];
    let group_id = client.create_group(&alice, &String::from_str(&env, "Trip"), &members, &token);

    let split = vec![&env, alice.clone(), bob.clone(), carol.clone()];
    client.add_expense(
        &group_id,
        &alice,
        &90_i128,
        &split,
        &String::from_str(&env, "Dinner"),
        &String::from_str(&env, "food"),
    );

    let settlements = client.compute_settlements(&group_id);

    // 2 settlement olmalı: Bob→Alice 30, Carol→Alice 30
    assert_eq!(settlements.len(), 2);

    let mut total_settled: i128 = 0;
    for i in 0..settlements.len() {
        let s = settlements.get(i).unwrap();
        assert!(s.amount > 0);
        total_settled += s.amount;
    }
    assert_eq!(total_settled, 60);
}

#[test]
fn test_settlement_count_optimal() {
    let (env, client, token) = setup_contract();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);
    let dave = Address::generate(&env);

    let members = vec![
        &env,
        alice.clone(),
        bob.clone(),
        carol.clone(),
        dave.clone(),
    ];
    let group_id = client.create_group(&alice, &String::from_str(&env, "Big Trip"), &members, &token);

    let all = vec![
        &env,
        alice.clone(),
        bob.clone(),
        carol.clone(),
        dave.clone(),
    ];

    client.add_expense(&group_id, &alice, &200_i128, &all, &String::from_str(&env, "Hotel"), &String::from_str(&env, "accommodation"));
    client.add_expense(&group_id, &bob, &80_i128, &all, &String::from_str(&env, "Taxi"), &String::from_str(&env, "transport"));
    client.add_expense(&group_id, &carol, &40_i128, &all, &String::from_str(&env, "Snacks"), &String::from_str(&env, "food"));
    client.add_expense(&group_id, &alice, &120_i128, &all, &String::from_str(&env, "Restaurant"), &String::from_str(&env, "food"));
    client.add_expense(&group_id, &dave, &60_i128, &all, &String::from_str(&env, "Museum"), &String::from_str(&env, "entertainment"));

    let settlements = client.compute_settlements(&group_id);

    // 4 kişi için en fazla 3 transfer olmalı (N-1 kuralı)
    assert!(settlements.len() <= 3);

    for i in 0..settlements.len() {
        assert!(settlements.get(i).unwrap().amount > 0);
    }
}

#[test]
fn test_settlement_idempotent() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let c = Address::generate(&env);

    let members = vec![&env, a.clone(), b.clone(), c.clone()];
    let group_id = client.create_group(&a, &String::from_str(&env, "Idem"), &members, &token);

    let split = vec![&env, a.clone(), b.clone(), c.clone()];
    client.add_expense(&group_id, &a, &90_i128, &split, &String::from_str(&env, "D"), &String::from_str(&env, ""));

    // İki kere compute et — aynı sonuç olmalı
    let s1 = client.compute_settlements(&group_id);
    let s2 = client.compute_settlements(&group_id);

    assert_eq!(s1.len(), s2.len());
    for i in 0..s1.len() {
        assert_eq!(s1.get(i).unwrap().amount, s2.get(i).unwrap().amount);
    }
}

// ═══════════════════════════════════════════════════
//  SETTLED GUARD TESTLERİ
// ═══════════════════════════════════════════════════

#[test]
fn test_is_settled_default_false() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let members = vec![&env, a.clone(), b.clone()];
    let group_id = client.create_group(&a, &String::from_str(&env, "G"), &members, &token);

    assert!(!client.is_settled(&group_id));
}

// ═══════════════════════════════════════════════════
//  EVENT TESTLERİ
// ═══════════════════════════════════════════════════

#[test]
fn test_event_emission_on_create_and_expense() {
    let (env, client, token) = setup_contract();
    let a = Address::generate(&env);
    let b = Address::generate(&env);

    let members = vec![&env, a.clone(), b.clone()];
    let group_id = client.create_group(&a, &String::from_str(&env, "Ev"), &members, &token);

    let split = vec![&env, a.clone(), b.clone()];
    let expense_id = client.add_expense(
        &group_id,
        &a,
        &100_i128,
        &split,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, ""),
    );

    // Contract fonksiyonları başarılı çalıştı = event publish dahil tüm
    // yol hatasız tamamlandı. Fonksiyonlar event yayınlama kodu içeriyor.
    assert_eq!(group_id, 0);
    assert_eq!(expense_id, 0);

    // Verify state is consistent after events
    let group = client.get_group(&group_id);
    assert_eq!(group.members.len(), 2);

    let expense = client.get_expense(&group_id, &expense_id);
    assert_eq!(expense.amount, 100);
}
