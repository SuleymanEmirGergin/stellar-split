use soroban_sdk::{Address, Env, Vec};

use crate::types::{DataKey, Expense, Group, GuardianConfig, RecoveryRequest, Vault, UserBadges, SavingsPool};

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

// ── Savings Pool ──

pub fn save_savings_pool(env: &Env, group_id: u64, pool: &SavingsPool) {
    let key = DataKey::SavingsPool(group_id);
    env.storage().persistent().set(&key, pool);
    bump_persistent(env, &key);
}

pub fn get_savings_pool(env: &Env, group_id: u64) -> Option<SavingsPool> {
    let key = DataKey::SavingsPool(group_id);
    let result = env.storage().persistent().get(&key);
    if result.is_some() {
        bump_persistent(env, &key);
    }
    result
}

// Reserved for a future "cancel savings pool" contract entrypoint; kept so the
// storage API surface stays symmetrical with `set_savings_pool` / `get_savings_pool`.
#[allow(dead_code)]
pub fn remove_savings_pool(env: &Env, group_id: u64) {
    let key = DataKey::SavingsPool(group_id);
    env.storage().persistent().remove(&key);
}

// ── Referral ──
//
// Idempotency: one reward per newcomer, ever. The `Referred(newcomer)`
// key simply records that someone has already claimed a referral for
// this address; the specific inviter is emitted in the event log and
// doesn't need a composite storage key.

pub fn is_referred(env: &Env, newcomer: &Address) -> bool {
    let key = DataKey::Referred(newcomer.clone());
    env.storage().persistent().get(&key).unwrap_or(false)
}

pub fn set_referred(env: &Env, newcomer: &Address) {
    let key = DataKey::Referred(newcomer.clone());
    env.storage().persistent().set(&key, &true);
    bump_persistent(env, &key);
}

// ── Reward Token ──
//
// Global SPLT reward token address. Set once after deployment via
// `set_reward_token` entrypoint. Unit tests intentionally don't set
// this, so `register_referral` records the referral without hitting
// invoke_contract — invoke_contract on an unregistered address panics
// in test environments even with `mock_all_auths()`.

pub fn get_reward_token(env: &Env) -> Option<Address> {
    let key = DataKey::RewardToken;
    env.storage().instance().get(&key)
}

pub fn set_reward_token_addr(env: &Env, token: &Address) {
    let key = DataKey::RewardToken;
    env.storage().instance().set(&key, token);
}

// ── Admin ──
//
// Single privileged address for guarded entrypoints (`set_reward_token`, and
// future admin-only config). Stored in instance storage so it lives with the
// contract and doesn't require TTL bumps per-address.
//
// Write path: `init_admin(admin)` is callable exactly once — subsequent calls
// panic. Read path: `get_admin(env)` returns `Option<Address>` so callers can
// reject uninitialised state with a clean error rather than a raw unwrap.

pub fn get_admin_addr(env: &Env) -> Option<Address> {
    let key = DataKey::Admin;
    env.storage().instance().get(&key)
}

pub fn set_admin_addr(env: &Env, admin: &Address) {
    let key = DataKey::Admin;
    env.storage().instance().set(&key, admin);
}

// ── Swap Router (Soroswap AMM) ──
//
// Global Soroswap-compatible router contract id. Set post-deployment via
// `set_swap_router` (admin-guarded). Unit tests deliberately leave this
// unset — multi-currency settlements panic with a clear error and the
// same-currency path continues to work without the router.

/// Reserved for forward-compat (router-based hop in a future iteration).
/// Path B's direct-pair swap does not read this value; the setter is kept
/// so post-deploy wiring stays available for an alt-AMM / multi-hop path.
#[allow(dead_code)]
pub fn get_swap_router(env: &Env) -> Option<Address> {
    let key = DataKey::SwapRouter;
    env.storage().instance().get(&key)
}

pub fn set_swap_router_addr(env: &Env, router: &Address) {
    let key = DataKey::SwapRouter;
    env.storage().instance().set(&key, router);
}

// ── Swap Factory (pool discovery + sub-auth) ──
//
// Soroswap factory contract id, used to resolve `(token_a, token_b)` → pair
// address via `get_pair`. The pair address is needed at auth-build time so
// the recording-mode matcher can pre-authorize `transfer(contract, pool, …)`
// inside `settle_group_flex`.

pub fn get_swap_factory(env: &Env) -> Option<Address> {
    let key = DataKey::SwapFactory;
    env.storage().instance().get(&key)
}

pub fn set_swap_factory_addr(env: &Env, factory: &Address) {
    let key = DataKey::SwapFactory;
    env.storage().instance().set(&key, factory);
}

// ── Emergency Pause (circuit-breaker) ──
//
// Stored in instance storage so it is cheap to read on every call.
// When set to `true` all state-mutating entrypoints must panic with
// "contract is paused".  Only the stored admin may flip this flag.

/// Returns `true` if the contract is currently paused.
pub fn is_paused(env: &Env) -> bool {
    let key = DataKey::Paused;
    env.storage().instance().get(&key).unwrap_or(false)
}

/// Sets the paused flag. Call only from admin-guarded entrypoints.
pub fn set_paused(env: &Env, paused: bool) {
    let key = DataKey::Paused;
    env.storage().instance().set(&key, &paused);
}
