# Level 6 — Kullanıcı Tarafı Çalıştırma Rehberi

Bu belge, Level 6'da senin (Emir) yapmak zorunda olduğun 5 iş kolu için adım adım plandır. Her bölüm ayrı bir "sen yaparsın" kanalı — paralel ilerlemek için sıralı bağımlılık yok.

**Toplam süre**: ~4-6 saat fiilî iş + 3-7 gün pasif bekleme (kullanıcı formu dolana kadar).

---

## 📋 İş Listesi — Öncelik Sırası

| # | İş | Aktif süre | Bekleme |
|---|---|---|---|
| 1 | Google Form oluştur + deploy et | 20 dk | — |
| 2 | Twitter post at (form linkiyle) | 10 dk | — |
| 3 | **Kullanıcı toplama** (30+ wallet) | — | 3-7 gün |
| 4 | Feedback analizi → roadmap md'si | 1 saat | — (form dolduktan sonra) |
| 5 | Demo Day presentation deck | 3-4 saat | — |

---

## 1️⃣ Google Form oluşturma (20 dk)

### 1.1 Form alanlarını hazırla

Birik için kullanıcı onboarding formu şu alanları içermeli:

| Soru | Tip | Zorunlu | Validation |
|---|---|---|---|
| Stellar cüzdan adresin | Kısa cevap | ✅ | Başında `G`, 56 karakter (regex: `^G[A-Z2-7]{55}$`) |
| İsim / Nickname | Kısa cevap | ✅ | Min 2 karakter |
| E-posta | Kısa cevap | ✅ | Email format |
| Birik'i nereden duydun? | Çoktan seçmeli | ❌ | Twitter / Arkadaş / Discord / GitHub / Diğer |
| Birik'i 1-10 arası puanlarsan? | Lineer ölçek | ✅ | 1-10 |
| En sevdiğin özellik hangisi? | Çoktan seçmeli (çok seçenekli) | ❌ | Grup bölüşümü / Settle / Savings Pool / DeFi Vault / Rozet sistemi / Çok dilli / Multi-sig / Mobile |
| Eksik bulduğun ne var? | Uzun cevap | ❌ | — |
| Hangi tür grup için kullanırsın? | Çoktan seçmeli | ❌ | Ev arkadaşları / Tatil / Ofis / Düğün / Startup co-founders / Diğer |
| Testnet vs mainnet tercihin? | Tek seçim | ❌ | Testnet (şu an) / Mainnet çıkınca / Fark etmez |
| Yorum & öneri (varsa) | Uzun cevap | ❌ | — |

### 1.2 Google Forms'ta oluştur

1. **forms.google.com** → **Boş form**
2. Başlık: **"Birik — Stellar'da Grup Ödemesi · Kullanıcı Formu"**
3. Açıklama:
   > Birik'i denediğiniz ve geri bildiriminiz için teşekkürler! Bu form 1-2 dakika sürer ve deneyiminizi şekillendirmek için kullanacağız. Cevaplarınız gizli tutulur — cüzdan adresiniz yalnızca submission evidence'ı için kullanılır.

4. Yukarıdaki tabloyu sırayla soru olarak ekle
5. **Ayarlar** → **Yanıtlar** → "E-posta adreslerini topla" **KAPALI** (form zaten email soruyor, Google hesabı zorunluluğu olmasın)
6. **Tema** (üstte paleti) → Birik lime'ı için HEX: `#C4FF4D`. Tema rengi olarak koyu arka plan seç ki brand ile uyumlu olsun.
7. **Gönder** → **Link** → **URL'yi kısalt** → kopyala

Örnek kısa link: `https://forms.gle/XXXXXX`

### 1.3 Cevap toplama + Excel export

1. Formun **"Yanıtlar"** sekmesi → yeşil Sheets ikonu → "Yanıtları Google E-Tablolar'a bağla" → yeni sheet oluşturur
2. Her cevap geldiğinde sheet'e ekleniyor — otomatik
3. Export: **Dosya** → **İndir** → **.xlsx (Microsoft Excel)**
4. İndirilen dosyayı `docs/user-onboarding.xlsx` olarak kaydet
5. README'ye şunu ekle (aşağıda hazır snippet var):
   ```markdown
   ## 👥 User Onboarding Data
   
   - **Live form**: [forms.gle/XXXXXX](https://forms.gle/XXXXXX)
   - **Responses**: [docs/user-onboarding.xlsx](docs/user-onboarding.xlsx)
   - **Total verified wallets**: 34 (as of YYYY-MM-DD)
   ```

