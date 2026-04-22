# Multi-currency settle — architecture + roadmap

Birik gruplarında herkes aynı para biriminden ödeme almak istemeyebilir: Emir **XLM** gönderir, Selin ise **USDC** almak ister. Bu doküman Birik'in bu senaryoyu nasıl çözdüğünü anlatır.

**L5/L6 iddiası:** *"Multi-currency settle via on-chain path payments."*

---

## 📐 Design constraint: Soroban → Stellar Classic path payment yok

Stellar Classic'in `path_payment_strict_receive` operasyonu doğrudan DEX order book üzerinde swap yapar. Soroban kontratları **Classic operasyonlarını çağıramaz** — yalnız başka Soroban kontratlarını invoke edebilir. Bu yüzden "swap ve transfer'ı tek atomic contract call'da yap" yaklaşımı ancak bir **Soroban AMM** ile mümkün (SoroSwap, Phoenix, Aqua vb.).

Birik'in tercihi: **SoroSwap** (en olgun, açık kaynak, testnet'te aktif).

---

## 🏗️ Architecture — 3 katman

```
        ┌───────────────────┐
        │   SettleTab.tsx   │   Frontend: member × currency picker,
        │   (React + i18n)  │              quote preview, slippage UI
        └─────────┬─────────┘
                  │ settleGroupFlex(destination_asset)
                  ▼
   ┌────────────────────────────────────┐
   │  stellar_split::settle_group_flex  │   Contract: routing decision +
   │          (Soroban / Rust)          │              Soroswap invoke
   └─────┬──────────────────┬───────────┘
         │                  │
 same asset ⇢ direct     different asset
   token_client             ⇢ invoke_contract
   .transfer                  swap_exact_tokens_for_tokens
         │                  │
         ▼                  ▼
   ┌───────────┐    ┌──────────────────────┐
   │ SAC (XLM) │    │  SoroSwap Router     │
   │           │    │  CCJUD55AG6W5HAI5... │
   └───────────┘    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  SAC (USDC)          │
                    │  delivered to        │
                    │  creditor's wallet   │
                    └──────────────────────┘
```

Bir tek transaction; dört adım; her biri Soroban fee dahilinde.

---

## 🔧 Contract API

### `set_swap_router(admin, router)`

Deployer-tarafı setup. SoroSwap router adresini `instance storage`'a yazar. Sadece bir kez çağrılır (re-set allowed, `set_guardians` pattern'ı).

| Network | Router address |
|---------|----------------|
| **Testnet** | `CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD` |
| Mainnet | _(deploy-time karar)_ |

### `settle_group_flex(group_id, settler, destination_asset: Option<Address>)`

`settle_group`'un multi-currency versiyonu. `destination_asset` None veya `group.token` ise **eski davranış birebir korunur** (backward compatible). Farklı bir SAC verilirse:

1. Settler'ı authorize et
2. Her settlement için:
   - Debtor → bu contract (pull source asset)
   - Contract → Soroswap Router approve
   - Soroswap `swap_exact_tokens_for_tokens(amount_in, amount_out_min, [src, dst], contract, deadline)` çağrılır
   - Contract → creditor (deliver destination asset)
3. Settler'a `reward_token` üzerinden mint (Session 9'daki `get_reward_token()` yoksa `group.token`'a fallback)
4. Events emit: `group_settled`, `reward_minted`, `multi_currency_settle(src, dst)`

Tek trans. Fee ≈ 150k stroops (~1.5¢).

---

## 🧪 Contract test coverage

| Test | Ne doğruluyor |
|------|---------------|
| `test_set_swap_router_persists` | set_swap_router çağrılabilir, re-set edilebilir |
| `test_settle_group_flex_requires_router_when_destination_differs` | Router set edilmemişken farklı asset istenirse net panic |

Happy-path swap (`settle_group_flex` + gerçek Soroswap pool) **integration test** seviyesine aittir — Session 10C'de testnet üzerinde smoke test olarak yapılır, unit test zaman tüketimi vs. faydası dengesiz.

---

## 📦 Session 10 breakdown

| Alt-session | Scope | Status |
|-------------|-------|--------|
| **10A** | Contract groundwork: `SwapRouter` DataKey, `set_swap_router`, `settle_group_flex` entrypoint, Soroswap `swap_exact_tokens_for_tokens` invoke, 2 new tests | ✅ **Done** |
| **10B** | Frontend picker + Reflector price feed preview + slippage UI, `settleGroupFlex` wrapper in `contract.ts`, SettleTab wire | ⏳ Planned |
| **10C** | Testnet deploy + `set_swap_router` + gerçek XLM→USDC swap + README tx hash örneği + screenshot | ⏳ Planned |

---

## 🚀 Deploy steps (10C için prerequisite)

Contract redeploy'dan sonra `set_reward_token`'ın yanına bunu da ekle:

```powershell
# PowerShell — tüm değişkenler zaten scope'ta (Session 9 deploy'dan)
$SOROSWAP_ROUTER = "CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD"

stellar contract invoke `
  --id $SPLIT_ID `
  --source deployer `
  --network testnet `
  -- `
  set_swap_router `
  --admin $DEPLOYER_ADDR `
  --router $SOROSWAP_ROUTER
```

Event'i Stellar Expert'te `swap_router_set` topic'iyle doğrula.

---

## 🎯 Slippage / MEV / fairness notes

- **Slippage:** Contract şu anda `amount_out_min = 1` (permissive). Client-side slippage cap bir sonraki session'da Reflector oracle üzerinden eklenecek.
- **Deadline:** 300 saniye (~100 ledger). Soroswap bu aralıkta fill yapamazsa tx revert olur — alive user session için yeterli pencere.
- **Front-running:** Testnet'te MEV sorunu yok. Mainnet için Reflector median price + aggressive `amount_out_min` gerekir.

---

## 📚 Reference

- SoroSwap docs: https://docs.soroswap.finance
- Testnet contract config: https://github.com/soroswap/core/blob/main/public/testnet.contracts.json
- Soroswap Router Rust API: `swap_exact_tokens_for_tokens(amount_in: i128, amount_out_min: i128, path: Vec<Address>, to: Address, deadline: u64) -> Vec<i128>`
- Birik contract: [`contracts/stellar_split/src/lib.rs`](../contracts/stellar_split/src/lib.rs) (search `settle_group_flex`)
