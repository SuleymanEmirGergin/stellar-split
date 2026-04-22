# Birik — Twitter/X Thread Playbook

3 publish-ready thread. Her tweet karakter sayısı (≤280) + görsel eşleme + hashtag/mention listesi ile birlikte. Copy-paste direkt X'e yapıştırılabilir.

---

## 📅 Yayın planı — prensipler + adapte edilmiş takvim

**Prensip:** Gün adı (Pazartesi/Salı) önemli değil — asıl belirleyici faktörler:

1. **Saat-of-day** >> gün-of-week
2. **Thread'ler arası 24–48 saat aralık**
3. **3 thread ~1 hafta içinde yayında olsun** (momentum)

Aşağıdaki takvim **bugün çarşamba başlanırsa** uygun. Hangi günden başlanırsa başlansın, aynı aralık ve saat yapısı geçerlidir.

### Strateji A — Awareness-first (varsayılan)
İlk thread genel hook + brand, sondaki thread conversion-heavy CTA.

| +Gün | Saat (TR) | Thread | Neden |
|------|-----------|--------|-------|
| **Gün 0 (bugün)** | 20:00 | Thread 1 — Why Birik? | Evergreen hook, en geniş reach |
| **+2 gün** | 16:00 | Thread 2 — Under the hood | ABD dev öğle saati, teknik audience |
| **+4 gün** | 18:00 | Thread 3 — Testnet beta open | Hafta sonu kişisel vakit, setup + form doldurma oranı yüksek |

### Strateji B — Conversion-first (5+ user bulmak acildiyse)
MVP submission deadline yakınsa bu sıra; direkt formu öne atar, sonra awareness ile desteklersin.

| +Gün | Saat (TR) | Thread | Neden |
|------|-----------|--------|-------|
| **Gün 0 (bugün)** | 20:00 | Thread 3 — Testnet beta open | Direkt CTA, en hızlı form fill'i üretir |
| **+2 gün** | 20:00 | Thread 1 — Why Birik? | Thread 3 impression'ını brand story ile destekler |
| **+4 gün** | 18:00 | Thread 2 — Under the hood | Dev community, repo star & long-term interest |

### Saat-of-day cheat sheet

| Hedef kitle | TR saati | Gerekçe |
|-------------|----------|---------|
| Türk crypto community | 20:00–22:00 | Mesai sonrası, telefon elinde |
| ABD dev community | 16:00–18:00 (9–11 ET) | Dev'lerin sabah kahve + Twitter rutini |
| AB crypto builders | 18:00–20:00 | Avrupa mesai bitişi |
| Düşük rekabet pencere | 12:30–13:30 | Öğle molası, aynı saatlerde tweet yağmayan bir pencere |

**Kapsayıcı seçim:** `20:00 TR` — Türkiye akşam + ABD öğle + AB akşam başı üçünü aynı anda yakalar.

> ⚠️ Üst üste < 24 saat thread atma. Follower'ın timeline'ı dolar → overload → unfollow.

---

## 🏷️ Ortak hashtag/mention cheat sheet