### 1.4 Level 6 submission için kritik nokta

Form cevaplarında **30+ geçerli Stellar cüzdan adresi** olmak zorunda. Her wallet adresi **stellar.expert/explorer/testnet/account/&lt;wallet&gt;** üzerinde verifiable olmalı — yani en azından friendbot ile fonlanmış olmalı.

> **İpucu**: Formun açıklamasına şunu ekle: _"Cüzdanın hiç kullanılmamışsa, https://friendbot.stellar.org adresinden tek tıkla 10,000 testnet XLM alabilirsin."_

---

## 2️⃣ Twitter / X post'u (10 dk)

### Türkçe template

```
🚀 Birik — Stellar'da grup ödemesi cüzdanı, canlıda.

✅ Multi-sig social recovery
✅ Gasless (fee sponsored by Birik)
✅ 5sn settle, <0.01₺ ücret
✅ On-chain savings pool + DeFi vault
✅ 1293 test, CI/CD yeşil

Sen de dene + form doldurursan erken destekçi olursun:
🌐 stellar-split.vercel.app
📝 [Form linki]
📹 [YouTube linki]

#Stellar #Soroban #Turkey
```

### İngilizce (aynı şey EN versiyonu)

```
🚀 Birik — group expense wallet on Stellar, live today.

✅ Multi-sig social recovery
✅ Gasless (fee sponsored)
✅ 5s settle, $0.00005 fee
✅ On-chain savings pool + DeFi vault
✅ 1,293 tests passing, CI green

Try it + fill the form to join the early users list:
🌐 stellar-split.vercel.app
📝 [form link]
📹 [YouTube link]

#Stellar #Soroban #Web3
```

### Medya

- Twitter'da **video** eklemek engagement'ı 2-3x artırır. YouTube videosunu indir (yt-dlp veya savefrom.net) veya **demo'nun 30 saniyelik özetini** Twitter için ayrı kaydet (Loom'da "trim" kullan, sonra mp4 export)
- Video boyutu maksimum 512MB, 2 dk 20 sn — bizim 1 dk video rahat fit eder

### Tweet URL'sini sakla

Tweet atınca URL'sini al (ör: `twitter.com/kullanıcıadın/status/12345`) — README'nin Community Contribution bölümüne linklenecek.

---

## 3️⃣ Kullanıcı toplama — 30+ wallet nasıl bulunur? (3-7 gün pasif)

### Aşama A — yakın çevre (ilk 10-15 kullanıcı, 1 gün)

**Kim**: Arkadaşlar + aile + ev arkadaşları + iş arkadaşları.

**Nasıl**:
- WhatsApp gruplarına Freighter kurulum + form linki paylaş. 5 dk'lık sözel demo yap.
- _"Ayda kaç kere 'ben şu kadar ödedim, siz ne kadar vereceksiniz' hesabı tutuyorsun? Birik bunu otomatikleştiriyor, 2 dk'da test edebilirsin."_

### Aşama B — Türkiye Web3 community (10-15 kullanıcı, 2-3 gün)

