# Demo video script — Birik v2 (Path B live swap)

**Target length:** 90 seconds · **Format:** 1920×1080, 30 fps · **Voiceover:** TR + EN subtitle track

The old demo at [`youtu.be/ZmqJI9Y7UTc`](https://youtu.be/ZmqJI9Y7UTc) showed same-currency settle only. This script covers the refresh that demonstrates the Path B XLM→USDC swap flow live on testnet.

---

## Pre-recording checklist

- [ ] Contract `CAUKBMO5OAWHDDWAR3WHDYBJSJDTQUAD53L3JDD53DFIYTAVPW3DDAOA` is the one wired in Vercel env
- [ ] Freighter is on testnet and two accounts exist (presenter + creditor), both with friendbot-funded XLM
- [ ] Creditor account **does not yet** have a USDC trustline (so the pre-flight UX kicks in on camera — if it already does, remove the line via `stellar tx new change-trust --limit 0 --line USDC:GBBD47IF…`)
- [ ] Browser: Chromium in an incognito profile with Freighter unlocked; no dev-tools overlay; window resized to 1400×900 to match the app's max-width
- [ ] Tab 1: `https://stellar-split.vercel.app/dashboard`
- [ ] Tab 2: `https://stellar.expert/explorer/testnet/contract/CAUKBMO5OAWHDDWAR3WHDYBJSJDTQUAD53L3JDD53DFIYTAVPW3DDAOA` (for showing the tx at the end)
- [ ] OBS scene: screen capture + webcam overlay in bottom-right, 200×200 circle-mask
- [ ] Clear the `stellarsplit_joyride_done_v2` localStorage flag so the onboarding tour isn't in the way

## 90-second walkthrough

| t (s) | Scene | On-screen | Voiceover (TR) |
|-------|-------|-----------|-----------------|
| 0 – 4 | Landing | Hero "Saniyeler içinde…" | "Birik, Stellar üzerinde grup harcamalarını saniyelerde uzlaştıran bir app." |
| 4 – 10 | Connect Freighter | Click "Cüzdanı bağla" → Freighter popup → approve | "Freighter ile testnet'e bağlanıyorum." |
| 10 – 20 | Create group | "Yeni Grup" → "Istanbul Weekend" → 2 üye → XLM | "4 kişilik bir grup açıyorum, para birimi XLM." |
| 20 – 35 | Add expense | Tıkla → 5 XLM → "Dinner" → ayırma: Alice+Bob | "Dinner için Alice 5 XLM ödedi, Bob'la paylaşıldı." |
| 35 – 45 | Open Settle tab | Tıkla → "Bakiyeler" → Bob Alice'e 2.5 XLM borçlu | "Settle tab'ı min-flow'u zaten hesapladı: Bob Alice'e 2.5 XLM." |
| 45 – 55 | **USDC picker** | "Receive in" → USDC tıkla → amber trustline banner çıkıyor | "Alice USDC almak istiyor — picker'da USDC seçiyorum." |
| 55 – 65 | **Trustline fix (one-click)** | "USDC trustline ekle" → Freighter popup → approve → banner yeşil | "Trustline eksik — tek tık, Freighter imzalıyor, artık hazır." |
| 65 – 75 | **The swap** | "Mark Group Settled" → Freighter popup → approve → loading | "Settle'a basıyorum. Soroswap arkada XLM'i USDC'ye çeviriyor." |
| 75 – 82 | Success toast + tx hash | "Success" toast + Stellar Expert linki | "Tek transaction'da Alice USDC aldı." |
| 82 – 90 | Stellar Expert tab | Tab 2'ye geç → tx diagnostic events: `pair_swap`, `multi_currency_settle` | "Events zincirinde Soroswap pair.swap ve multi_currency_settle görünüyor — atomik, verifiable." |

## Key events to point at on-screen

- `group_created` → group ID appears
- `expense_added` → amount + payer
- Settle → `pair_swap` custom event: `(pool_addr, amount_in=25M, amount_out=5,743,861)`
- Soroswap's own `SoroswapPair swap` event with `amount_0_out` and `amount_1_in`
- `multi_currency_settle(src=XLM_SAC, dst=USDC_SAC)`

## Closing frame

Full-screen still showing:

```
🔗 stellar-split.vercel.app
📝 CAUKBMO5…DDAOA  on Stellar Expert
📹 Proof tx: 1f9d0a9c…bbd0a3
```

Duration: 3 seconds, fade to black.

## Post-production

- Subtitle track both TR (voiceover language) and EN (juror-facing)
- Export master at 1080p H.264 + a 720p version for embeds
- Replace README "Demo Video" link when published:

```diff
- · [📹 Demo Video](https://youtu.be/ZmqJI9Y7UTc)
+ · [📹 Demo Video](https://youtu.be/NEW_ID)
```

Also update `docs/DEMO_DAY_PITCH.md` Slide 4's video link (currently marked "being refreshed").
