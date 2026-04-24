#![no_std]

use soroban_sdk::{contract, contractimpl, token, Address, Env, IntoVal, Map, String, Symbol, Vec};
// Path B (direct pair.swap) replaced the router-based auth-tree approach, so
// no `authorize_as_current_contract` imports are needed.

mod settle;
mod storage;
mod types;

use settle::compute_optimal_settlements;
use storage::{
    get_expense, get_expenses_count, get_group, get_next_expense_id, get_next_group_id,
    is_group_settled, remove_expense, save_expense, save_group, set_expenses_count, set_group_settled,
    set_next_expense_id, set_next_group_id,
    get_guardian_config, save_guardian_config, get_recovery_request, save_recovery_request,
    get_savings_pool, save_savings_pool,
    is_referred, set_referred, get_reward_token, set_reward_token_addr,
    get_admin_addr, set_admin_addr,
    // `get_swap_router` intentionally not imported on Path B — only the
    // setter is used so post-deploy wiring stays available for a future
    // router-based hop (silenced via `#[allow(dead_code)]` on the getter).
    set_swap_router_addr,
    get_swap_factory, set_swap_factory_addr,
};
use types::{Expense, Group, Settlement, GuardianConfig, RecoveryRequest, Vault, SavingsPool};

// Stellar native token (XLM) SAC adresi — testnet
// Gerçek deployda env üzerinden alınabilir.
const MAX_GROUP_NAME_LEN: u32 = 64;
const MIN_MEMBERS: u32 = 2;

#[contract]
pub struct StellarSplitContract;

#[contractimpl]
impl StellarSplitContract {
    // ─────────────────────────────────────────────
    //  GRUP OLUŞTURMA
    // ─────────────────────────────────────────────

    /// Yeni bir grup oluşturur.
    /// Validasyonlar: isim uzunluğu, minimum 2 üye, duplicate üye kontrolü.
    /// Döndürdüğü değer: group_id
    pub fn create_group(env: Env, creator: Address, name: String, members: Vec<Address>, token: Address) -> u64 {
        creator.require_auth();

        // ── Validasyonlar ──

        // İsim boş olmamalı
        if name.is_empty() {
            panic!("group name cannot be empty");
        }
        // İsim çok uzun olmamalı
        if name.len() > MAX_GROUP_NAME_LEN {
            panic!("group name too long (max 64 chars)");
        }

        // Creator'ı ekle (yoksa)
        let mut all_members = members.clone();
        let mut creator_found = false;
        for i in 0..all_members.len() {
            if all_members.get(i).unwrap() == creator {
                creator_found = true;
                break;
            }
        }
        if !creator_found {
            all_members.push_back(creator.clone());
        }

        // Minimum üye sayısı
        if all_members.len() < MIN_MEMBERS {
            panic!("at least 2 members required");
        }

        // Duplicate üye kontrolü
        for i in 0..all_members.len() {
            for j in (i + 1)..all_members.len() {
                if all_members.get(i).unwrap() == all_members.get(j).unwrap() {
                    panic!("duplicate member detected");
                }
            }
        }

        // ── Oluştur & Kaydet ──
        let group_id = get_next_group_id(&env);
        let group = Group {
            id: group_id,
            name,
            members: all_members,
            token,
            expense_count: 0,
        };

        save_group(&env, group_id, &group);
        set_next_group_id(&env, group_id + 1);
        set_expenses_count(&env, group_id, 0);

        // ── Event Yayınla ──
        env.events().publish(
            (Symbol::new(&env, "group_created"), group_id),
            creator,
        );

        group_id
    }

    // ─────────────────────────────────────────────
    //  HARCAMA EKLEME
    // ─────────────────────────────────────────────

    /// Gruba yeni bir harcama ekler.
    /// Validasyonlar: pozitif tutar, payer grupta, split_among grupta, boş olmayan split.
    pub fn add_expense(
        env: Env,
        group_id: u64,
        payer: Address,
        amount: i128,
        split_among: Vec<Address>,
        description: String,
        category: String,
    ) -> u64 {
        payer.require_auth();

        // Grup var mı + settled kontrolü
        let group = get_group(&env, group_id);

        if is_group_settled(&env, group_id) {
            panic!("group is already settled");
        }

        // Payer grupta mı
        let mut payer_in_group = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == payer {
                payer_in_group = true;
                break;
            }
        }
        if !payer_in_group {
            panic!("payer is not a member of the group");
        }

        // Amount pozitif olmalı
        if amount <= 0 {
            panic!("amount must be positive");
        }

        // split_among boş olmamalı
        if split_among.is_empty() {
            panic!("split_among cannot be empty");
        }

        // split_among içindeki herkes grupta olmalı
        for i in 0..split_among.len() {
            let addr = split_among.get(i).unwrap();
            let mut found = false;
            for j in 0..group.members.len() {
                if group.members.get(j).unwrap() == addr {
                    found = true;
                    break;
                }
            }
            if !found {
                panic!("split_among contains non-member");
            }
        }

        let expense_id = get_next_expense_id(&env, group_id);
        let expense = Expense {
            id: expense_id,
            payer: payer.clone(),
            amount,
            split_among,
            description,
            category,
        };

        save_expense(&env, group_id, expense_id, &expense);
        set_next_expense_id(&env, group_id, expense_id + 1);

        // Expense count güncelle (storage + Group struct böylece get_group doğru sayıyı döner)
        let count = get_expenses_count(&env, group_id);
        set_expenses_count(&env, group_id, count + 1);
        let mut group = get_group(&env, group_id);
        group.expense_count = get_next_expense_id(&env, group_id);
        save_group(&env, group_id, &group);