**Hedef platformlar**:
- **Stellar Turkey** Telegram/Discord (Stellar resmi TR community'si)
- **Türk Blockchain Derneği** Discord
- **Koin Bülteni** yorumları
- **Reddit r/turkey + r/kriptoparalar** — dikkatli, spam olmadan
- **Twitter** — #StellarTurkey hashtag'ini izle, ilgili kullanıcılara reply at (`@username harika proje, benimkini de dener misin?`)

**Mesaj template** (Discord/Telegram):
```
Selam Stellar topluluğu 👋

Son 3 ay yaptığım bir projeyi bugün canlıya aldım — Birik: Stellar'da grup 
ödemesi bölüşme cüzdanı (Splitwise + Stellar).

Açık kaynak, tam test kapsamı (1,293 test), Soroban üzerinde multi-sig social 
recovery, gasless txns, savings pool, DeFi vault.

Hackathon final level için 30+ kullanıcı feedback'i gerekiyor — testnet'te 
2 dk sürer, formu doldurursanız çok makbule geçer:

🌐 stellar-split.vercel.app  
📝 [Form linki]

Teşekkürler! 🚀
```

### Aşama C — Freighter community (gerekirse, 5-10 kullanıcı, 1-2 gün)

- Freighter'ın Discord'unda `#showcase` veya `#community` kanalında ürün tanıtımı yap
- Stellar Dev Discord'un `#general` kanalında aynı mesajı paylaş

### Aşama D — Cross-promotion (opsiyonel)

- Benzer küçük Stellar/Soroban projeleriyle karşılıklı paylaşım
- Koin Bülteni'nin yazarına DM → launch yazısı iste (yanıt almama ihtimali yüksek ama dene)

### Takip metriği

Her gün Google Sheets'te bak — cevap sayısı 30'u geçince Stop.

**Muhtemel zorluk**: Stellar cüzdanı olmayanlar form dolduramaz. Çözüm: form'un en üstüne şunu ekle:
> _"Stellar cüzdanın yok mu? 2 dakikada kurabilirsin: [Freighter](https://www.freighter.app) → indir → yeni cüzdan → adresi kopyala → [Friendbot](https://friendbot.stellar.org/) → 10,000 testnet XLM al → form'a yapıştır."_

---

## 4️⃣ Feedback analizi + roadmap md (1 saat, form dolduktan sonra)

30+ cevap geldikten sonra, README'ye bir "Roadmap from user feedback" section ekle. Bu **submission için zorunlu**.

### 4.1 Analiz

Excel'de:
1. "Eksik bulduğun ne var?" sütununu aç
2. Cevapları 5-7 kategoriye ayır (mesela: "mobile iyileştirme", "daha fazla para birimi", "grup sohbet", "notifications", "hata mesajları")
3. Her kategorinin frekansını sayıyı göz kararı çıkar

### 4.2 Roadmap oluştur

Dosya: `docs/ROADMAP_FROM_FEEDBACK.md` (ben bunu şablonunu hazır yazacağım aşağıda)

Her action item'ı şu formatta yaz:
```markdown
### [KATEGORİ] — Başlık
- **Mentioned by**: X kullanıcı (Y% oranında)
- **Kısa özet**: "Kullanıcılar X istedi"
- **Aksiyon**: Ben şunu yapacağım: ...
- **Tahmini süre**: N gün
- **İlk commit**: [abc123](https://github.com/.../commit/abc123) (bu hacker sonrası ilk geliştirme commit'in)
```

### 4.3 README güncelleme

README'ye şunu ekle:
```markdown
## 🗺️ Roadmap — Community Feedback'ten

34 kullanıcı formu cevaplarının analizinden çıkan üst 5 iyileştirme:

1. **Mobile UI iyileştirmeleri** — 12 kullanıcı (35%) mobil deneyimi iyileştirme istedi. [#51](https://github.com/.../issues/51) — in progress
2. **Daha fazla para birimi** — 8 kullanıcı (24%) TRY/USD stablecoin istedi. [#52](https://github.com/.../issues/52) — planned
... (5-7 tane)

**Feedback verisi**: [docs/user-onboarding.xlsx](docs/user-onboarding.xlsx)  
**Detaylı roadmap**: [docs/ROADMAP_FROM_FEEDBACK.md](docs/ROADMAP_FROM_FEEDBACK.md)  
**İlk uygulama commit'i**: [abc123def](https://github.com/SuleymanEmirGergin/stellar-split/commit/abc123def)
```

### 4.4 Commit linki kısmı

Level 6 requirements specifically der: _"Make sure you add git commit link in the improvement section"_.

Bu demek:
- Roadmap'teki en az 1 item için gerçek bir commit yapmış olmalısın
- O commit'in SHA'sını link olarak README'de göstermelisin

**Strateji**: En düşük-effort item'ı (mesela "error message'ı daha anlaşılır yap" gibi) seç, 30 dk'lık bir commit at, SHA'sını README'ye koy. "Başlangıç yaptık, feedback sırasıyla gidecek" mesajı.

---

## 5️⃣ Demo Day presentation (3-4 saat)

### 5.1 Yapı (7-8 dakika, hackathon standardı)

| Dakika | İçerik | Slide |
|---|---|---|
| 0:00-0:30 | Problem statement | "Grup ödemesi yönetimi zor — Splitwise'in merkezi tutulmuş verisi, Excel'in kaosu" |
| 0:30-1:30 | Çözüm pitch | "Birik: Stellar üzerinde on-chain grup cüzdanı. Multi-sig, gasless, 5sn settle, near-zero ücret." |
| 1:30-2:30 | Product tour (canlı demo) | Landing → cüzdan bağla → grup oluştur → harcama ekle → settle → success |
| 2:30-3:30 | Advanced features deep-dive | Multi-sig social recovery (3 guardian, 2/3 threshold), fee sponsorship ("bitiş butonuna bas, XLM'siz bile çalışıyor") |
| 3:30-4:30 | Teknoloji + mimari | Stack diagram: React + NestJS + Prisma + Soroban. Kontrat entrypoint sayısı: 26. Backend SSE event stream |
| 4:30-5:30 | Test + production readiness | 1,293 test, Sentry monitoring, security checklist, CI/CD all green, 30+ beta user |
| 5:30-6:30 | User feedback + roadmap | En çok istenen 3 özellik, nasıl sıralıyorum, launch planı |
| 6:30-7:00 | Ask + CTA | "Early supporter olmak için form linki. Questions?" |

### 5.2 Slide tool seçimi

- **En hızlı**: [Pitch.com](https://pitch.com) — 20 dk'da güzel slides, Birik lime/plum palette'le uyumlu temalar var
- **Code-as-slides**: Claude Slides skill (`anthropic-skills:pptx`) — sen metni ver, ben .pptx üretirim
- **Figma**: daha uzun ama brand-perfect

### 5.3 Demo pratiği

**Konu**: Canlı demo Demo Day'de internet/wallet problemine takılabilir. Güvenli yaklaşım:

1. **Screen recording yedek** — Full demo'nun 3 dk'lık HD kaydını önceden yap (Loom). Internet giderse backup oynat.
2. **Localhost fallback** — Vercel düşerse `localhost:5173` + `localhost:3001` ile gösterim planı hazır olsun
3. **Demo hesabını önceden fonla** — Sunum başlamadan önce sponsor wallet'ı + test user wallet'larını friendbot'la fonla, balance düşmesin
4. **Pratikte 2-3 kere tam akış yap** — slaytlarla birlikte, tempo ölçerek

### 5.4 Q&A preparation

Muhtemel sorular (cevap hazırla):

| Soru | Kısa cevap |
|---|---|
| "Splitwise'dan farkı ne?" | "On-chain. Splitwise bir şirket, Birik kontrat. Şirket kapanınca veriniz gider, kontrat kapanmaz." |
| "Stellar neden, Ethereum değil?" | "Ücret: Eth $5-50, Stellar $0.00005. Hız: Eth 15-30s, Stellar 5s. Yerli stablecoin altyapısı Stellar'da bir adım önde." |
| "Gasless nasıl çalışıyor?" | "Fee-bump transaction. Kullanıcı imzalar, backend sponsor wallet'ıyla wrap eder, XLM'i sponsor öder. Demo'da canlı gösteriyorum." |
| "30 kullanıcı az mı?" | "Level 6 requirement'ı 30. Bizim 34 var. Launch sonrası 200'e çıkaracağım, roadmap'te plan var." |
| "Kontrat audit yapıldı mı?" | "Trail of Bits pattern'ında öz-audit yaptık (docs/SECURITY-CHECKLIST.md). Production'dan önce gerçek audit ekleyeceğiz — roadmap'te var." |
| "Nasıl kazanıyorsun?" | "Şimdi net zero — fee sponsorship Birik'ten. Büyüyünce: (a) XLM/USDC swap fee, (b) premium özellikler (advanced analytics), (c) B2B API." |

---

## ✅ Checklist — Her iş için submission evidence

| İş | Submission evidence | Nerede |
|---|---|---|
| Google Form | Form linki README'de | `## 👥 User Onboarding Data` section |
| Excel export | `docs/user-onboarding.xlsx` repoda | Commit + push |
| 30+ wallet list | Excel'deki addresses, README'de de özet (ilk 5 + "tam liste Excel'de") | README |
| Twitter post | Tweet URL'si README'de | `## Community Contribution` section |
| Demo Day | Presentation .pptx + canlı demo recording | `docs/DEMO_DAY_PITCH.pptx` |
| Feedback roadmap | `ROADMAP_FROM_FEEDBACK.md` + README özeti + commit linki | README |

---

## 🚦 Öncelik önerim

**Bu hafta sonu (önümüzdeki 2 gün):**
1. Google Form kur (20 dk)
2. Twitter post at (10 dk) + arkadaş gruplarına atış (30 dk)
3. İlk 10-15 kullanıcıyı bu hafta sonu topla

**Önümüzdeki hafta:**
4. 15-30 arası kullanıcıyı topla (Stellar TR community + Discord'lar)
5. Feedback analizi + roadmap md'si yaz

**Hafta sonu önce:**
6. Demo Day presentation hazırla + 2 kez pratik

Ben bu dosyayı master'a commit edeceğim. Submit sırasında bu adımları takip et, her birinin sonunda benim yanıma gel — README'yi güncellemem gereken yer varsa yaparım.
