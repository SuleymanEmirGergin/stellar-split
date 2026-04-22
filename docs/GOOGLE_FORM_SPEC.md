# Google Form — Birik MVP Kullanıcı Testi Formu

Bu dosya, `forms.google.com` üzerinde oluşturulacak formun birebir spec'idir. Aşağıdaki soruları sırasıyla ekleyin, formu oluşturduktan sonra paylaşım linkini `README.md` → **💬 User Feedback** bölümüne ekleyin.

---

## 📝 Form Başlığı

> **Birik — Testnet Kullanıcı Geri Bildirimi**
> _Group expense splitting on Stellar/Soroban — help us improve!_

## 📝 Form Açıklaması

> Birik'i test ettiğiniz için teşekkürler! 🙌
> Bu formu doldurmanız ~2 dakika sürer. Yanıtlarınız MVP'yi geliştirmemize doğrudan katkı sağlayacak.
> Canlı demo: https://stellar-split.vercel.app
> Test adresleri: https://github.com/SuleymanEmirGergin/stellar-split/blob/master/docs/TEST_ADDRESSES.md

---

## 🔢 Sorular (sırayla)

### 1. Ad / Takma Ad
- **Tip:** Short answer (Kısa yanıt)
- **Required:** ✅
- **Description:** Nasıl hitap edelim? (Gerçek isim veya rumuz olabilir.)

### 2. E-posta adresi
- **Tip:** Short answer + Email validation (Email doğrulama)
- **Required:** ✅
- **Response validation:** Text → Email

### 3. Stellar Testnet cüzdan adresiniz
- **Tip:** Short answer
- **Required:** ✅
- **Description:** `G...` ile başlayan 56 karakterlik Stellar public key. Freighter → Account details → Copy address.
- **Response validation:** Regular expression → `^G[A-Z2-7]{55}$` (Stellar public key formatı)

### 4. Birik'i genel olarak nasıl değerlendirirsiniz?
- **Tip:** Linear scale (Doğrusal ölçek)
- **Required:** ✅
- **Range:** 1–5
- **Labels:** `1 = Çok kötü`, `5 = Harika`

### 5. Hangi özellikleri denediniz? (Birden fazla seçebilirsiniz)
- **Tip:** Checkboxes (Onay kutuları)
- **Required:** ✅
- **Options:**
  - [ ] Grup oluşturma
  - [ ] Harcama ekleme
  - [ ] Bakiye görüntüleme
  - [ ] Settle / Uzlaşma
  - [ ] Savings pool (birikim havuzu)
  - [ ] Recurring expense (tekrarlayan ödeme)
  - [ ] QR / link ile davet
  - [ ] Discord/Slack webhook
  - [ ] Social recovery (guardian)
  - [ ] Diğer (belirtin)

### 6. UI/UX ne kadar kolay geldi?
- **Tip:** Linear scale
- **Required:** ✅
- **Range:** 1–5
- **Labels:** `1 = Çok kafa karıştırıcı`, `5 = Çok akıcı`

### 7. En çok hoşunuza giden 1 özellik neydi?
- **Tip:** Paragraph (Paragraf)
- **Required:** ❌

### 8. Sizi en çok zorlayan 1 şey neydi? (bug, UX, yavaşlık, vb.)
- **Tip:** Paragraph
- **Required:** ✅

### 9. Eklenmesini en çok istediğiniz özellik nedir?
- **Tip:** Paragraph
- **Required:** ❌

### 10. Birik'i arkadaşınıza tavsiye eder misiniz?
- **Tip:** Linear scale (NPS)
- **Required:** ✅
- **Range:** 0–10
- **Labels:** `0 = Asla`, `10 = Kesinlikle`

### 11. Test sırasında bir hata ile karşılaştınız mı? Detay verin.
- **Tip:** Paragraph
- **Required:** ❌

### 12. İletişime açık mısınız? (opsiyonel)
- **Tip:** Multiple choice (Tek seçimli)
- **Required:** ❌
- **Options:**
  - Evet — ileride beta için bana yaz
  - Hayır — sadece bu form yeterli

---

## 🔄 Form → Excel workflow

1. Form oluşturulduktan sonra **Responses** sekmesine geçin.
2. Sağ üstteki **Google Sheets** ikonuna tıklayıp response'ları otomatik sheet'e bağlayın.
3. Sheet'i **File → Download → Microsoft Excel (.xlsx)** olarak indirin.
4. İndirilen dosyayı repo'ya **`docs/user-feedback.xlsx`** olarak ekleyip commit'leyin.
5. README'deki feedback linki bu dosyayı göstermeli.

---

## 🔗 Form linkleri

- **Form paylaşım URL:** https://forms.gle/oFSNuU6a9NthmfJR7
- **Sheet URL:** _(Google Sheets bağlanınca eklenecek)_
- **Repo'daki Excel path:** `docs/user-feedback.xlsx`
