# StellarSplit - Dis Entegrasyonlar

Gercek servisler `frontend/.env` icinde ilgili degiskenler tanimlandiginda devreye girer.

---

## Canli veri ve baglanti ozeti

Sistem **iki modda** calisir: **Demo mod** (header'daki kalkan ikonu) ve **Canli mod** (Testnet).

| Bilesen | Demo mod | Canli mod (Testnet) |
|---------|----------|----------------------|
| **Stellar / Soroban** | Mock (blokzincir cagrisi yok, localStorage + sahte gecikme) | Gercek: `VITE_SOROBAN_RPC_URL` + `VITE_CONTRACT_ID` (varsayilan testnet) |
| **Cüzdan (Freighter)** | Gercek baglanti (adres alinir) | Gercek baglanti, islemler testnet uzerinde imzalanir |
| **Grup / harcama / takas** | Sahte veri (contract.ts `isDemoMode()` true) | Gercek kontrat cagrilari: create_group, add_expense, get_balances, settle_group vb. |
| **XLM fiyati** | Gercek (CoinGecko API) | Gercek (CoinGecko API) |
| **Ağ istatistikleri** | Gercek (Horizon testnet) | Gercek (Horizon testnet) |
| **Makbuz yukleme (IPFS)** | .env varsa gercek (Pinata/Infura/ozel), yoksa Base64 | Ayni |
| **Makbuz AI tarama** | .env'de `VITE_OPENAI_API_KEY` varsa gercek, yoksa mock | Ayni |
| **DeFi / getiri paneli** | Simule; `VITE_DEFI_APY_URL` veya `VITE_DEFI_APY` ile canlı oran | Aynı |
| **Discord / Slack** | Webhook URL girilirse harcama bildirimi gerçek | Aynı |
| **Abonelikler** | Varsayılan localStorage; `VITE_SUBSCRIPTIONS_API_URL` ile backend senkron | Aynı |

**Canli modda tam baglanti icin:**

1. Header'dan **Demo modu kapat** (Testnet etiketine gec).
2. Freighter cüzdanini **Testnet** agina al (ayarlar).
3. `.env` dosyasinda (opsiyonel) Stellar varsayilanlari kullanilir; farkli kontrat/RPC icin:
   - `VITE_SOROBAN_RPC_URL`, `VITE_CONTRACT_ID`, `VITE_HORIZON_URL`
4. Makbuz icin IPFS: `VITE_PINATA_JWT` veya Infura/ozel (yoksa Base64).
5. AI tarama icin: `VITE_OPENAI_API_KEY` (yoksa mock doner).

Demo mod sadece **blokzincir islemlerini** (grup olusturma, harcama, takas) simule eder; cüzdan, fiyat ve ag bilgisi her zaman gercek baglantilidir.

---

## Makbuz depolama (IPFS)

Dosya: `frontend/src/lib/storage.ts`

Hangi servisin kullanilacagi oncelik sirasina gore belirlenir:

**1. Pinata**

- Degisken: `VITE_PINATA_JWT`
- Nasil: pinata.cloud hesabi ac, API Keys kismindan JWT olustur, .env dosyasina yapistir.

**2. Infura IPFS**

- Degiskenler: `VITE_INFURA_IPFS_PROJECT_ID` ve `VITE_INFURA_IPFS_PROJECT_SECRET`
- Nasil: infura.io hesabi ac, IPFS projesi olustur, Project ID ile Secret i .env e ekle.

**3. Ozel endpoint**

- Degisken: `VITE_IPFS_UPLOAD_URL` (zorunlu)
- Istege bagli: `VITE_IPFS_UPLOAD_AUTH_HEADER` (ornegin: Bearer TOKEN_DEGERI)
- API beklentisi: POST ile multipart form-data, dosya alani adi "file". Cevap JSON da Hash, IpfsHash veya cid alani olmali.

**Ortak**

- `VITE_IPFS_GATEWAY`: Donen linkin base adresi. Varsayilan: https://ipfs.io/ipfs/
  Pinata kullaniyorsan https://gateway.pinata.cloud/ipfs/ yazabilirsin.

Hicbiri tanimli degilse makbuz sadece Base64 data URL olarak tutulur (harici servis yok). Bir hata olursa yine Base64 e dusulur.

---

## Makbuz tarama (Wiro / OpenAI Vision)

Dosya: `frontend/src/lib/ai.ts`

**Oncelik:** 1) Wiro.ai, 2) OpenAI Vision, 3) mock.

**Wiro.ai (oncelikli)**

- Degisken: `VITE_WIRO_API_KEY`
- Nasil: wiro.ai dashboard’da kayit ol, proje olustur, API key al. Makbuz gorseli Run (multipart) ile gonderilir, Task/Detail ile sonuc poll edilir.
- Endpoint: `POST https://api.wiro.ai/v1/Run/openai/gpt-5-2` (inputImage + prompt), ardindan `POST https://api.wiro.ai/v1/Task/Detail` (tasktoken ile).