        // ── Event Yayınla ──
        env.events().publish(
            (Symbol::new(&env, "expense_added"), group_id, expense_id),
            (payer, amount),
        );

        expense_id
    }

    // ─────────────────────────────────────────────
    //  SON HARCAMAYI İPTAL (sadece ödeyen, settle öncesi)
    // ─────────────────────────────────────────────

    /// Son eklenen harcamayı iptal eder. Sadece o harcamayı ekleyen (payer) çağırabilir; grup settle edilmemiş olmalı.
    pub fn cancel_last_expense(env: Env, group_id: u64, caller: Address) {
        caller.require_auth();

        if is_group_settled(&env, group_id) {
            panic!("group is already settled");
        }

        let next_id = get_next_expense_id(&env, group_id);
        if next_id == 0 {
            panic!("no expenses to cancel");
        }

        let last_id = next_id - 1;
        let expense = get_expense(&env, group_id, last_id);
        if expense.payer != caller {
            panic!("only the payer can cancel this expense");
        }

        remove_expense(&env, group_id, last_id);
        set_next_expense_id(&env, group_id, last_id);

        let count = get_expenses_count(&env, group_id);
        set_expenses_count(&env, group_id, count - 1);
        let mut group = get_group(&env, group_id);
        group.expense_count = get_next_expense_id(&env, group_id);
        save_group(&env, group_id, &group);

        env.events().publish(
            (Symbol::new(&env, "expense_cancelled"), group_id, last_id),
            caller,
        );
    }

    // ─────────────────────────────────────────────
    //  ÜYE EKLEME / ÇIKARMA (sadece settle öncesi)
    // ─────────────────────────────────────────────

    /// Gruba yeni üye ekler. Sadece mevcut üyeler çağırabilir; grup settle edilmemiş olmalı.
    pub fn add_member(env: Env, group_id: u64, caller: Address, new_member: Address) {
        caller.require_auth();

        if is_group_settled(&env, group_id) {
            panic!("group is already settled");
        }

        let mut group = get_group(&env, group_id);
        let mut caller_in_group = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == caller {
                caller_in_group = true;
                break;
            }
        }
        if !caller_in_group {
            panic!("only a member can add someone");
        }

        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == new_member {
                panic!("address is already a member");
            }
        }

        group.members.push_back(new_member.clone());
        save_group(&env, group_id, &group);

        env.events().publish(
            (Symbol::new(&env, "member_added"), group_id),
            new_member,
        );
    }

    /// Gruptan üye çıkarır. Sadece mevcut üyeler çağırabilir; en az 2 üye kalmalı.
    pub fn remove_member(env: Env, group_id: u64, caller: Address, member_to_remove: Address) {
        caller.require_auth();

        if is_group_settled(&env, group_id) {
            panic!("group is already settled");
        }

        let mut group = get_group(&env, group_id);
        let mut caller_in_group = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == caller {
                caller_in_group = true;
                break;
            }
        }
        if !caller_in_group {
            panic!("only a member can remove someone");
        }
        if group.members.len() <= MIN_MEMBERS {
            panic!("cannot remove: at least 2 members required");
        }

        let mut new_members = Vec::new(&env);
        for i in 0..group.members.len() {
            let m = group.members.get(i).unwrap();
            if m != member_to_remove {
                new_members.push_back(m);
            }
        }
        if new_members.len() == group.members.len() {
            panic!("address is not a member");
        }
        group.members = new_members;
        save_group(&env, group_id, &group);

        env.events().publish(
            (Symbol::new(&env, "member_removed"), group_id),
            member_to_remove,
        );
    }

    // ─────────────────────────────────────────────
    //  BAKİYE HESAPLAMA
    // ─────────────────────────────────────────────

    /// Gruptaki herkesin net bakiyesini hesaplar.
    /// Pozitif = alacaklı, Negatif = borçlu
    pub fn get_balances(env: Env, group_id: u64) -> Map<Address, i128> {
        let _group = get_group(&env, group_id);
        let expense_count = get_next_expense_id(&env, group_id);
        let mut balances: Map<Address, i128> = Map::new(&env);

        for eid in 0..expense_count {
            let expense = get_expense(&env, group_id, eid);
            let share = expense.amount / (expense.split_among.len() as i128);

            // Payer alacaklı olur (ödediği miktar - kendi payı)
            let payer_current = balances.get(expense.payer.clone()).unwrap_or(0);
            balances.set(expense.payer.clone(), payer_current + expense.amount - share);

            // Her split üyesi borçlanır
            for j in 0..expense.split_among.len() {
                let member = expense.split_among.get(j).unwrap();
                if member != expense.payer {
                    let current = balances.get(member.clone()).unwrap_or(0);
                    balances.set(member, current - share);
                }
            }
        }

        balances
    }

    // ─────────────────────────────────────────────
    //  UZLAŞMA PLANI
    // ─────────────────────────────────────────────

    /// Optimal uzlaşma planını hesaplar.
    /// Greedy min-transaction algoritması kullanır.
    pub fn compute_settlements(env: Env, group_id: u64) -> Vec<Settlement> {
        let balances = Self::get_balances(env.clone(), group_id);
        compute_optimal_settlements(&env, &balances)
    }

    // ─────────────────────────────────────────────
    //  GERÇEK SETTLEMENT (XLM TRANSFER)
    // ─────────────────────────────────────────────

    /// Grubu settle eder: optimal transferleri hesaplar ve
    /// Stellar native token (XLM) SAC üzerinden gerçek transferleri yapar.
    ///
    /// Her borçlu kişinin bu contract'a `require_auth` vermiş olması gerekir.
    /// `token_address`: XLM SAC contract adresi (testnet'te friendbot'tan alınır)
    pub fn settle_group(
        env: Env,
        group_id: u64,
        settler: Address,
    ) -> Vec<Settlement> {
        settler.require_auth();

        // Zaten settle edilmişse kabul etme
        if is_group_settled(&env, group_id) {
            panic!("group is already settled");
        }

        // Settlement planını hesapla
        let settlements = Self::compute_settlements(env.clone(), group_id);

        // SAC token client oluştur
        let group = get_group(&env, group_id);
        let token_client = token::Client::new(&env, &group.token);

        // Her transfer için: from kişisi authorize etmeli
        for i in 0..settlements.len() {
            let s = settlements.get(i).unwrap();
            // Borçlu kişinin auth'u gerekli
            s.from.require_auth();
            // SAC üzerinden transfer yap
            token_client.transfer(&s.from, &s.to, &s.amount);
        }

        // ── Reward Users with SPLT (Inter-contract call) ──
        // In a real scenario, the reward_token_id would be stored in the Group or Global state.
        // Here we use a dummy address if not provided, or skip if not found.
        let reward_token_id = group.token.clone(); // Self-rewarding for demo or dedicated token
        
        // We reward the settler for initiating the transaction
        let reward_amount = 100_i128; // 100 SPLT
        env.invoke_contract::<()>(
            &reward_token_id,
            &soroban_sdk::Symbol::new(&env, "mint"),
            soroban_sdk::vec![&env, settler.into_val(&env), reward_amount.into_val(&env)],
        );

        // Grubu settled olarak işaretle
        set_group_settled(&env, group_id, true);

        // ── Event Yayınla ──
        env.events().publish(
            (Symbol::new(&env, "group_settled"), group_id),
            settlements.len(),
        );

        env.events().publish(
            (Symbol::new(&env, "reward_minted"), settler.clone()),
            reward_amount,
        );

        settlements
    }

    // ─────────────────────────────────────────────
    //  REFERRAL REWARDS
    // ─────────────────────────────────────────────

    // ─────────────────────────────────────────────
    //  ADMIN INIT (one-shot)
    // ─────────────────────────────────────────────

    /// Kontrat admin adresini bir kere set eder. Sonraki çağrılar panic.
    /// `set_reward_token` (ve ileride eklenecek admin-only entrypoint'ler) bu
    /// adresi referans alır. Tipik akış: deploy → `init_admin(deployer)`.
    ///
    /// `admin.require_auth()` — istenmeden üçüncü bir taraf tarafından set
    /// edilmesini engeller (on-chain replay + front-run koruması).
    pub fn init_admin(env: Env, admin: Address) {
        admin.require_auth();

        if get_admin_addr(&env).is_some() {
            panic!("admin already initialised");
        }

        set_admin_addr(&env, &admin);

        env.events().publish(
            (Symbol::new(&env, "admin_initialised"), admin.clone()),
            admin,
        );
    }

    /// Kayıtlı admin adresini döner (testler + UI için).
    pub fn get_admin(env: Env) -> Option<Address> {
        get_admin_addr(&env)
    }

    /// Reward token contract adresini kaydeder.
    ///
    /// Güvenlik:
    ///   - `admin.require_auth()` — imza zorunlu.
    ///   - Stored admin kontrolü — çağıran adres kontrat admin'i olmak
    ///     zorunda. Aksi halde "only admin" panic.
    ///   - `init_admin` önceden çağrılmış olmalı; değilse "not initialised"
    ///     panic. Bu `None` unwrap'inden daha net bir hata mesajıdır.
    pub fn set_reward_token(env: Env, admin: Address, token: Address) {
        admin.require_auth();

        // ── Admin guard ──
        let stored_admin = get_admin_addr(&env)
            .expect("contract not initialised — call init_admin first");
        if admin != stored_admin {
            panic!("only admin can set reward token");
        }

        set_reward_token_addr(&env, &token);

        env.events().publish(
            (Symbol::new(&env, "reward_token_set"), admin),
            token,
        );
    }

    // ─────────────────────────────────────────────
    //  MULTI-CURRENCY SETUP (Soroswap wiring)
    // ─────────────────────────────────────────────

    /// Soroswap-compatible AMM router adresini kaydeder.
    /// `settle_group_flex` multi-currency settle'larında bu router'a
    /// `swap_exact_tokens_for_tokens` çağrısı atılır.
    ///
    /// Admin-guarded — aynı pattern `set_reward_token` ile (stored-admin
    /// equality check + require_auth).
    ///
    /// Testnet Soroswap router: `CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD`
    pub fn set_swap_router(env: Env, admin: Address, router: Address) {
        admin.require_auth();

        let stored_admin = get_admin_addr(&env)
            .expect("contract not initialised — call init_admin first");
        if admin != stored_admin {
            panic!("only admin can set swap router");
        }

        set_swap_router_addr(&env, &router);

        env.events().publish(
            (Symbol::new(&env, "swap_router_set"), admin),
            router,
        );
    }

    /// Soroswap factory adresini kaydeder. `settle_group_flex` multi-currency
    /// settle sırasında `factory.get_pair(src, dst)` ile pool adresini
    /// keşfedip Soroban auth tree'ye nested `transfer(contract, pool, …)` için
    /// ön-yetki verir — bu olmadan recording-mode matcher call'u reddeder.
    ///
    /// Testnet factory: `CDP3HMUH6SMS3S7NPGNDJLULCOXXEPSHY4JKUKMBNQMATHDHWXRRJTBY`
    pub fn set_swap_factory(env: Env, admin: Address, factory: Address) {
        admin.require_auth();

        let stored_admin = get_admin_addr(&env)
            .expect("contract not initialised — call init_admin first");
        if admin != stored_admin {
            panic!("only admin can set swap factory");
        }

        set_swap_factory_addr(&env, &factory);

        env.events().publish(
            (Symbol::new(&env, "swap_factory_set"), admin),
            factory,
        );
    }

    // ─────────────────────────────────────────────
    //  MULTI-CURRENCY SETTLE (settle_group_flex)
    // ─────────────────────────────────────────────

    /// Grubu settle eder; `destination_asset` ile farklı bir SAC verildiğinde
    /// Soroswap pair'i üzerinden **doğrudan** swap yapıp creditor'a deliver eder
    /// (Path B — router bypass).
    ///
    /// Semantics:
    ///   - `destination_asset` None veya `group.token` ile aynı → normal
    ///     same-currency path (davranış `settle_group` ile birebir).
    ///   - `destination_asset` farklı bir SAC → multi-currency swap path:
    ///     1. Debtor → contract (pull source asset)
    ///     2. `factory.get_pair(src, dst)` ile pair adresini keşfet
    ///     3. `pair.token_0()` + `pair.get_reserves()` → doğru reserve_in / reserve_out
    ///     4. Constant-product + 0.3% fee ile amount_out hesapla
    ///     5. `source_token.transfer(contract → pair, amount_in)` — contract
    ///        doğrudan caller, sub-auth gerekmez
    ///     6. `pair.swap(amount_0_out, amount_1_out, to=creditor)` — contract
    ///        doğrudan caller, swap içindeki `token.transfer(pair, creditor, …)`
    ///        pair'in kendi auth'u ile yürür
    ///
    /// ## Neden Path B (router bypass)
    /// Önceki C1 girişiminde (router + `authorize_as_current_contract` +
    /// nested SubContractInvocation) Soroban'ın recording-mode matcher'ı
    /// Soroswap router'ının iç çağrı şekliyle eşleşmedi (2026-04-24 testnet
    /// deploy'da 18-event diagnostic zinciri + "[recording authorization
    /// only] encountered unauthorized call" reject ile doğrulandı).
    ///
    /// Path B bu sorunu tamamen atlar: her çağrıyı contract **doğrudan**
    /// yapar, dolayısıyla hiç `authorize_as_current_contract` gerekmez —
    /// Soroban invoker'ı caller'ı otomatik otorize eder.
    ///
    /// ## Router hala yapılandırılmalı mı?
    /// Hayır — Path B router'a hiç bakmaz; sadece factory + pair üzerinden
    /// çalışır. `set_swap_router` entrypoint'i retained — ileride farklı
    /// router'a geçiş / slippage quote için faydalı.
    ///
    /// Factory MUST be configured via `set_swap_factory` before invoking
    /// the multi-currency path; missing config panics with a clear ops msg.
    pub fn settle_group_flex(
        env: Env,
        group_id: u64,
        settler: Address,
        destination_asset: Option<Address>,
    ) -> Vec<Settlement> {
        settler.require_auth();

        if is_group_settled(&env, group_id) {
            panic!("group is already settled");
        }

        let settlements = Self::compute_settlements(env.clone(), group_id);
        let group = get_group(&env, group_id);
        let source_token = group.token.clone();

        // Multi-currency path only engages if a different SAC is requested.
        let target_asset: Option<Address> = match destination_asset.clone() {
            Some(a) if a != source_token => Some(a),
            _ => None,
        };

        // Path B requires factory (pool discovery + token_0 query). Router is
        // NOT needed on this path — kept only for forward-compat with router-
        // based quotes / alt AMMs in a future iteration.
        if target_asset.is_some() && get_swap_factory(&env).is_none() {
            panic!("swap factory not configured — call set_swap_factory first");
        }

        let token_client = token::Client::new(&env, &source_token);
        let self_addr = env.current_contract_address();

        for i in 0..settlements.len() {
            let s = settlements.get(i).unwrap();
            s.from.require_auth();

            if let Some(ref dest) = target_asset {
                // ── Path B: router bypass via direct pair.swap ──

                // Step 1: pull debtor's source-asset into the contract.
                token_client.transfer(&s.from, &self_addr, &s.amount);

                // Step 2: pool discovery via factory.get_pair.
                let factory_id: Address = get_swap_factory(&env).unwrap();
                let pool_addr: Address = env.invoke_contract(
                    &factory_id,
                    &Symbol::new(&env, "get_pair"),
                    soroban_sdk::vec![
                        &env,
                        source_token.clone().into_val(&env),
                        dest.clone().into_val(&env),
                    ],
                );

                // Step 3: figure out reserve ordering by asking the pair
                // which token it stored as token_0. Pairs sort tokens
                // lexicographically on creation, so the answer is stable.
                let token_0: Address = env.invoke_contract(
                    &pool_addr,
                    &Symbol::new(&env, "token_0"),
                    soroban_sdk::vec![&env],
                );
                let reserves: Vec<i128> = env.invoke_contract(
                    &pool_addr,
                    &Symbol::new(&env, "get_reserves"),
                    soroban_sdk::vec![&env],
                );
                let reserve_0 = reserves.get(0).unwrap();
                let reserve_1 = reserves.get(1).unwrap();
                let source_is_token_0 = token_0 == source_token;
                let (reserve_in, reserve_out) = if source_is_token_0 {
                    (reserve_0, reserve_1)
                } else {
                    (reserve_1, reserve_0)
                };

                // Step 4: constant-product + 0.3% fee (Uniswap-V2 standard).
                //   amount_out = (amount_in * 997 * reserve_out)
                //              / (reserve_in * 1000 + amount_in * 997)
                // All checked to fail loudly on any arithmetic edge case.
                let amount_in_with_fee = s.amount
                    .checked_mul(997_i128)
                    .expect("path B: amount_in_with_fee overflow");
                let numerator = amount_in_with_fee
                    .checked_mul(reserve_out)
                    .expect("path B: numerator overflow");
                let denominator = reserve_in
                    .checked_mul(1000_i128)
                    .and_then(|x| x.checked_add(amount_in_with_fee))
                    .expect("path B: denominator overflow");
                let amount_out = numerator
                    .checked_div(denominator)
                    .expect("path B: amount_out div failed");
                if amount_out <= 0 {
                    panic!("path B: computed amount_out is non-positive");
                }

                // Step 5: send source tokens directly to the pair. Contract
                // is the direct caller here — no `authorize_as_current_
                // contract` dance needed, Soroban auto-auths the invoker.
                token_client.transfer(&self_addr, &pool_addr, &s.amount);

                // Step 6: call pair.swap(amount_0_out, amount_1_out, to).
                // Exactly one of the two amounts is zero — the non-zero
                // amount is the side we WANT to receive (destination).
                let (amount_0_out, amount_1_out): (i128, i128) = if source_is_token_0 {
                    (0_i128, amount_out)
                } else {
                    (amount_out, 0_i128)
                };
                env.invoke_contract::<()>(
                    &pool_addr,
                    &Symbol::new(&env, "swap"),
                    soroban_sdk::vec![
                        &env,
                        amount_0_out.into_val(&env),
                        amount_1_out.into_val(&env),
                        s.to.clone().into_val(&env),
                    ],
                );

                // Step 7: emit per-settlement diagnostic so operators can
                // correlate amount_in / amount_out / pool on Stellar Expert.
                env.events().publish(
                    (Symbol::new(&env, "pair_swap"), group_id),
                    (pool_addr.clone(), s.amount, amount_out),
                );
            } else {
                // ── Same-currency path (identical to settle_group) ──
                token_client.transfer(&s.from, &s.to, &s.amount);
            }
        }

        // Reward settler — same shape as settle_group. Uses the globally-
        // configured reward token; falls back to group.token for backward
        // compatibility with pre-init_admin deploys (unit tests exercise this).
        //
        // ⚠️ Best-effort: SPLT token contracts deployed with a different admin
        // than this contract will fail on `admin.require_auth()` inside mint.
        // We treat reward mint as a nice-to-have — a swap that delivered USDC
        // to the creditor shouldn't be rolled back because a cosmetic reward
        // leg failed. `try_invoke_contract` returns Ok/Err and we emit either
        // `reward_minted` or `reward_mint_failed` accordingly.
        let reward_token_id = get_reward_token(&env).unwrap_or_else(|| group.token.clone());
        let reward_amount: i128 = 100;
        let mint_result = env.try_invoke_contract::<(), soroban_sdk::Error>(
            &reward_token_id,
            &Symbol::new(&env, "mint"),
            soroban_sdk::vec![&env, settler.clone().into_val(&env), reward_amount.into_val(&env)],
        );

        set_group_settled(&env, group_id, true);

        env.events().publish(
            (Symbol::new(&env, "group_settled"), group_id),
            settlements.len(),
        );
        match mint_result {
            Ok(Ok(())) => {
                env.events().publish(
                    (Symbol::new(&env, "reward_minted"), settler.clone()),
                    reward_amount,
                );
            }
            _ => {
                // Cosmetic reward leg failed (usually SPLT admin mismatch).
                // Don't poison the whole settle — log and move on.
                env.events().publish(
                    (Symbol::new(&env, "reward_mint_failed"), settler.clone()),
                    reward_amount,
                );
            }
        }
        if let Some(ref dest) = target_asset {
            env.events().publish(
                (Symbol::new(&env, "multi_currency_settle"), group_id),
                (source_token.clone(), dest.clone()),
            );
        }

        settlements
    }

    /// Davet eden kişiye 5 SPLT mint eder (inter-contract call) ve
    /// `newcomer`'ı "referred" olarak işaretler.
    ///
    /// Koşullar:
    ///   - `newcomer` require_auth vermeli (abuse önlemek için).
    ///   - `inviter == newcomer` ise panic — self-referral yok.
    ///   - `newcomer` daha önce referred ise panic — tek defa geçerli.
    ///
    /// Eğer `RewardToken` storage'da set edilmemişse mint çağrısı atlanır
    /// (unit test / ön-setup deployment durumu). Referral kaydı yine de
    /// tutulur — ikinci çağrıda panic edeceği için idempotency korunur.
    pub fn register_referral(env: Env, inviter: Address, newcomer: Address) {
        newcomer.require_auth();

        if inviter == newcomer {
            panic!("self-referral not allowed");
        }
        if is_referred(&env, &newcomer) {
            panic!("newcomer already referred");
        }

        set_referred(&env, &newcomer);

        let reward_amount: i128 = 5;

        if let Some(token) = get_reward_token(&env) {
            env.invoke_contract::<()>(
                &token,
                &Symbol::new(&env, "mint"),
                soroban_sdk::vec![&env, inviter.clone().into_val(&env), reward_amount.into_val(&env)],
            );
        }

        env.events().publish(
            (Symbol::new(&env, "referral_rewarded"), inviter.clone()),
            (newcomer, reward_amount),
        );
    }

    // ─────────────────────────────────────────────
    //  GETTER'LAR
    // ─────────────────────────────────────────────

    /// Grup bilgisini döndürür.
    pub fn get_group(env: Env, group_id: u64) -> Group {
        get_group(&env, group_id)
    }

    /// Belirli bir harcamayı döndürür.
    pub fn get_expense(env: Env, group_id: u64, expense_id: u64) -> Expense {
        get_expense(&env, group_id, expense_id)
    }

    /// Grubun settle durumunu döndürür.
    pub fn is_settled(env: Env, group_id: u64) -> bool {
        is_group_settled(&env, group_id)
    }

    // ─────────────────────────────────────────────
    //  GÜVENLİK & KURTARMA (GUARDIANS)
    // ─────────────────────────────────────────────

    /// Kullanıcının vasilerini ve onay eşiğini belirler.
    pub fn set_guardians(env: Env, user: Address, guardians: Vec<Address>, threshold: u32) {
        user.require_auth();

        if guardians.is_empty() {
            panic!("at least one guardian required");
        }
        if threshold == 0 || threshold > guardians.len() {
            panic!("invalid threshold");
        }

        let config = GuardianConfig {
            user: user.clone(),
            guardians,
            threshold,
        };

        save_guardian_config(&env, &user, &config);

        env.events().publish(
            (Symbol::new(&env, "guardians_set"), user),
            threshold,
        );
    }

    /// Bir vasi tarafından hesap kurtarma süreci başlatılır.
    pub fn initiate_recovery(env: Env, guardian: Address, target: Address, new_address: Address) {
        guardian.require_auth();

        let config = get_guardian_config(&env, &target).expect("no guardians set for target");
        
        // Çağıran kişi vasi mi?
        let mut is_guardian = false;
        for i in 0..config.guardians.len() {
            if config.guardians.get(i).unwrap() == guardian {
                is_guardian = true;
                break;
            }
        }
        if !is_guardian {
            panic!("caller is not a guardian");
        }

        // Mevcut bir talep var mı? Varsa ve tamamlanmamışsa hata ver (veya üzerine yaz).
        // Burada basitçe yeni talep oluşturuyoruz.
        let mut approvals = Vec::new(&env);
        approvals.push_back(guardian.clone());

        let request = RecoveryRequest {
            target: target.clone(),
            new_address,
            approvals,
            status: 0u32, // Pending
        };

        save_recovery_request(&env, &target, &request);

        env.events().publish(
            (Symbol::new(&env, "recovery_initiated"), target),
            guardian,
        );
    }

    /// Diğer vasiler kurtarma isteğini onaylar.
    pub fn approve_recovery(env: Env, guardian: Address, target: Address) {
        guardian.require_auth();

        let mut request = get_recovery_request(&env, &target).expect("no active recovery request");
        if request.status != 0 {
            panic!("recovery request is not pending");
        }

        let config = get_guardian_config(&env, &target).expect("no guardians set for target");

        // Çağıran kişi vasi mi?
        let mut is_guardian = false;
        for i in 0..config.guardians.len() {
            if config.guardians.get(i).unwrap() == guardian {
                is_guardian = true;
                break;
            }
        }
        if !is_guardian {
            panic!("caller is not a guardian");
        }

        // Zaten onaylamış mı?
        for i in 0..request.approvals.len() {
            if request.approvals.get(i).unwrap() == guardian {
                panic!("already approved");
            }
        }

        request.approvals.push_back(guardian);

        // Eşik değerine ulaşıldı mı?
        if request.approvals.len() >= config.threshold {
            request.status = 1u32; // Completed
            // GerçekAA cüzdanı olsaydı burada anahtar değişimi yapılırdı. 
            // Bu simülasyonda sadece durumu işaretliyoruz.
        }

        save_recovery_request(&env, &target, &request);

        env.events().publish(
            (Symbol::new(&env, "recovery_approved"), target),
            request.status,
        );
    }

    pub fn get_guardians(env: Env, user: Address) -> Option<GuardianConfig> {
        get_guardian_config(&env, &user)
    }

    pub fn get_recovery(env: Env, user: Address) -> Option<RecoveryRequest> {
        get_recovery_request(&env, &user)
    }

    // ─────────────────────────────────────────────
    //  DEFI YIELD (VAULT)
    // ─────────────────────────────────────────────

    pub fn stake(env: Env, group_id: u64, caller: Address, amount: i128) {
        caller.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let group = get_group(&env, group_id);
        
        let mut is_member = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == caller {
                is_member = true;
                break;
            }
        }
        if !is_member {
            panic!("only members can stake");
        }

        let token_client = token::Client::new(&env, &group.token);
        token_client.transfer(&caller, &env.current_contract_address(), &amount);

        let mut vault = storage::get_vault(&env, group_id);
        vault = Self::compute_yield(&env, vault);

        // ── Overflow-safe: vault.total_staked + amount ──
        vault.total_staked = vault
            .total_staked
            .checked_add(amount)
            .expect("stake: total_staked overflow");
        vault.active = true;
        storage::save_vault(&env, group_id, &vault);

        env.events().publish((Symbol::new(&env, "vault_staked"), group_id), amount);
    }

    pub fn withdraw(env: Env, group_id: u64, caller: Address, amount: i128) {
        caller.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let group = get_group(&env, group_id);
        
        let mut is_member = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == caller {
                is_member = true;
                break;
            }
        }
        if !is_member {
            panic!("only members can withdraw");
        }

        let mut vault = storage::get_vault(&env, group_id);
        vault = Self::compute_yield(&env, vault);

        // ── Overflow-safe balance check ──
        let total_balance = vault
            .total_staked
            .checked_add(vault.yield_earned)
            .expect("withdraw: vault balance overflow");
        if total_balance < amount {
            panic!("insufficient vault balance");
        }

        let token_client = token::Client::new(&env, &group.token);
        token_client.transfer(&env.current_contract_address(), &caller, &amount);

        if vault.yield_earned >= amount {
            vault.yield_earned = vault
                .yield_earned
                .checked_sub(amount)
                .expect("withdraw: yield_earned underflow");
        } else {
            let remainder = amount
                .checked_sub(vault.yield_earned)
                .expect("withdraw: remainder underflow");
            vault.yield_earned = 0;
            vault.total_staked = vault
                .total_staked
                .checked_sub(remainder)
                .expect("withdraw: total_staked underflow");
        }

        if vault.total_staked == 0 {
            vault.active = false;
        }

        storage::save_vault(&env, group_id, &vault);

        env.events().publish((Symbol::new(&env, "vault_withdrawn"), group_id), amount);
    }

    pub fn donate_yield(env: Env, group_id: u64, caller: Address, amount: i128, donation_address: Address) {
        caller.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let group = get_group(&env, group_id);
        
        let mut is_member = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == caller {
                is_member = true;
                break;
            }
        }
        if !is_member {
            panic!("only members can donate yield");
        }

        let mut vault = storage::get_vault(&env, group_id);
        vault = Self::compute_yield(&env, vault);
        
        if vault.yield_earned < amount {
            panic!("insufficient yield to donate");
        }

        // Send yield to donation address
        let token_client = token::Client::new(&env, &group.token);
        token_client.transfer(&env.current_contract_address(), &donation_address, &amount);

        // Deduct from yield earned (checked — caller-supplied amount).
        vault.yield_earned = vault
            .yield_earned
            .checked_sub(amount)
            .expect("donate_yield: yield_earned underflow");
        vault.total_donated = vault
            .total_donated
            .checked_add(amount)
            .expect("donate_yield: total_donated overflow");

        storage::save_vault(&env, group_id, &vault);

        env.events().publish((Symbol::new(&env, "yield_donated"), group_id), amount);
    }

    pub fn get_vault(env: Env, group_id: u64) -> Vault {
        let vault = storage::get_vault(&env, group_id);
        Self::compute_yield(&env, vault)
    }

    fn compute_yield(env: &Env, mut vault: Vault) -> Vault {
        if !vault.active || vault.total_staked <= 0 {
            vault.last_update = env.ledger().timestamp();
            return vault;
        }
        let now = env.ledger().timestamp();
        let diff_secs = now.saturating_sub(vault.last_update);
        if diff_secs > 0 {
            // Mock APY: 7.5% → yield = total_staked * 75 * diff_secs / (1000 * 31_536_000)
            //
            // Overflow posture: each intermediate product is `checked_mul`'d so
            // a pathological combination of very large stake + very long idle
            // window fails loudly instead of wrapping. Divisor is a non-zero
            // constant so `checked_div` cannot `None`, but we still use it for
            // uniformity.
            let yearly_secs: i128 = 31_536_000;
            let diff_i128 = diff_secs as i128;

            let numerator = vault
                .total_staked
                .checked_mul(75_i128)
                .and_then(|x| x.checked_mul(diff_i128))
                .expect("compute_yield: numerator overflow");
            let denominator: i128 = 1000_i128
                .checked_mul(yearly_secs)
                .expect("compute_yield: denominator overflow");
            let yield_new = numerator
                .checked_div(denominator)
                .expect("compute_yield: division failed");

            vault.yield_earned = vault
                .yield_earned
                .checked_add(yield_new)
                .expect("compute_yield: yield_earned overflow");
            vault.last_update = now;
        }
        vault
    }

    // ─────────────────────────────────────────────
    //  GAMIFICATION & BADGES
    // ─────────────────────────────────────────────

    pub fn award_badge(env: Env, user: Address, badge_id: u32) {
        // Normalde bu fonksiyon contract admini tarafından veya otomatik kurallarla çağrılır.
        // Hackathon demosu için kişinin kendisinin mint etmesine izin veriyoruz.
        user.require_auth(); 
        let mut user_badges = storage::get_user_badges(&env, &user);
        
        let mut has_badge = false;
        for i in 0..user_badges.badges.len() {
            if user_badges.badges.get(i).unwrap() == badge_id {
                has_badge = true;
                break;
            }
        }

        if !has_badge {
            user_badges.badges.push_back(badge_id);
            storage::save_user_badges(&env, &user, &user_badges);
            env.events().publish(
                (Symbol::new(&env, "badge_awarded"), user),
                badge_id,
            );
        }
    }

    pub fn get_badges(env: Env, user: Address) -> Vec<u32> {
        let user_badges = storage::get_user_badges(&env, &user);
        user_badges.badges
    }

    // ─────────────────────────────────────────────
    //  SAVINGS POOL (KUMBARA)
    // ─────────────────────────────────────────────

    /// Grupta bir tasarruf havuzu (kumbara) oluşturur.
    /// Her grup için yalnızca bir aktif havuz olabilir.
    /// goal_amount: hedef tutar (stroops). deadline: Unix timestamp (0 = süresiz).
    pub fn create_savings_pool(
        env: Env,
        group_id: u64,
        creator: Address,
        goal_amount: i128,
        deadline: u64,
    ) -> SavingsPool {
        creator.require_auth();

        if goal_amount <= 0 {
            panic!("goal amount must be positive");
        }

        // Creator grupta mı?
        let group = get_group(&env, group_id);
        let mut creator_in_group = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == creator {
                creator_in_group = true;
                break;
            }
        }
        if !creator_in_group {
            panic!("creator is not a group member");
        }

        // Zaten aktif bir havuz var mı?
        if let Some(existing) = get_savings_pool(&env, group_id) {
            if existing.status == 0 {
                panic!("group already has an active savings pool");
            }
        }

        // Deadline kontrol: 0 ise süresiz; değilse gelecekte olmalı
        if deadline > 0 && deadline <= env.ledger().timestamp() {
            panic!("deadline must be in the future");
        }

        let pool = SavingsPool {
            group_id,
            goal_amount,
            current_amount: 0,
            deadline,
            status: 0,
            creator: creator.clone(),
        };

        save_savings_pool(&env, group_id, &pool);

        env.events().publish(
            (Symbol::new(&env, "pool_created"), group_id),
            (creator, goal_amount, deadline),
        );

        pool
    }

    /// Savings pool'a katkı ekler. Token transferini gerçekleştirir.
    /// Katkı yapan kişi grupta olmalı; havuz aktif olmalı.
    pub fn contribute_pool(
        env: Env,
        group_id: u64,
        contributor: Address,
        amount: i128,
    ) -> SavingsPool {
        contributor.require_auth();

        if amount <= 0 {
            panic!("contribution amount must be positive");
        }

        // Contributor grupta mı?
        let group = get_group(&env, group_id);
        let mut in_group = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == contributor {
                in_group = true;
                break;
            }
        }
        if !in_group {
            panic!("contributor is not a group member");
        }

        let mut pool = get_savings_pool(&env, group_id).expect("no savings pool for this group");

        if pool.status != 0 {
            panic!("savings pool is not active");
        }

        // Token transferi: contributor → contract
        let token_client = token::Client::new(&env, &group.token);
        token_client.transfer(&contributor, &env.current_contract_address(), &amount);

        pool.current_amount = pool
            .current_amount
            .checked_add(amount)
            .expect("contribute_pool: current_amount overflow");

        // Hedef tutuldu mu? Otomatik complete.
        if pool.current_amount >= pool.goal_amount {
            pool.status = 1; // Completed
            env.events().publish(
                (Symbol::new(&env, "pool_goal_reached"), group_id),
                pool.current_amount,
            );
        }

        save_savings_pool(&env, group_id, &pool);

        env.events().publish(
            (Symbol::new(&env, "pool_contributed"), group_id),
            (contributor, amount),
        );

        pool
    }

    /// Savings pool'u serbest bırakır (release).
    /// Biriken tutarı üyelere eşit dağıtır.
    /// Status 0 (Active) veya 1 (Completed) ise çağrılabilir.
    /// Sadece pool creator'ı veya goal tamamlanmışsa herhangi bir üye çağırabilir.
    pub fn release_pool(
        env: Env,
        group_id: u64,
        caller: Address,
    ) -> i128 {
        caller.require_auth();

        let group = get_group(&env, group_id);

        // Caller grupta mı?
        let mut in_group = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == caller {
                in_group = true;
                break;
            }
        }
        if !in_group {
            panic!("caller is not a group member");
        }

        let mut pool = get_savings_pool(&env, group_id).expect("no savings pool for this group");

        if pool.status == 2 {
            panic!("savings pool is already cancelled");
        }

        // Sadece creator veya goal tamamlanmışsa herkes release edebilir
        if pool.status == 0 && pool.creator != caller {
            panic!("only the creator can release an active pool before goal is reached");
        }

        let total = pool.current_amount;
        if total <= 0 {
            pool.status = 2; // Cancelled — empty pool
            save_savings_pool(&env, group_id, &pool);
            return 0;
        }

        // Üyelere eşit dağıt — member_count is u32 upgraded to i128; positive and bounded.
        let member_count = group.members.len() as i128;
        let share = total.checked_div(member_count).expect("release_pool: share div failed");
        let distributed = share
            .checked_mul(member_count)
            .expect("release_pool: distributed overflow");
        let remainder = total
            .checked_sub(distributed)
            .expect("release_pool: remainder underflow");

        let token_client = token::Client::new(&env, &group.token);

        for i in 0..group.members.len() {
            let member = group.members.get(i).unwrap();
            let mut member_share = share;
            // Kalan stroops'u ilk üyeye ver
            if i == 0 {
                member_share = member_share
                    .checked_add(remainder)
                    .expect("release_pool: member_share overflow");
            }
            if member_share > 0 {
                token_client.transfer(&env.current_contract_address(), &member, &member_share);
            }
        }

        pool.current_amount = 0;
        pool.status = 1; // Completed
        save_savings_pool(&env, group_id, &pool);

        env.events().publish(
            (Symbol::new(&env, "pool_released"), group_id),
            (caller, total),
        );

        total
    }

    /// Savings pool bilgisini döndürür.
    pub fn get_savings_pool(env: Env, group_id: u64) -> Option<SavingsPool> {
        storage::get_savings_pool(&env, group_id)
    }
}

#[cfg(test)]
mod test;
