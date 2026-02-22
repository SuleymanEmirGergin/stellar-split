use soroban_sdk::{contracttype, Address, String, Vec};

/// Bir gruptaki üyeleri ve harcama sayısını tutar.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Group {
    pub id: u64,
    pub name: String,
    pub members: Vec<Address>,
    pub token: Address,
    pub expense_count: u64,
}

/// Tek bir harcamayı temsil eder.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Expense {
    pub id: u64,
    pub payer: Address,
    pub amount: i128,
    pub split_among: Vec<Address>,
    pub description: String,
    /// Kategori: yemek, ulasim, konaklama, eglence, market, diger vb.
    pub category: String,
}

/// Bir uzlaşma transferini temsil eder.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Settlement {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}

/// Vasi (Guardian) yapılandırması.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct GuardianConfig {
    pub user: Address,
    pub guardians: Vec<Address>,
    pub threshold: u32,
}

/// Kurtarma (Recovery) talebi.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RecoveryRequest {
    pub target: Address,
    pub new_address: Address,
    pub approvals: Vec<Address>,
    pub status: u32, // 0: Pending, 1: Completed, 2: Cancelled
}

/// Grup Kasası (DeFi Staking / Vault)
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Vault {
    pub total_staked: i128,
    pub yield_earned: i128,
    pub total_donated: i128,
    pub last_update: u64, // timestamp
    pub active: bool,
}

/// Kullanıcı Rozetleri (Gamification / NFT Başarımları)
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct UserBadges {
    // Rozetleri u32 ID olarak tutabiliriz. 
    // Örn: 1 -> Hızlı Ödeyici, 2 -> Makbuz Avcısı, 3 -> Balina Staker
    pub badges: Vec<u32>,
}

/// Storage key'leri için enum.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NextGroupId,
    Group(u64),
    NextExpenseId(u64),
    ExpensesCount(u64),
    Expense(u64, u64),     // (group_id, expense_id)
    GroupSettled(u64),      // Grup settle edildi mi (bool)
    Guardian(Address),      // Kullanıcının vasi yapılandırması
    Recovery(Address),      // Kullanıcının aktif kurtarma talebi
    GroupVault(u64),        // Sadece bir gruba ait Vault
    UserBadges(Address),    // Kullanıcının rozetleri
}
