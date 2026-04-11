# Render + Supabase + Upstash + Netlify — Deploy Rehberi

Tamamen ücretsiz stack. Kredi kartı gerektirmez.

## Servisler

| Servis | Ne için | Ücretsiz limit |
|--------|---------|----------------|
| [Render](https://render.com) | NestJS backend (Docker) | 750 saat/ay, 15 dk inaktifse uyur |
| [Supabase](https://supabase.com) | PostgreSQL | 500 MB, pause yok |
| [Upstash](https://upstash.com) | Redis (BullMQ) | 10.000 komut/gün |
| [Netlify](https://netlify.com) | Frontend (React/Vite) | Sınırsız statik hosting |

> **Not:** Render free tier'da servis 15 dk inaktifse uyur, ilk istek ~30 sn sürer.
> Bunu engellemek için bir uptime monitör (UptimeRobot ücretsiz) `/health/live`'ı her 10 dk ping edebilir.

---

## 1 — Supabase (PostgreSQL)

1. [supabase.com](https://supabase.com) → New project oluştur
2. **Settings → Database → Connection string → URI** kısmından bağlantı stringini al:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```
3. Bu string'i `DATABASE_URL` olarak kullanacaksın.

---

## 2 — Upstash (Redis)

1. [upstash.com](https://upstash.com) → Create Database → **Redis** → Free tier
2. **Details** sekmesinden **Redis URL**'ini al:
   ```
   rediss://default:[PASSWORD]@[HOST].upstash.io:6379
   ```
3. Bu string'i `REDIS_URL` olarak kullanacaksın.

---

## 3 — Render (Backend)

1. [render.com](https://render.com) → New → **Web Service**
2. GitHub reposunu bağla
3. Ayarlar:
   - **Root Directory:** `backend`
   - **Runtime:** Docker
   - **Dockerfile Path:** `./Dockerfile` *(render kendi bulur)*
   - **Plan:** Free
4. **Environment Variables** ekle:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Supabase URI (yukarıdan) |
   | `REDIS_URL` | Upstash URL (yukarıdan) |
   | `JWT_SECRET` | Render otomatik üretiyor (`generateValue: true`) |
   | `FRONTEND_URL` | `https://stellarsplit.netlify.app` (Netlify URL'in) |
   | `STELLAR_NETWORK` | `testnet` |
   | `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` |
   | `SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` |

5. **Deploy** — ilk deploy'da `prisma db push` çalışır, schema oluşturulur
6. Deploy bittikten sonra **Settings → Deploy Hook** URL'ini kopyala

---

## 4 — CI Auto-Deploy (GitHub Actions)

Testler geçtikten sonra CI otomatik Render'a deploy etsin:

**GitHub repo → Settings → Secrets and variables → Actions → New repository secret:**

| Secret | Değer |
|--------|-------|
| `RENDER_DEPLOY_HOOK_URL` | Render'dan kopyaladığın Deploy Hook URL |

Render dashboard'da **Settings → Auto-Deploy → Off** yap (CI halleder).

---

## 5 — Netlify (Frontend)

1. [netlify.com](https://netlify.com) → Import from Git
2. Repo'yu bağla — `netlify.toml` otomatik okunur, ayar gerekmez
3. **Site configuration → Environment variables** ekle:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | Render servis URL'in (ör. `https://stellarsplit-api.onrender.com`) |
   | `VITE_STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
   | `VITE_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` |
   | `VITE_HORIZON_URL` | `https://horizon-testnet.stellar.org` |

4. **Trigger deploy** — frontend canlıya geçer

---

## Sonuç Mimarisi

```
[GitHub master push]
        │
        ▼
[GitHub Actions CI]
  ├── contract-test
  ├── frontend-build + lint + e2e
  ├── backend-test (Node 20 & 22)
  ├── backend-build
  └── deploy-render ──────────────► [Render]
                                        │
                              preDeployCommand: prisma db push
                                        │
                                   [NestJS API]
                                   /          \
                            [Supabase]      [Upstash]
                            PostgreSQL        Redis

[Netlify] ◄── frontend build ◄── [GitHub Actions]
    │
    └── VITE_API_URL → Render URL
```
