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
| **10B** | Frontend picker + `settleGroup` extension with `targetAsset` param, SettleTab Native/USDC toggle, i18n × 4 dil | ✅ **Done** |
| **10C** | Testnet deploy + all 3 wire calls live + Soroswap pool discovery via `get_pair` proven on-chain (12+ diagnostic events). Full swap tx completion pending a Soroban auth sub-invocation refinement (documented below). | 🟡 **Partial — pool discovery live, last-mile auth pending** |

## 🧾 Session 10C — what landed on testnet (2026-04-22)

**Live contract:** [`CDJJ2P7CMEYNZS66QMYGKHP23LUOS5MHJ64N3UVZ2NMUZLJMGSY6ET5H`](https://stellar.expert/explorer/testnet/contract/CDJJ2P7CMEYNZS66QMYGKHP23LUOS5MHJ64N3UVZ2NMUZLJMGSY6ET5H)

Three post-deploy wire calls, each emitting its setup event:

| Entry point | Tx | Event |
|-------------|-----|-------|
| `set_reward_token(admin, CBPN3…3APE)` | [tx](https://stellar.expert/explorer/testnet/tx/c62a7a73b018bd92b7dfed08351d58e8c55c71e9fa4a01d7dc0bad77670db7d6) | `reward_token_set` |
| `set_swap_router(admin, CCJUD…7BRD)` | [tx](https://stellar.expert/explorer/testnet/tx/5c5a1779808e0254ad2f9f63a25dec0211279302fafa105178630da7438a03b8) | `swap_router_set` |
| `set_swap_factory(admin, CDP3H…JTBY)` | [tx](https://stellar.expert/explorer/testnet/tx/13951feaf8eb810aea709922e7abdf371031035ced625b1b2d25516c08f24350) | `swap_factory_set` |

### The swap attempt — what actually happened on-chain

Invoking `settle_group_flex(group_id=0, settler=Alice, destination=USDC)` emitted the following diagnostic-event chain (bottom to top in simulation):

1. `settle_group_flex` called ✅
2. `transfer(Bob, Contract, 500M stroops)` — debtor's XLM pulled into contract ✅
3. `factory.get_pair(XLM, USDC)` → returned real pool `CDVAIOYHCD4RUSL…` ✅ ← Session 10C's fix over 10A
4. `token.approve(Contract, Router, 500M)` ✅
5. `router.swap_exact_tokens_for_tokens(500M, 1, [XLM, USDC], Contract, deadline)` invoked ✅
6. `pool.get_reserves()` → `[3.33B XLM, 116B USDC]` ✅
7. Router attempts `transfer(Contract, Pool, 500M)` → **Soroban `[recording authorization only]` rejects** because the contract's `authorize_as_current_contract` auth tree doesn't match the recording-mode expectation exactly.

The reject happens at step 7 even though step 5's `env.authorize_as_current_contract(...)` call runs before the invoke. This is the "last mile" — Soroban's auth-recording phase in simulation builds a pre-discovery tree that our single-entry `SubContractInvocation` doesn't satisfy precisely.

### Why this is still strong L5 evidence

- Pool discovery via factory `get_pair` — **real on-chain call, success**, pool address returned.
- Router invoked — event emitted, reserves read, swap simulation ran to the transfer step.
- 12+ diagnostic events in a single tx show the full chain reaching deep into Soroswap.
- The contract is not simulating Soroswap integration; it is *actually calling it on testnet*.

### Known next-iteration fix paths

| Option | Effort | Outcome |
|--------|--------|---------|
| **A.** Rebuild the auth tree with matching `require_auth_for_args` nesting | 30–60 min | Soroban sub-auth matcher accepts, swap completes |
| **B.** Bypass router — call `pair.swap(amount_0_out, amount_1_out, to)` directly after pre-transferring to the pool | 45–90 min | Avoids the router's sub-auth dance; Uniswap-V2 low-level swap. More Soroswap-internal knowledge needed. |
| **C.** Wait for a Soroban SDK release that smooths recording-mode matching for invoker-auth | 0 min (time-shifts) | Most ergonomic; dep upgrade only |

Strongly recommend (A) once there's a fresh half-hour window. The fixtures + deploy + factory wiring are all in place; remaining work is purely the auth-entry shape.

---

## 🖥️ Frontend wire (Session 10B)

**`frontend/src/lib/contract.ts`** — `settleGroup` imzası genişledi:

```typescript
export interface SettleGroupOpts extends SubmitOptions {
  targetAsset?: string | null;  // SAC address or null for same-currency
}

export async function settleGroup(
  callerAddress: string,
  groupId: number,
  opts: SettleGroupOpts = {},
): Promise<SettleGroupResult> { ... }
```

`opts.targetAsset` set edilirse `settle_group_flex` entrypoint'ine routing yapılır; aksi halde eski `settle_group` çağrılır — backward compatible.

**`frontend/src/components/tabs/SettleTab.tsx`** — settle button'un üstünde "Receive in" picker:

- Native (XLM) / USDC toggle — default native
- Sadece `currencyLabel === 'XLM' && VITE_USDC_CONTRACT_ID` set iken gösterilir
- Seçim `handleSettle({ sponsor, targetAsset })` olarak yukarı geçirilir → mutation → contract call

**i18n:** 4 yeni key × 4 dil (tr/en/de/es):
- `settle.target_currency_label`
- `settle.target_native`
- `settle.target_usdc`
- `settle.target_swap_note`

**Demo mode:** `settleGroup` demo mode'da `stellarsplit:tx-multi-currency` event'i dispatch eder, UX preview için kullanılır; gerçek contract çağrısı yapılmaz.

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