**OpenAI Vision (Wiro yoksa)**

- Degisken: `VITE_OPENAI_API_KEY`
- Gorsel Chat Completions (gpt-4o) ile gonderilir, cevap JSON’dan merchant, items, totalAmount cekilir.

Hicbiri tanimli degilse mock (sabit ornek) doner.

Guvenlik: Key’ler frontend bundle’da kalir. Canli ortam icin backend proxy onerilir.

---

## Ozet

| Ne          | Env (IPFS icin biri)     | Dosya           | Ne olur                               |
|-------------|---------------------------|-----------------|----------------------------------------|
| Makbuz      | VITE_PINATA_JWT           | lib/storage.ts  | Pinata ile IPFS e yuklenir            |
| Makbuz      | VITE_INFURA_IPFS_*        | lib/storage.ts  | Infura IPFS ile yuklenir              |
| Makbuz      | VITE_IPFS_UPLOAD_URL      | lib/storage.ts  | Ozel URL e yuklenir                   |
| Makbuz      | VITE_IPFS_GATEWAY (opsiyonel) | lib/storage.ts | IPFS link base URL                    |
| AI tarama   | VITE_WIRO_API_KEY         | lib/ai.ts       | Wiro Run + Task/Detail ile makbuz okunur |
| AI tarama   | VITE_OPENAI_API_KEY       | lib/ai.ts       | Wiro yoksa OpenAI Vision kullanilir   |
| DeFi APY    | VITE_DEFI_APY_URL         | lib/defi.ts     | GET ile { apy: number } alan endpoint  |
| DeFi APY    | VITE_DEFI_APY (opsiyonel) | lib/defi.ts     | Sabit oran (URL yoksa kullanilir)     |
| Abonelikler | VITE_SUBSCRIPTIONS_API_URL | lib/recurring.ts | GET/POST ile senkron backend          |

IPFS ile ilgili hicbir env yoksa makbuz Base64 mock olarak kalir.

---

## Discord / Slack bildirimleri

Dosya: `frontend/src/lib/notifications.ts`, `webhook-proxy.ts`

Grup detayda **Social** sekmesi → **Discord / Slack Notifications** alanına webhook URL yapıştır. Harcama eklendiğinde bu adrese POST atılır.

- **Slack:** Kanal → Ayarlar → Uygulamalar Ekle → Incoming Webhooks → Webhook URL’yi kopyala (örn. `https://hooks.slack.com/services/T.../B.../xxx`).
- **Discord:** Sunucu Ayarları → Entegrasyonlar → Webhooks → Yeni Webhook → URL’yi kopyala (örn. `https://discord.com/api/webhooks/...`).

URL sadece tarayıcıda (localStorage) saklanır; `.env` gerekmez.

---

## DeFi canlı APY

Dosya: `frontend/src/lib/defi.ts`

Varsayılan sabit oran %7.5. Canlı oran için `.env`:

- **`VITE_DEFI_APY_URL`:** GET ile JSON dönen endpoint. Cevap örneği: `{ "apy": 8.2 }`. Uygulama açılışta bu URL’yi çağırır, dönen `apy` değeri panelde ve getiri hesaplamasında kullanılır.
- **`VITE_DEFI_APY`:** Sabit sayı (örn. `8.5`). URL tanımlı değilse veya istek başarısızsa bu kullanılır.

Örnek: Kendi backend’inde `GET /api/defi/apy` → `{ "apy": 7.8 }` döndürüp `VITE_DEFI_APY_URL=https://.../api/defi/apy` yazabilirsin.

---

## Abonelikler gerçek entegrasyon (backend API)

Dosya: `frontend/src/lib/recurring.ts`

Varsayılan: Abonelikler sadece **localStorage**’da (cihaza özel). Tüm cihazlarda senkron ve kalıcı liste için isteğe bağlı backend:

- **`VITE_SUBSCRIPTIONS_API_URL`:** Backend base URL (sorgu parametresi eklenir).

**Beklenen API:**

- **GET** `{VITE_SUBSCRIPTIONS_API_URL}?groupId=123`  
  Cevap: `{ "subscriptions": [ ... ] }` veya doğrudan `[ ... ]` (RecurringTemplate dizisi).

- **POST** `{VITE_SUBSCRIPTIONS_API_URL}`  
  Body: `{ "groupId": 123, "subscriptions": [ ... ] }`  
  Abonelik listesi güncellendiğinde (ekleme/silme) frontend bu isteği atar.

Gruba girildiğinde GET ile liste çekilir; kaydetmede hem localStorage güncellenir hem POST ile backend’e gönderilir. Backend’i (Supabase, Firebase, kendi API’n) sen yazarsın; frontend sadece bu sözleşmeye uyar.
