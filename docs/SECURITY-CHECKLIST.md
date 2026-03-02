# StellarSplit — Security Checklist (Kontrat)

Kontrat güvenliği ve audit hazırlığı için kontrol listesi. Soroban/Stellar bağlamında uygulanan prensipler (Solidity değil; benzer mantık).

---

## 1. Yetkilendirme (Access control)

| Kontrol | Durum | Not |
|--------|--------|-----|
| `create_group` | ✅ | `creator.require_auth()` |
| `add_expense` | ✅ | `payer.require_auth()` |
| `cancel_expense` | ✅ | Sadece payer iptal edebilir |
| `add_member` / `remove_member` | ✅ | Çağıran üye olmalı |
| `settle_group` | ✅ | `settler.require_auth()`; her transfer için `s.from.require_auth()` |
| `set_guardians` | ✅ | `user.require_auth()` |
| `initiate_recovery` | ✅ | `guardian.require_auth()`; çağıran guardian listesinde olmalı |
| `approve_recovery` | ✅ | `guardian.require_auth()`; çağıran guardian olmalı |

---

## 2. Input validasyonu

| Kontrol | Durum | Not |
|--------|--------|-----|
| Grup adı | ✅ | Boş olamaz; max 64 karakter |
| Minimum üye | ✅ | En az 2 üye |
| Duplicate üye | ✅ | Aynı adres iki kez eklenemez |
| `add_expense` amount | ✅ | `amount > 0` |
| `split_among` | ✅ | Boş olamaz; tüm adresler grupta olmalı |
| Payer grupta | ✅ | Payer grup üyesi olmalı |
| Grup settled değil | ✅ | Settled grupta expense eklenemez / değiştirilemez |
| Guardian threshold | ✅ | `threshold > 0` ve `threshold <= guardians.len()` |
| Guardian listesi | ✅ | En az bir guardian gerekli |

---

## 3. Storage ve TTL

| Kontrol | Durum | Not |
|--------|--------|-----|
| Persistent storage | ✅ | Grup, expense, sayaçlar persistent |
| TTL bump | ✅ | `storage.rs` içinde `bump_persistent`; LIFETIME_THRESHOLD / BUMP_AMOUNT tanımlı |
| Temporary (varsa) | ✅ | Expense kayıtları uygun strateji ile |

---

## 4. Bilinen risk / davranış

| Konu | Not |
|------|-----|
| **settle_group mint** | `group.token` XLM SAC olduğunda `mint` yok; invoke başarısız olur, settle revert eder. Ayrıntı: `docs/SECURITY-NOTES.md`. Mainnet / XLM-only öncesi mint’in kaldırılması veya sadece ayrı reward token’da çağrılması önerilir. |

---

## 5. Edge case ve test

| Konu | Durum |
|------|--------|
| Boş grup adı | ✅ Unit test |
| Min üye, duplicate üye | ✅ Unit test |
| Geçersiz expense (amount, non-member payer, boş split_among) | ✅ Unit test |
| Settlement idempotent, optimal sayı | ✅ Unit test |
| Guardian/recovery | ⚠️ Unit testler Faz 2’de eklenebilir (SKILLS-IMPLEMENTATION-PLAN) |

---

Bu checklist, `docs/SECURITY-NOTES.md` ve kontrat kaynak kodu (`contracts/stellar_split/src/`) ile birlikte güncel tutulmalıdır.
