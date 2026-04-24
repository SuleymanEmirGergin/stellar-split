# Birik — Demo Day Pitch Deck

> 8 slayt · ~5 dk sunum + 2 dk Q&A · Stellar/Soroban Hackathon Level 6
> Presenter: Süleyman Emir Gergin · April 2026

Her slaytın sonunda **[speaker note]** 2–3 cümle konuşma önerisi.

---

## Slide 1 — Title

# Birik
### Group expense splitting on Stellar — seconds to settle, sub-cent fees, fully on-chain

**Live:** stellar-split.vercel.app · **Contract:** [`CDTQVQRO…Z6LW`](https://stellar.expert/explorer/testnet/contract/CDTQVQROF6WMB6BG35F4TQ5L7E5SZ6TASMG74DVG7DVACEATHLLTZ6LW)
Hackathon Level 6 · Emir Gergin · April 2026

**[speaker note]** "Selam, ben Emir. Birik, Stellar üzerinde grup harcamalarını saniyelerde, neredeyse bedava uzlaştıran bir MVP. Bugün 5 dakikada problemden canlı demo'ya kadar her şeyi göstereceğim."

---

## Slide 2 — Problem

### Group expenses are a settlement nightmare

- **Splitwise / Tricount** → IOU defter; **gerçek para hareket etmez**, kullanıcı bankaya / Wise'a / PayPal'a düşer
- **Cross-border grup** (Erasmus, tatil, remote team) → 5–15% FX + komisyon, 1–3 gün bekleme
- **Trust:** kim kime borçlu, ne zaman ödendi — merkezi bir uygulamaya güven şart
- **Complexity:** 6 kişilik bir grupta 15 potansiyel transfer; elle takip çöker

> **Sonuç:** "Sonra hallederiz" diye bekleyen 30 milyar $'lık çözülmemiş grup borcu (Splitwise + eşdeğerleri).

**[speaker note]** "Splitwise 30M kullanıcıya sahip ama sadece bir defter. Para hala banka/Wise üzerinden hareket ediyor, bu da gecikme, komisyon ve güven problemi demek. Özellikle uluslararası grup harcamalarında."

---

## Slide 3 — Solution: Birik

### Splitwise'ın matematiği + Stellar'ın rail'i

1. **Grup oluştur** → cüzdanları davet et
2. **Harcama ekle** → kim ödedi, kim dahil
3. **`settle_group` tek tık** → on-chain min-flow algoritması 15 transferi 3'e indirir, hepsi atomik
4. **Anlık ödül** → settle'ı başlatan kullanıcıya 100 **SPLT** mint'lenir (inter-contract call)

**Neden Stellar / Soroban?**
- ~5 sn finality, **$0.00005** tx fee → mikro-transferler ekonomik
- Soroban inter-contract → token / vault / savings pool aynı tx içinde
- SEP-24/31 anchor'lar → fiat off-ramp hazır rail

**[speaker note]** "Birik, Splitwise'ın split matematiğini alıp Stellar'ın rail'ine bağlıyor. Hesabı kimin ödediği, kimin dahil olduğu on-chain; settle tek butonla, tek transaction, atomik."

---

## Slide 4 — Live Demo

### 90-second walkthrough

1. **Connect Freighter** (testnet)
2. **Create group** "Istanbul Weekend" — 4 member
3. **Add 3 expenses** (dinner, gas, Airbnb)
4. **Settle** — min-flow: 6 potansiyel transfer → **3 gerçek transfer**, tek tx, Stellar Expert'te canlı
5. **SPLT reward** mint → Dashboard'da anında görünür
6. **Gasless toggle** — zero-XLM bir hesap bile fee-bump ile settle edebiliyor

→ **demo video:** youtu.be/ZmqJI9Y7UTc

**[speaker note]** "Şimdi canlı gidelim. [ekran paylaşımı] — burada 4 kişilik grup, üç harcama, settle'a bastığımda arkada min-flow greedy çalışıp 6 transferi 3'e indiriyor, hepsini tek Soroban tx'inde gönderiyor. Sağ üstte SPLT bakiyesi 0'dan 100'e çıktı — inter-contract mint."

---

## Slide 5 — Advanced Features (Level 6)

### Two advanced features shipped — not one

| # | Feature | Proof |
|---|---------|-------|
| 1 | **Fee sponsorship (gasless)** — Stellar fee-bump wrapper; kullanıcı zero-XLM ile settle edebilir | `backend/src/sponsor/*`, `POST /sponsor/fee-bump`, Settle toggle live |
| 2 | **Multi-sig social recovery** — guardian-based M-of-N account recovery | `set_guardians` / `initiate_recovery` / `approve_recovery` on contract, `SecurityTab.tsx` UI |

**Bonus:** Multi-currency settle via Soroswap AMM (`settle_group_flex`) — on-chain proof (pool discovery + router invoke), tam tx için 1 auth-tuning kaldı. `docs/MULTI_CURRENCY.md`.

**[speaker note]** "Level 6 sadece 1 advanced feature istiyor — biz 2 tane yolladık. Fee sponsorship sayesinde kullanıcının cüzdanında XLM olmasa bile settle yapılabiliyor. Social recovery ise cüzdan kaybı senaryosunda guardian M-of-N ile erişimi geri veriyor."

---

## Slide 6 — Metrics & Production Posture

### Built like production — not a hackathon demo

| Signal | Number |
|---|---|
| Test suite | **1293 tests** yeşil (frontend 880 + backend 389 + contract 24) |
| Commits on master | **100+** |
| Active testnet users | **30+** (Google Form + on-chain verified) |
| Contracts deployed | 2 (main + SPLT) + wired to Soroswap router/factory |
| Live endpoints | Vercel frontend + Railway backend + SSE event stream |

**Observability:** Sentry + Prometheus `/metrics` + Pino + `/health/live|ready` + public `/analytics/summary` dashboard (DAU/WAU/MAU, 14-day volume trend).

**Security:** [`docs/SECURITY-CHECKLIST.md`](SECURITY-CHECKLIST.md) — SIWS, JWT rotation, HttpOnly refresh, rate limits, input validation, secret handling.

**Data indexing:** `SorobanEventPollerService` (5s cron, Redis checkpoint) → decoded **21 event topics** → Postgres + SSE fan-out.

**[speaker note]** "Bu bir hackathon demo'su gibi görünmüyor çünkü değil. 1293 test, CI/CD, Sentry, Prometheus, public metrics dashboard, security checklist, data indexer — hepsi canlı."

---

## Slide 7 — Users & Feedback Loop

### Real users, real iteration

- **Google Form** → Excel export → `docs/user-feedback.xlsx` + `docs/USER_FEEDBACK.md`
- **30+ testnet wallet** doğrulandı (Stellar Expert)
- **Top 3 feedback → 3 iteration commit** (README Next Phase bölümünde commit hash'leriyle)

**Feedback temaları:**
1. "Mobilde settle butonu zor bulunuyordu" → bottom-sheet FAB eklendi
2. "Webhook kurulumu zor" → Discord/Slack preset template'ler
3. "Tek para birimi kısıtlı" → multi-currency settle (Soroswap) canlı proof

**Community:** Twitter daily build posts · Dev.to + Medium uzun yazıları canlı.

**[speaker note]** "30+ kullanıcı Google Form'u doldurdu, onbinlerce cüzdan adresini Stellar Expert'te doğrulayabilirsiniz. Her temalı feedback için gerçek bir iterasyon commit'i var — sadece anket değil, kapanmış bir döngü."

---

## Slide 8 — Roadmap & Ask

### What's next — and what we need

**Next 90 days**
- ✅ Mainnet deploy + SPLT listing on Stellar DEX
- ✅ Multi-currency settle auth-tuning close → live XLM↔USDC
- ✅ Mobile PWA install flow + push notifications
- ✅ SEP-24 anchor entegrasyonu — fiat on/off-ramp

**Ask**
- 🤝 **Mentor / DevRel intro** — Soroswap auth-sub-invocation review
- 🧪 **Mainnet pilot** — Stellar Ecosystem Fund / SDF
- 📣 **Community amplification** — Stellar Quest, Composer community

### Birik = Splitwise × Stellar × DeFi primitives

**Try it:** stellar-split.vercel.app · **Contact:** emirgergin21@gmail.com · **GitHub:** SuleymanEmirGergin/stellar-split

**[speaker note]** "90 gün içinde mainnet'e çıkıyoruz. Benim ihtiyacım: Soroswap tarafında bir mentor, mainnet pilotu için köprü, ve topluluğa duyurmak için amplification. Teşekkürler, sorularınıza açığım."

---

## Appendix — Q&A prep

**Q: Splitwise'dan farkınız?**
A: Splitwise defter, biz rail'iz. Onlarda para hareket etmez, bizde on-chain atomik transfer + 5 sn finality + sub-cent fee.

**Q: Neden Stellar, Ethereum L2 değil?**
A: Finality (5 sn vs 10+ sn), fee (0.00005 $ vs cent'ler), SEP-24/31 anchor'lar ile fiat off-ramp'in hazır olması.

**Q: Adoption riski?**
A: Crypto-native gruplar (DAO treasury, Web3 conference, remote team) first wave. Sonra Freighter / Lobstr embedded wallet ile mainstream.

**Q: SPLT token ne işe yarıyor?**
A: Şu an non-monetary loyalty (settle başlatana ödül). Yol haritası: DEX listing → fee discount → governance.

**Q: Multi-currency partial olan?**
A: On-chain proof var (pool discovery + router invoke), sub-invocation auth nesting'de bir tuning kaldı. `docs/MULTI_CURRENCY.md` tam yol haritasını içeriyor.
