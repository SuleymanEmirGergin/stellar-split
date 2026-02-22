#![no_std]

use soroban_sdk::{contract, contractimpl, token, Address, Env, Map, String, Symbol, Vec};

mod settle;
mod storage;
mod types;

use settle::compute_optimal_settlements;
use storage::{
    get_expense, get_expenses_count, get_group, get_next_expense_id, get_next_group_id,
    is_group_settled, remove_expense, save_expense, save_group, set_expenses_count, set_group_settled,
    set_next_expense_id, set_next_group_id,
    get_guardian_config, save_guardian_config, get_recovery_request, save_recovery_request, remove_recovery_request
};
use types::{Expense, Group, Settlement, GuardianConfig, RecoveryRequest, Vault};

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
        if name.len() == 0 {
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

        // Grubu settled olarak işaretle
        set_group_settled(&env, group_id, true);

        // ── Event Yayınla ──
        env.events().publish(
            (Symbol::new(&env, "group_settled"), group_id),
            settlements.len(),
        );

        settlements
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

        if guardians.len() == 0 {
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
        if request.approvals.len() as u32 >= config.threshold {
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
        
        vault.total_staked += amount;
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
        
        if vault.total_staked + vault.yield_earned < amount {
            panic!("insufficient vault balance");
        }

        let token_client = token::Client::new(&env, &group.token);
        token_client.transfer(&env.current_contract_address(), &caller, &amount);

        if vault.yield_earned >= amount {
            vault.yield_earned -= amount;
        } else {
            let remainder = amount - vault.yield_earned;
            vault.yield_earned = 0;
            vault.total_staked -= remainder;
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

        // Deduct from yield earned
        vault.yield_earned -= amount;
        vault.total_donated += amount;

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
            // Mock APY: 7.5%
            // yield = total_staked * 7.5 / 100 * (diff_secs / 31_536_000)
            // yield = total_staked * 75 * diff_secs / (1000 * 31_536_000)
            let yearly_secs = 31_536_000_u64;
            let yield_new = (vault.total_staked * 75_i128 * (diff_secs as i128)) / (1000_i128 * (yearly_secs as i128));
            vault.yield_earned += yield_new;
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
}

#[cfg(test)]
mod test;