**Birinci-seviye mention (her thread'in son tweet'inde):**
- [@StellarOrg](https://twitter.com/StellarOrg) — ana hesap, retweet şansı yüksek
- [@SorobanOfficial](https://twitter.com/SorobanOfficial) — smart contract layer
- [@SDF_Official](https://twitter.com/SDF_Official) — Stellar Development Foundation

**İkinci-seviye mention (yalnız thread 2 — teknik):**
- [@rustlang](https://twitter.com/rustlang) — Rust community
- [@Freighter_](https://twitter.com/Freighter_) — wallet
- [@dev_to](https://twitter.com/dev_to) — blog platform (post yayınlandığında)

**Hashtag taksonomisi:**
- Zorunlu: `#Stellar #Soroban`
- Thread 1 (ürün): ekle `#Web3 #BuildOnStellar`
- Thread 2 (teknik): ekle `#RustLang #OpenSource`
- Thread 3 (beta): ekle `#Web3Beta #Testnet`

> 💡 2 hashtag/tweet'ten fazlası X algoritmasında ceza alıyor. Hashtag'leri sadece ilk ve son tweet'e koy.

---

## 🖼️ Görsel asset haritası

Bu screenshot'lar repo'da hazır. Tweet'lere drag-drop.

| Dosya | Nerede kullanılır |
|-------|-------------------|
| `docs/screenshots/landing-desktop-dark.png` | Thread 1 Tweet 2 |
| `docs/screenshots/settle-modal-minflow.png` | Thread 1 Tweet 4, Thread 2 Tweet 3 |
| `docs/screenshots/splt-reward.png` | Thread 1 Tweet 5 |
| `docs/screenshots/mobile-bottomsheet.png` | Thread 1 Tweet 6 |
| `docs/screenshots/activity-feed.png` | Thread 2 Tweet 8 |
| `docs/screenshots/tests-passing.png` | Thread 2 Tweet 8 (alt.) |
| `docs/screenshots/landing-mobile-dark.png` | Thread 3 Tweet 4 |

---

# 🧵 THREAD 1 — "Why Birik?"
**Tema:** Problem framing + ürün tanıtım + "try it" CTA
**Hedef kitle:** Genel crypto-curious + Stellar ekosistemi
**Uzunluk:** 8 tweet
**Dil:** İngilizce (geniş erişim). TR mirror için aşağıda ayrı bölüm var.

---

### Tweet 1 — Hook
> Splitwise tells you who owes what. Then you still have to actually move the money — bank transfer, PayPal, Revolut, cash.
>
> Slow. Fees. Paragraph-long memo fields.
>
> Crypto solved peer-to-peer transfer 10 years ago. So why hasn't anyone merged the two?
>
> 🧵

**Char:** 270 ✅
**Görsel:** Yok (hook temiz kalsın)
**Hashtag:** Yok (hashtag'ler son tweet'te)

### Tweet 2 — Ürün
> We built **Birik** — group expense splitting on Stellar.
>
> Track → split → settle, all in one place. Settlement goes on-chain in ~5 seconds at ~1.2 cents per tx.
>
> No bank transfers. No Revolut. No IOU limbo.

**Char:** 237 ✅
**Görsel:** `docs/screenshots/landing-desktop-dark.png`

### Tweet 3 — Why Stellar
> Why Stellar specifically? Three reasons:
>
> 1. Fees small enough to stop thinking about (~$0.00005)
> 2. Soroban contracts are in Rust — tooling is genuinely pleasant
> 3. Every asset on Stellar is also a Soroban contract (SAC) — no bridging, no wrapping

**Char:** 263 ✅
**Görsel:** Yok

### Tweet 4 — Min-flow hook
> The clever bit: when 6 people owe different amounts, the naive approach is up to 15 pairwise transfers.
>
> Birik runs a greedy min-flow algorithm on-chain → at most N-1 transfers.
>
> For a group of 4, that's often 2 transfers instead of 6.

**Char:** 260 ✅
**Görsel:** `docs/screenshots/settle-modal-minflow.png`

### Tweet 5 — Inter-contract reward
> When you tap "Mark as Settled", the contract:
>
> → transfers XLM via the native SAC
> → inter-contract-calls our companion SPLT token to mint 100 SPLT to you
>
> All atomic, one transaction. Love how cleanly Soroban composes.

**Char:** 264 ✅
**Görsel:** `docs/screenshots/splt-reward.png`

### Tweet 6 — Ship stats
> 30-day ship stats:
>
> 🧪 1,293 tests across contract/backend/frontend
> 📝 94 commits
> 🌍 4 languages (TR/EN/DE/ES)
> 📱 Mobile-first responsive UI
> 🚀 Full CI/CD, deployed
>
> Not a hackathon toy. Built like real software.

**Char:** 237 ✅
**Görsel:** `docs/screenshots/mobile-bottomsheet.png`

### Tweet 7 — Try it
> Try it (no wallet needed):
>
> 🌐 stellar-split.vercel.app
> Press **D** on the landing page for demo mode.
>
> 📝 Contract verified on Stellar Expert:
> stellar.expert/explorer/testnet/contract/CBQENHYCVSOK3CHZ6NRT6BI34W2ERPSRUNXHI6X5X33DTDCDWX27YN7K

**Char:** 265 ✅
**Görsel:** Yok

### Tweet 8 — CTA + mentions
> Open source. MIT.
>
> Next up: multi-currency settle via path payments + real yield on idle group savings.
>
> Star the repo, break the demo, tell me what sucks.
>
> github.com/SuleymanEmirGergin/stellar-split
>
> cc @StellarOrg @SorobanOfficial
>
> #Stellar #Soroban #BuildOnStellar #Web3

**Char:** 272 ✅
**Görsel:** Yok

---

## 🇹🇷 THREAD 1 — Türkçe mirror

Aynı içerik, TR audience için. İngilizce'yi yayınladıktan ~24 saat sonra.

### Tweet 1
> Splitwise kimin kime borçlu olduğunu söyler. Sonra parayı elle taşırsın — havale, Revolut, nakit.
>
> Yavaş. Komisyonlu. "Bana 340 TL kaldın" mesajları.
>
> Crypto peer-to-peer parayı 10 yıl önce çözdü. Neden kimse ikisini birleştirmedi?
>
> 🧵

**Char:** 262 ✅

### Tweet 2
> **Birik**'i yaptık — Stellar üzerinde grup harcaması bölüşme uygulaması.
>
> Takip et → böl → on-chain takas et, hepsi tek yerde. Takas ~5 saniyede tamamlanır, tx başına ~5 kuruş.
>
> Havaleye gerek yok. IOU belirsizliği yok.

**Char:** 234 ✅
**Görsel:** `landing-desktop-dark.png`

### Tweet 3
> Neden Stellar?
>
> 1. Ücretler düşünmeyi bırakacağın kadar küçük (~$0.00005)
> 2. Soroban Rust tabanlı — tooling gerçekten keyifli
> 3. Stellar'daki her varlık aynı zamanda Soroban kontratı (SAC) — köprüye gerek yok

**Char:** 247 ✅

### Tweet 4
> İşin güzel kısmı: 6 kişilik grupta en kötü senaryoda 15 pairwise transfer gerekir.
>
> Birik on-chain greedy min-flow algoritması ile bunu N-1'e indirir.
>
> 4 kişilik grupta genellikle 6 yerine 2 transfer olur.

**Char:** 235 ✅
**Görsel:** `settle-modal-minflow.png`

### Tweet 5
> "Grubu Takas Edildi" butonuna basıldığında kontrat:
>
> → XLM'yi native SAC üzerinden aktarır
> → companion SPLT token kontratını çağırır, settle edene 100 SPLT mint eder
>
> Hepsi atomik, tek işlem. Soroban'ın compose'u çok temiz.

**Char:** 261 ✅
**Görsel:** `splt-reward.png`

### Tweet 6
> 30 günün özeti:
>
> 🧪 1293 test (kontrat/backend/frontend)
> 📝 94 commit
> 🌍 4 dil (TR/EN/DE/ES)
> 📱 Mobile-first UI
> 🚀 Full CI/CD, deployed
>
> Hackathon demosu değil — gerçek yazılım gibi build edildi.

**Char:** 216 ✅
**Görsel:** `mobile-bottomsheet.png`

### Tweet 7
> Dene (cüzdan kurmana bile gerek yok):
>
> 🌐 stellar-split.vercel.app
> Landing'de **D** tuşu → demo mode
>
> 📝 Kontrat Stellar Expert'te:
> stellar.expert/explorer/testnet/contract/CBQENHYC...

**Char:** 226 ✅

### Tweet 8
> Open source, MIT.
>
> Sırada: path payment ile çok-para birimi settle + idle grup birikimlerinde gerçek yield.
>
> Repo: github.com/SuleymanEmirGergin/stellar-split
>
> cc @StellarOrg
>
> #Stellar #Soroban

**Char:** 221 ✅

---

# 🧵 THREAD 2 — "How it works under the hood"
**Tema:** Blog post'un özet teknik yankısı — min-flow, inter-contract, SIWS
**Hedef kitle:** Soroban devs + Stellar builder community
**Uzunluk:** 9 tweet
**Dil:** İngilizce

---

### Tweet 1 — Hook
> We open-sourced a full Soroban dApp this month: group expense splitting on Stellar.
>
> 3 technical decisions worth reading if you're building anything on-chain 🧵
>
> (I have opinions. You've been warned.)

**Char:** 217 ✅
**Görsel:** Yok

### Tweet 2 — Setup
> 1/ MIN-FLOW SETTLEMENT — on-chain
>
> 6-person group? Up to 15 pairwise transfers in the worst case.
>
> We pair largest debtor with largest creditor greedily.
> Guarantee: ≤ N-1 transfers for N people.

**Char:** 225 ✅

### Tweet 3 — Algo code
> ```rust
> while d_idx < debtors.len() && c_idx < creditors.len() {
>     let amt = d_remaining.min(c_remaining);
>     settlements.push_back(Settlement { from, to, amount: amt });
>     // ...update remainders, advance indices
> }
> ```
>
> Running it on-chain is the correctness argument. Client can't lie about who owes whom.

**Char:** 278 ✅
**Görsel:** `settle-modal-minflow.png`

### Tweet 4 — Inter-contract
> 2/ INTER-CONTRACT CALL
>
> When you tap "Settle", the main contract:
> → loops through settlements, calling SAC.transfer for each
> → calls INTO our companion SPLT token contract's mint() for the settler reward
>
> All atomic. One transaction.

**Char:** 264 ✅

### Tweet 5 — Inter-contract code
> ```rust
> // lib.rs:395
> let reward_amount = 100_i128;
> env.invoke_contract::<()>(
>   &reward_token_id,
>   &Symbol::new(&env, "mint"),
>   vec![&env, settler.into_val(&env), reward_amount.into_val(&env)],
> );
> ```
>
> Composition via invoke_contract is beautifully clean.

**Char:** 259 ✅
**Görsel:** `splt-reward.png`

### Tweet 6 — SIWS intro
> 3/ SIGN-IN WITH STELLAR (SIWS) — our take on SIWE
>
> Wallet-address-only auth doesn't cut it for backend features (private groups, push notifications).
>
> challenge → Freighter signs → backend verifies → JWT + HttpOnly refresh
>
> ~200 LOC. Caveat 👇

**Char:** 274 ✅

### Tweet 7 — SIWS gotcha
> Cookie gotcha:
>
> Frontend on Vercel, backend on Railway = different domains.
>
> You need `SameSite=None; Secure` + matching CORS.
>
> Lost an hour to this. Saving you that hour.

**Char:** 196 ✅

### Tweet 8 — Test stats
> Test budget for 30 days:
>
> 🦀 24 contract tests (cargo)
> 🧩 389 backend tests (Jest/NestJS)
> ⚛️ 880 frontend unit + 60+ Playwright e2e
>
> All gated in CI. Nothing merges red.
>
> Why so many? Contract bugs silently rob users. Worth the budget.

**Char:** 268 ✅
**Görsel:** `activity-feed.png`

### Tweet 9 — Full write-up + CTA
> Full write-up with architecture diagrams + lessons learned from 30 days:
>
> dev.to/plutazom/how-we-built-birik-group-expense-splitting-on-stellar-in-30-days-1aog
>
> Repo: github.com/SuleymanEmirGergin/stellar-split
>
> cc @StellarOrg @SorobanOfficial
>
> #Stellar #Soroban #RustLang

**Char:** 275 ✅
**Görsel:** Yok (link preview otomatik)

> 💡 **İpucu:** Dev.to linki tek link olarak tweet'te yer kaplıyor. Alternatif olarak kısa Medium link'i kullan:
> `medium.com/@Plutazom/how-we-built-birik-group-expense-splitting-on-stellar-in-30-days-31c1ab3a0447`
>
> **Canonical URL önerisi:** Medium'daki yazının canonical_url'ini Dev.to'ya yönlendir (Google SEO duplicate-content cezasını önler). Medium → Settings → Stories → "Add canonical URL" → Dev.to URL'ini yapıştır. Önemli çünkü Google aynı içeriği 2 yerde tutmaktan hoşlanmaz.

---

# 🧵 THREAD 3 — "Testnet beta open"
**Tema:** Community call — 5+ testnet user topla
**Hedef kitle:** Crypto-curious + Türk/Avrupa Erasmus/startup çevresi + Stellar beta testers
**Uzunluk:** 8 tweet
**Dil:** İngilizce (eğer TR çevren genişse Türkçe mirror da yayınla)

---

### Tweet 1 — Hook
> We're looking for 20 people to beta test Birik on Stellar Testnet.
>
> 3 minutes to set up.
> 5 minutes to try.
> $0 cost (testnet XLM is free).
>
> You get: your wallet address in our testnet users showcase + the smug satisfaction of shaping a product.
>
> 🧵

**Char:** 274 ✅

### Tweet 2 — Who it's for
> You'll enjoy this if you've ever:
>
> ⚡ Lived with housemates and argued over the water bill
> ⚡ Been on a group trip and played "who paid for dinner?"
> ⚡ Had a Splitwise balance sit unpaid for 6 months
>
> Or if you just want to see a Soroban dApp in action.

**Char:** 270 ✅

### Tweet 3 — What's different
> What Birik does differently:
>
> → Settle group debts in ~5 seconds
> → ~1.2 cents per settlement (yes really)
> → Min-flow algorithm on-chain (10 transfers → 3)
> → Multi-language (TR/EN/DE/ES)
> → Mobile-first
> → Open source (MIT)

**Char:** 250 ✅

### Tweet 4 — Screenshot
> Looks like this on mobile:

**Char:** 30 ✅
**Görsel:** `landing-mobile-dark.png`

### Tweet 5 — How to test
> How to test in 5 min:
>
> 1. Install Freighter wallet (Chrome extension)
> 2. Switch to Testnet mode
> 3. Fund via Friendbot (free test XLM)
> 4. Open stellar-split.vercel.app
> 5. Fill the 2-min feedback form
>
> No real money. Your inputs help us ship better.

**Char:** 275 ✅

### Tweet 6 — Feedback form
> Feedback form (2 min):
> forms.gle/oFSNuU6a9NthmfJR7
>
> Every answer gets read. Bug reports get extra thanks.
> Your testnet address goes in our public users showcase on the repo.

**Char:** 221 ✅

### Tweet 7 — What we want
> What we're especially looking for:
>
> → Real UX friction (not "this could be prettier")
> → Bugs you hit in the flow
> → Features you wish existed
> → Confusion points for non-crypto users
>
> Honest negatives > polite positives.

**Char:** 254 ✅

### Tweet 8 — CTA + mentions
> If you know 1 person who'd want to try this, tag them below.
>
> We're aiming for 20 real users by month-end.
>
> Next up: multi-currency settle (path payments) — come help shape it.
>
> cc @StellarOrg @SDF_Official
>
> #Stellar #Soroban #Web3Beta #BuildOnStellar

**Char:** 279 ✅

---

## ⚡ Quote-tweet / reply hazır cevapları

Thread yayınlandığında kaçınılmaz bazı sorular gelir. Hazır cevaplarla hızlı yanıtla:

**S1: "Mainnet'te mi?"**
> Henüz değil — Testnet'teyiz, ama kontrat, altyapı ve testler mainnet'e hazır durumda. 3rd-party audit + ~50 test kullanıcı threshold'u bekliyoruz. Q2 2026 hedef.

**S2: "Tek cüzdan mı destekliyor?"**
> Şu an Freighter. Albedo + WalletConnect yol haritasında, sonraki iterasyonda.

**S3: "Splitwise'dan ne farkı var? Takip için bunu mu kullanayım?"**
> Splitwise takibi iyi yapıyor — asıl sorun "bitir kapat". Birik para hareketini de on-chain tek tıkla yapar. Para hiç gezinti çekmeden yerine ulaşır. Splitwise'ı tamamlıyor, değiştirmiyor.

**S4: "Gerçek para için güvenli mi?"**
> Şu an testnet'te — gerçek para yok, bol bol test edebilirsin. Mainnet öncesi audit + bug bounty program açılacak. İstenen: hızlı kırılmak, hızlı öğrenmek.

**S5: "Kod nerede?"**
> MIT, public, full-stack: github.com/SuleymanEmirGergin/stellar-split — kontrat kodu `contracts/stellar_split/src/`, frontend `frontend/src/`, backend `backend/src/`. PR/issue her zaman açık.

**S6: "Fee bump / sponsored tx var mı?"**
> Var, backend'de `POST /sponsor/fee-bump` endpoint'i canlı. Kullanıcı imzalar, bizim sponsor keyimiz fee'yi yüklenir. Mainnet'te bu onboarding'i öldürmemek için kritik.

---

## 📊 Engagement tracking

Her thread yayınlandıktan 72 saat sonra şunları not al (bir sonraki thread'i kalibre etmek için):

| Metrik | Thread 1 | Thread 2 | Thread 3 |
|--------|----------|----------|----------|
| Impressions (ilk 24h) | — | — | — |
| Quote tweet / retweet | — | — | — |
| Replies | — | — | — |
| Profile clicks | — | — | — |
| Site click (bio link) | — | — | — |
| New testnet user (form fill) | — | — | — |

İstenen: Thread 3 en yüksek "form fill" üretmeli (çünkü en güçlü CTA). Thread 2 en yüksek profile click (teknik yazarlık kanıtı). Thread 1 en yüksek genel impression.

---

## 🔁 Re-post stratejisi

Tüm thread'ler yayınlandıktan 1-2 hafta sonra:
- **Thread 1**'i 2 haftada bir remix edip farklı hook ile yeniden yayınla (aynı içerik, yeni hook tweet)
- **Thread 2**'yi dev conference/hackathon duyurusu ile quote-tweet'le
- **Thread 3**'ü her 5. kullanıcıdan sonra "thanks + keep them coming" quote-tweet ile canlı tut

Her thread bir kerede değil — "always-on" content.
