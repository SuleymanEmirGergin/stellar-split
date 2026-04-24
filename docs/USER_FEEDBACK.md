# 💬 Birik — Testnet Kullanıcı Feedback Dokümanı

Bu doküman, Birik MVP'sinin testnet kullanıcılarından alınan geri bildirimleri özetler ve her iyileştirme için git commit link'i ile birlikte takip eder.

- **Google Form:** https://forms.gle/oFSNuU6a9NthmfJR7
- **Excel export:** [`docs/user-feedback.xlsx`](./user-feedback.xlsx)
- **Son güncelleme:** 2026-04-24

---

## 👥 Testnet Kullanıcıları (Doğrulanmış)

| # | Ad / Rumuz | Stellar Expert (Testnet) | Rating (1–5) | NPS (0–10) |
|---|-----------|--------------------------|--------------|------------|
| 1 | Tuğba | [GCKU…expert](https://stellar.expert/explorer/testnet/account/GCKUUMEGQYGFVNFADHKC6IHVHXDWKXFIGOBGQCNW3NDLNK6BH7EAKOOW) | 5 | 9 |
| 2 | Doğa | [GDVV…expert](https://stellar.expert/explorer/testnet/account/GDVVO5QJNCE7SJJFP7BXMQ7XGVJHBKYIICEXKJHZUQYPMVIKCFXBXR4Y) | 4 | 8 |
| 3 | Daghaniyo | [GBSO…expert](https://stellar.expert/explorer/testnet/account/GBSO6TKN4KIQBKBHPKFQKSZ3GYLHWUJZFKRJ5YALZIBQPCAHWK3CSNCC) | 5 | 10 |

> 📝 Tüm adresler Stellar Expert Testnet'te doğrulanmıştır.

---

## 📊 Toplu Metrikler

| Metrik                        | Değer     |
|-------------------------------|-----------|
| Toplam respondent             | **3**     |
| Ortalama genel rating (Q4)    | **4.67**/5 |
| Ortalama UX kolaylığı (Q6)    | **4.33**/5 |
| NPS (Q10)                     | **9.0** (Promoter zone) |
| En çok denenen özellik (Q5)   | Grup oluşturma + Harcama ekleme + Settle |

---

## 🔥 Ortak Temalar

### ✅ Beğenilenler (Q7)
- **Min-flow settlement** — "10 transferi 3'e indirmesi çok etkileyici" (Tuğba)
- **Freighter entegrasyonu** — "Cüzdan bağlamak tek tıkla oldu, beklediğimden çok daha hızlı" (Doğa)
- **SPLT ödülü** — "Settle yapınca token kazanmak motivasyon artırıyor" (Daghaniyo)
- **Dark/Light tema** — Tüm kullanıcılar otomatik tema geçişini beğendi

### 😬 En çok zorlayanlar (Q8)
- **Mobil settle butonu zor bulunuyordu** — Dashboard'da alt kısımda kayboluyordu (Tuğba)
- **Webhook kurulumu karmaşık** — Discord/Slack entegrasyon adımları belirsiz (Doğa)
- **Tek para birimi kısıtı** — "Grubumuzda USDC ile ödemek istedik, sadece XLM vardı" (Daghaniyo)

### 💡 İstenen yeni özellikler (Q9)
- Push notification: "Birisinin harcama eklediğinde bildirim almak istiyorum"
- Fotoğraf ekleme: "Fişi veya makbuzu harcamaya ekleyebilmek"
- Recurring expenses: "Kira gibi aylık tekrarlayan harcamalar"

### 🐞 Raporlanan hatalar (Q11)
- **Yok** — 3 respondent da bug raporu bildirmedi

---

## 🔄 Iteration — Feedback'e Göre Yapılan Değişiklikler

| # | Feedback | Yapılan değişiklik | Commit |
|---|----------|--------------------|--------|
| 1 | "Mobilde settle butonu zor bulunuyordu" (Tuğba) | Mobile bottom-sheet'e Settle FAB eklendi; Dashboard alt çubuğuna sticky CTA konuldu | [`38a3a83`](https://github.com/SuleymanEmirGergin/stellar-split/commit/38a3a83) |
| 2 | "Webhook kurulumu zor" (Doğa) | Discord ve Slack için preset template'ler + tek tıkla yapılandırma akışı eklendi | [`38a3a83`](https://github.com/SuleymanEmirGergin/stellar-split/commit/38a3a83) |
| 3 | "Tek para birimi kısıtlı" (Daghaniyo) | Multi-currency settle via Soroswap AMM (`settle_group_flex`) — on-chain proof; `docs/MULTI_CURRENCY.md` | [`38a3a83`](https://github.com/SuleymanEmirGergin/stellar-split/commit/38a3a83) |

> 📝 Commit link formatı: `https://github.com/SuleymanEmirGergin/stellar-split/commit/<SHA>`

---

## 📩 İletişim & Takip

İleride beta için iletişime açık kullanıcılar (Q12 = "Evet"):

| Ad | E-posta | Not |
|----|---------|-----|
| Tuğba | t****@****.com | Beta erken erişim istedi |
| Daghaniyo | d****@****.com | Mainnet çıkışında bildirim istedi |

> **Not:** Kişisel e-posta adresleri public repo'ya tam açık pushlanmamalı. Bu tabloda maskelenmiştir.
