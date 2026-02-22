use soroban_sdk::{Address, Env, Vec};

use crate::types::{DataKey, Expense, Group, GuardianConfig, RecoveryRequest, Vault, UserBadges};

// ── TTL Sabitleri ──
// Soroban'da persistent storage girişleri süresi dolar.
// LIFETIME_THRESHOLD: TTL bu değerin altına düşünce uzatma tetiklenir.
// BUMP_AMOUNT: TTL bu kadar ledger ileriye uzatılır.
const LIFETIME_THRESHOLD: u32 = 17_280; // ~1 gün (5 saniye/ledger)
const BUMP_AMOUNT: u32 = 518_400;       // ~30 gün

/// TTL'yi güvenli şekilde uzatır — sadece key varsa çağrılmalı.
fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
}

// ── Group ID Counter ──

/// Bir sonraki group ID'yi döndürür (yoksa 0).
pub fn get_next_group_id(env: &Env) -> u64 {
    let key = DataKey::NextGroupId;
    env.storage().persistent().get(&key).unwrap_or(0)
    // TTL bump yok — key henüz yaratılmamış olabilir.
    // set fonksiyonunda bump yapılır.
}

/// Bir sonraki group ID'yi kaydeder.
pub fn set_next_group_id(env: &Env, id: u64) {
    let key = DataKey::NextGroupId;
    env.storage().persistent().set(&key, &id);
    bump_persistent(env, &key);
}

// ── Group CRUD ──

/// Grubu kaydeder.
pub fn save_group(env: &Env, group_id: u64, group: &Group) {
    let key = DataKey::Group(group_id);
    env.storage().persistent().set(&key, group);
    bump_persistent(env, &key);
}

/// Grubu okur (yoksa panic).
pub fn get_group(env: &Env, group_id: u64) -> Group {
    let key = DataKey::Group(group_id);
    let group: Group = env
        .storage()
        .persistent()
        .get(&key)
        .expect("group not found");
    bump_persistent(env, &key);
    group
}

// ── Expense ID Counter ──

/// Bir sonraki expense ID'yi döndürür.
pub fn get_next_expense_id(env: &Env, group_id: u64) -> u64 {
    let key = DataKey::NextExpenseId(group_id);
    env.storage().persistent().get(&key).unwrap_or(0)
    // TTL bump yok — key henüz yaratılmamış olabilir.
}

/// Bir sonraki expense ID'yi kaydeder.
pub fn set_next_expense_id(env: &Env, group_id: u64, id: u64) {
    let key = DataKey::NextExpenseId(group_id);
    env.storage().persistent().set(&key, &id);
    bump_persistent(env, &key);
}

// ── Expense Count ──

/// Expense sayısını döndürür.
pub fn get_expenses_count(env: &Env, group_id: u64) -> u64 {
    let key = DataKey::ExpensesCount(group_id);
    env.storage().persistent().get(&key).unwrap_or(0)
    // TTL bump yok — key henüz yaratılmamış olabilir.
}

/// Expense sayısını kaydeder.
pub fn set_expenses_count(env: &Env, group_id: u64, count: u64) {
    let key = DataKey::ExpensesCount(group_id);
    env.storage().persistent().set(&key, &count);
    bump_persistent(env, &key);
}

// ── Expense CRUD ──

/// Harcamayı kaydeder.
pub fn save_expense(env: &Env, group_id: u64, expense_id: u64, expense: &Expense) {
    let key = DataKey::Expense(group_id, expense_id);
    env.storage().persistent().set(&key, expense);
    bump_persistent(env, &key);
}

/// Harcamayı okur (yoksa panic).
pub fn get_expense(env: &Env, group_id: u64, expense_id: u64) -> Expense {
    let key = DataKey::Expense(group_id, expense_id);
    let expense: Expense = env
        .storage()
        .persistent()
        .get(&key)
        .expect("expense not found");
    bump_persistent(env, &key);
    expense
}

/// Son eklenen harcamayı siler (sadece cancel_last_expense tarafından kullanılır).
pub fn remove_expense(env: &Env, group_id: u64, expense_id: u64) {
    let key = DataKey::Expense(group_id, expense_id);
    env.storage().persistent().remove(&key);
}

// ── Settlement Status ──

/// Grup settle edilmiş mi kontrol eder.
pub fn is_group_settled(env: &Env, group_id: u64) -> bool {
    let key = DataKey::GroupSettled(group_id);
    env.storage().persistent().get(&key).unwrap_or(false)
    // TTL bump yok — key henüz yaratılmamış olabilir.
}

/// Grubu settled olarak işaretler.
pub fn set_group_settled(env: &Env, group_id: u64, settled: bool) {
    let key = DataKey::GroupSettled(group_id);
    env.storage().persistent().set(&key, &settled);
    bump_persistent(env, &key);
}

// ── Guardian & Recovery ──

pub fn save_guardian_config(env: &Env, user: &Address, config: &GuardianConfig) {
    let key = DataKey::Guardian(user.clone());
    env.storage().persistent().set(&key, config);
    bump_persistent(env, &key);
}

pub fn get_guardian_config(env: &Env, user: &Address) -> Option<GuardianConfig> {
    let key = DataKey::Guardian(user.clone());
    env.storage().persistent().get(&key)
}

pub fn save_recovery_request(env: &Env, user: &Address, request: &RecoveryRequest) {
    let key = DataKey::Recovery(user.clone());
    env.storage().persistent().set(&key, request);
    bump_persistent(env, &key);
}

pub fn get_recovery_request(env: &Env, user: &Address) -> Option<RecoveryRequest> {
    let key = DataKey::Recovery(user.clone());
    env.storage().persistent().get(&key)
}

pub fn remove_recovery_request(env: &Env, user: &Address) {
    let key = DataKey::Recovery(user.clone());
    env.storage().persistent().remove(&key);
}

// ── Vault ──

pub fn save_vault(env: &Env, group_id: u64, vault: &Vault) {
    let key = DataKey::GroupVault(group_id);
    env.storage().persistent().set(&key, vault);
    bump_persistent(env, &key);
}

pub fn get_vault(env: &Env, group_id: u64) -> Vault {
    let key = DataKey::GroupVault(group_id);
    match env.storage().persistent().get(&key) {
        Some(v) => {
            bump_persistent(env, &key);
            v
        },
        None => Vault {
            total_staked: 0,
            yield_earned: 0,
            total_donated: 0,
            last_update: env.ledger().timestamp(),
            active: false,
        }
    }
}

// ── Badges ──

pub fn save_user_badges(env: &Env, user: &Address, badges: &UserBadges) {
    let key = DataKey::UserBadges(user.clone());
    env.storage().persistent().set(&key, badges);
    bump_persistent(env, &key);
}

pub fn get_user_badges(env: &Env, user: &Address) -> UserBadges {
    let key = DataKey::UserBadges(user.clone());
    match env.storage().persistent().get(&key) {
        Some(b) => {
            bump_persistent(env, &key);
            b
        },
        None => UserBadges {
            badges: Vec::new(env),
        }
    }
}
