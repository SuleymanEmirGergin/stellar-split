use soroban_sdk::{Address, Env, Map, Vec};

use crate::types::Settlement;

/// Greedy min-transaction borç grafı çözüm algoritması.
///
/// Net bakiyeleri alır, borçluları ve alacaklıları ayırır,
/// en büyük borçlu ile en büyük alacaklıyı eşleştirerek
/// minimum sayıda transfer üretir.
///
/// Garanti: N kişi için en fazla N-1 transfer.
pub fn compute_optimal_settlements(env: &Env, balances: &Map<Address, i128>) -> Vec<Settlement> {
    let mut settlements: Vec<Settlement> = Vec::new(env);

    // Borçluları ve alacaklıları ayır
    let mut debtors: Vec<(Address, i128)> = Vec::new(env);   // negatif bakiyeli (borçlu)
    let mut creditors: Vec<(Address, i128)> = Vec::new(env);  // pozitif bakiyeli (alacaklı)

    for key in balances.keys() {
        let balance = balances.get(key.clone()).unwrap();
        if balance < 0 {
            debtors.push_back((key, -balance)); // pozitife çevir, borç miktarı
        } else if balance > 0 {
            creditors.push_back((key, balance));
        }
        // balance == 0 olan kişiler zaten tasfiye olmuş, atla
    }

    // Greedy eşleştirme
    let mut d_idx: u32 = 0;
    let mut c_idx: u32 = 0;

    // Mutable bakiyeler için kopyalar
    let mut d_amounts: Vec<i128> = Vec::new(env);
    let mut c_amounts: Vec<i128> = Vec::new(env);
    for i in 0..debtors.len() {
        d_amounts.push_back(debtors.get(i).unwrap().1);
    }
    for i in 0..creditors.len() {
        c_amounts.push_back(creditors.get(i).unwrap().1);
    }

    while d_idx < debtors.len() && c_idx < creditors.len() {
        let d_remaining = d_amounts.get(d_idx).unwrap();
        let c_remaining = c_amounts.get(c_idx).unwrap();

        let transfer_amount = if d_remaining < c_remaining {
            d_remaining
        } else {
            c_remaining
        };

        if transfer_amount > 0 {
            settlements.push_back(Settlement {
                from: debtors.get(d_idx).unwrap().0,
                to: creditors.get(c_idx).unwrap().0,
                amount: transfer_amount,
            });
        }

        // Bakiyeleri güncelle
        let new_d = d_remaining - transfer_amount;
        let new_c = c_remaining - transfer_amount;
        d_amounts.set(d_idx, new_d);
        c_amounts.set(c_idx, new_c);

        if new_d == 0 {
            d_idx += 1;
        }
        if new_c == 0 {
            c_idx += 1;
        }
    }

    settlements
}
