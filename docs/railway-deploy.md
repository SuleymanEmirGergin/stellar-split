# Railway Deploy Rehberi

Bu proje **Railway** üzerinde üç servis çalıştırır: NestJS API, PostgreSQL ve Redis.
CI/CD pipeline testleri geçtikten sonra otomatik olarak deploy eder.

---

## Genel Mimari

```
[GitHub master push]
        │
        ▼
[GitHub Actions CI]
  ├── backend-test  (birim + e2e testler, Node 20 & 22)
  ├── backend-build (TypeScript derleme, Docker build doğrulama)
  └── deploy-railway ──────────────► [Railway API servisi]
                                            │
                                   releaseCommand:
                                   prisma migrate deploy
                                            │
                                       [NestJS API]
                                       /          \
                               [Railway Postgres]  [Railway Redis]
```

---

## Adım 1 — Railway Projesi Oluştur

1. [railway.app](https://railway.app) → **New Project**
2. Sırasıyla üç servis ekle:

### PostgreSQL

- **+ New** → **Database** → **PostgreSQL** seç
- Railway otomatik olarak `DATABASE_URL` değişkenini üretip API servisine bağlar
- Başka bir şey yapman gerekmez

### Redis

- **+ New** → **Database** → **Redis** seç
- Railway otomatik olarak `REDIS_URL` değişkenini üretip API servisine bağlar
- Başka bir şey yapman gerekmez

### API (NestJS backend)

- **+ New** → **GitHub Repo** → bu repoyu seç
- Ayarlar:
  - **Root Directory:** `backend`
  - **Build:** Railway, `backend/Dockerfile`'ı otomatik bulur
- **Önemli:** Sağ üstte **Settings → Source → Auto Deploy'u kapat** — deploy'u CI halleder, Railway değil

---

## Adım 2 — Ortam Değişkenleri

Railway dashboard'da **API servisi → Variables** sekmesine gir, şunları ekle:

| Değişken | Değer | Not |
|----------|-------|-----|
| `NODE_ENV` | `production` | |
| `JWT_SECRET` | en az 64 karakter rastgele string | `openssl rand -hex 32` ile üret |
| `JWT_ACCESS_TTL` | `900` | Access token süresi (saniye) |
| `JWT_REFRESH_TTL` | `604800` | Refresh token süresi (7 gün) |
| `FRONTEND_URL` | `https://stellarsplit.netlify.app` | CORS için, Netlify URL'in |
| `STELLAR_NETWORK` | `testnet` | Mainnet'e geçince `mainnet` yap |
| `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` | |
| `SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | |

> `DATABASE_URL` ve `REDIS_URL` PostgreSQL/Redis servislerini bağladığında Railway otomatik enjekte eder, elle girmen gerekmez.

> `PORT` değişkenini Railway kendisi ayarlar, girme.

---

## Adım 3 — CI/CD İçin GitHub Secrets

Testler geçince CI otomatik deploy etsin diye iki değer lazım:

### RAILWAY_TOKEN

1. Railway dashboard → sol altta profil ikonu → **Account Settings**
2. **Tokens** sekmesi → **Create Token**
3. Token'ı kopyala

GitHub reposuna ekle:
> **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**
> - Name: `RAILWAY_TOKEN`
> - Value: kopyaladığın token

### RAILWAY_SERVICE_ID

1. Railway dashboard → API servisi → **Settings** sekmesi
2. En altta **Service ID** yazar, kopyala

GitHub'a ekle:
> **GitHub repo → Settings → Secrets and variables → Actions → New repository variable**
> - Name: `RAILWAY_SERVICE_ID`  *(secret değil, variable)*
> - Value: kopyaladığın servis ID'si

---

## Adım 4 — İlk Deploy

1. `master` branch'ine bir push at (ya da mevcut commit'i push'la)
2. GitHub Actions'da `deploy-railway` job'unun çalışmasını bekle
3. Railway dashboard'da deploy loglarını takip et
4. `releaseCommand` olarak `npx prisma migrate deploy` çalışır — schema oluşturulur
5. Servis ayağa kalktığında `GET /health/live` → `200 OK` döner

---

## Adım 5 — Frontend (Netlify)

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project**
2. Bu repoyu seç — `netlify.toml` otomatik okunur, build ayarı gerekmez
3. **Site configuration → Environment variables** ekle:

| Değişken | Değer |
|----------|-------|
| `VITE_API_URL` | Railway API URL'in (ör. `https://stellarsplit-api.up.railway.app`) |
| `VITE_STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `VITE_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `VITE_HORIZON_URL` | `https://horizon-testnet.stellar.org` |

4. **Deploy site** — frontend canlıya geçer

---

## Sağlık Kontrolü

Railway `healthcheckPath = "/health/live"` ile servisi izler.

| Endpoint | Ne kontrol eder |
|----------|-----------------|
| `GET /health/live` | Process ayakta mı? (memory) |
| `GET /health/ready` | Database bağlantısı var mı? |

---

## Prisma Migrations

Her deploy öncesi `railway.toml`'daki `releaseCommand` çalışır:

```toml
releaseCommand = "npx prisma migrate deploy"
```

Bu komut yeni instance traffic almaya başlamadan önce çalışır — sıfır kesinti ile schema güncellemesi sağlar.

Lokal geliştirmede yeni migration oluşturmak için:

```bash
cd backend
npx prisma migrate dev --name <migration_adi>
```

Oluşan `prisma/migrations/` klasörünü commit'le — Railway otomatik uygular.

---

## Opsiyonel Değişkenler

| Değişken | Açıklama |
|----------|----------|
| `SENTRY_DSN` | Hata takibi (Sentry). Boş bırakılırsa devre dışı |
| `METRICS_SECRET` | `GET /metrics` endpointi için Bearer token |
| `SSE_HEARTBEAT_INTERVAL_MS` | SSE bağlantısı canlı tutma süresi, varsayılan `25000` |
| `LOG_LEVEL` | `debug` / `info` / `warn` / `error`, varsayılan `info` |
| `S3_ENDPOINT` | Makbuz fotoğrafı için Cloudflare R2 veya AWS S3 URL'i |
| `S3_ACCESS_KEY_ID` | S3 erişim anahtarı |
| `S3_SECRET_ACCESS_KEY` | S3 gizli anahtar |
| `S3_BUCKET_NAME` | S3 bucket adı |
| `S3_REGION` | S3 bölgesi (R2 için `auto`) |
| `S3_PUBLIC_URL` | Yüklenen dosyaların public URL'i |
