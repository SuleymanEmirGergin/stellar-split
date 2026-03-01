# StellarSplit — Contract API Özeti

Kontrat fonksiyonları ve frontend kullanımı. Detay için `contracts/stellar_split/src/lib.rs` ve `frontend/src/lib/contract.ts` kaynaklarına bakın.

---

## Yazma (auth gerekli)

| Fonksiyon | Parametreler | Dönüş | Açıklama |
|-----------|--------------|--------|-----------|
| `create_group` | creator, name, members, token | group_id (u64) | Yeni grup; en az 2 üye; creator otomatik eklenir. |
| `add_expense` | group_id, payer, amount, split_among, description, category | expense_id (u64) | Harcama ekler; payer grupta olmalı; amount > 0; split_among grupta olmalı. |
| `cancel_expense` | group_id, expense_id, caller | — | Sadece payer iptal edebilir. |
| `add_member` | group_id, new_member, caller | — | Çağıran üye olmalı. |
| `remove_member` | group_id, address, caller | — | En az 2 üye kalmalı. |
| `settle_group` | group_id, settler | Vec\<Settlement\> | Optimal transferleri hesaplar, XLM SAC ile transferleri yapar; grubu settled işaretler. |
| `set_guardians` | user, guardians, threshold | — | Kullanıcının vasileri ve eşik. |
| `initiate_recovery` | guardian, target, new_address | — | Vasi kurtarma başlatır. |
| `approve_recovery` | guardian, target | — | Vasi onayı; eşik dolunca tamamlanır. |

---

## Okuma (auth yok)

| Fonksiyon | Parametreler | Dönüş |
|-----------|--------------|--------|
| `get_group` | group_id | Group |
| `get_expense` | group_id, expense_id | Expense |
| `get_balances` | group_id | Map\<Address, i128\> (net bakiye) |
| `compute_settlements` | group_id | Vec\<Settlement\> (sadece hesaplama, transfer yok) |
| `is_settled` | group_id | bool |
| `get_guardians` | user | Option\<GuardianConfig\> |
| `get_recovery` | user | Option\<RecoveryRequest\> |

---

## Frontend kullanımı

- **contract.ts** kontratı `buildTx` + `signAndSubmit` / `readOnly` ile çağırır.
- Demo Mode açıksa (`stellarsplit_demo_mode` localStorage) tüm çağrılar mock’lanır; gerçek RPC kullanılmaz.
- Grup listesi, bakiye, settlements ve event senkronizasyonu `useGroupQuery` ve `subscribeGroupEvents` ile yönetilir.

---

## Tipler (özet)

- **Group:** id, name, creator, members, token, expense_count
- **Expense:** id, payer, amount, split_among, description, category
- **Settlement:** from, to, amount

Network (Testnet/Mainnet) ve contract ID `frontend/.env` ve `VITE_*` değişkenleri ile belirlenir.
