# Deployment Runbook — Birik

Canlı ortam yapılandırmasının ve ilk deploy'dan bugüne kadar edindiğimiz
operasyonel bilgilerin kayıt defteri. Hackathon jürisi buraya bakıp "bu
gerçekten üretime hazır mı?" sorusuna net cevap alabilmeli.

---

## Topoloji

| Katman          | Platform           | URL / identifier                                                                                    |
| --------------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| **Frontend**    | Vercel             | [`stellar-split.vercel.app`](https://stellar-split.vercel.app)                                      |
| **Landing alt** | Netlify (preview)  | [`monumental-melomakarona-b6fe1d.netlify.app`](https://monumental-melomakarona-b6fe1d.netlify.app)  |
| **Backend API** | Railway            | [`stellar-split-production.up.railway.app`](https://stellar-split-production.up.railway.app)        |
| **Postgres**    | Railway (internal) | provisioned inside `sincere-blessing` project                                                        |
| **Redis**       | Railway (internal) | provisioned inside `sincere-blessing` project                                                        |
| **Main contract** | Stellar Testnet  | `CDTQVQROF6WMB6BG35F4TQ5L7E5SZ6TASMG74DVG7DVACEATHLLTZ6LW`                                          |
| **SPLT token**  | Stellar Testnet    | `CBPN3COESIYKJSBSGE474E55TAMCH7GDMV6MP5N43CI4XBGVTNGM3APE`                                          |
| **Error tracking** | Sentry (de.sentry.io project `4511206380404816`) | DSN configured in `backend/src/instrument.ts` (loaded as very first import in `main.ts`) |

---

## Live probe matrix — 2026-04-24 06:41 UTC

| Endpoint                   | Status        | Response sample                                                   |
| -------------------------- | ------------- | ----------------------------------------------------------------- |
| `GET /health/live`         | **200**       | `{"status":"ok","info":{"memory_heap":{"status":"up"}},...}`      |
| `GET /health/ready`        | **200**       | `{"status":"ok","info":{"database":{"status":"up"},"memory_heap":{"status":"up"}},...}` |
| `GET /metrics`             | **200**       | Prometheus, `stellarsplit_process_cpu_seconds_total`, heap + GC + event-loop histograms |
| `GET /analytics/summary`   | **200 / 500** | Cached 60s, 30 req/min throttle. Returns `totalGroups/totalMembers/totalExpenses/totalSettled/totalVolumeXlm/dau/wau/mau/dauTrend[]` on success. 500 path is caught and forwarded to Sentry. |

Reproducible one-liner (copy-paste into a terminal):

```bash
for ep in health/live health/ready metrics analytics/summary; do
  echo "=== $ep ==="
  curl -s -o /dev/null -w "HTTP %{http_code}  size=%{size_download}B  t=%{time_total}s\n" \
       --max-time 10 "https://stellar-split-production.up.railway.app/$ep"
done
```

---

## Railway env var checklist

Her Railway service redeploy'ından önce aşağıdaki değişkenlerin dolu olduğundan emin olun. Backend boot'ta bir validator (`backend/src/common/config/env.validation.ts`) bunları yoklar ve eksikse anlaşılır bir hata mesajı ile ölür (sessiz restart yerine).

### Zorunlu (backend çalışmazsa backend bunları ister)

```ini
NODE_ENV=production
PORT=<Railway auto-assigns>
FRONTEND_URL=https://monumental-melomakarona-b6fe1d.netlify.app
DATABASE_URL=<Railway Postgres plugin injects>
REDIS_URL=<Railway Redis plugin injects>
JWT_SECRET=<64+ char random string>
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_CONTRACT_ID=CDTQVQROF6WMB6BG35F4TQ5L7E5SZ6TASMG74DVG7DVACEATHLLTZ6LW
VAPID_PUBLIC_KEY=<`npx web-push generate-vapid-keys` çıktısı — satır 1>
VAPID_PRIVATE_KEY=<`npx web-push generate-vapid-keys` çıktısı — satır 2>
VAPID_SUBJECT=mailto:admin@birik.app
```

### Opsiyonel ama canlıya önerilir

```ini
# Error tracking — default DSN already hard-coded in instrument.ts; overriding
# via env lets you point to a staging/dev Sentry project without rebuilding.
SENTRY_DSN=https://225b39a31d0256caadbe2602d25dfbdb@o4511206376734720.ingest.de.sentry.io/4511206380404816
SENTRY_TRACES_SAMPLE_RATE=0.2

# Fee sponsorship ("gasless settle"). Without this, POST /sponsor/fee-bump
# returns 503 gracefully — the rest of the API keeps working.
SPONSOR_SECRET_KEY=<56-char Stellar testnet secret starting with 'S'>

# Tuning knobs (defaults are sensible)
JWT_ACCESS_TTL=900          # seconds
JWT_REFRESH_TTL=604800      # seconds (7 days)
```

---

## Boot-time dependency chain — what we learned

The production image had three transitive peers from `@prisma/config` and
`@nestjs/cache-manager` that npm's production install was pruning. Each
one surfaced as `Cannot find module` only at container start:

| Missing peer  | Required by                | Fix commit                                                |
| ------------- | -------------------------- | --------------------------------------------------------- |
| `effect`      | `@prisma/config`           | [`fb768f7`](../commit/fb768f7) (bullmq + effect)          |
| `keyv`        | `@nestjs/cache-manager`    | [`fb768f7`](../commit/fb768f7) (bullmq + keyv)            |
| `empathic`    | `@prisma/config`           | [`5a202de`](../commit/5a202de) (empathic pin)             |

Lesson: when you see `Cannot find module 'X'` in a `MODULE_NOT_FOUND`
stack whose `requireStack` runs through a package you didn't author,
`grep -A1 "\"X\":" package-lock.json` to check which version the
transitive tree wants, then pin it as a direct dependency at that exact
version. Don't rely on npm to hoist peer deps of peer deps.

---

## Redeploy runbook

### Auto (preferred — after PR merge to `master`)

CI has a `deploy-railway` job that skips when `vars.RAILWAY_SERVICE_ID`
is unset. Once the repo variable is added, every green master build
triggers a Railway redeploy.

**Setup (one-time):**

1. GitHub → repo Settings → Secrets and variables → Actions
2. **Variables** tab → `New repository variable`
   - Name: `RAILWAY_SERVICE_ID`
   - Value: `<Railway service UUID — see Railway UI: Settings → General → Service ID>`
3. **Secrets** tab → `New repository secret`
   - Name: `RAILWAY_TOKEN`
   - Value: `<railway.app → Account Settings → Tokens → New token>`

After this, the CI `deploy-railway` step runs `railway redeploy --service $RAILWAY_SERVICE_ID --yes` on every master push.

### Manual (fallback — from Railway UI)

1. railway.app → **sincere-blessing** project → **stellar-split** service
2. **Deployments** → latest commit → "⋯" menu → **Redeploy**
3. Watch **Logs** tab; Healthcheck probe at `Path: /health/live`, `Retry window: 2m0s`
4. Success marker: `[1/1] Healthcheck succeeded!` → `Deployment successful`

### Manual (fallback — from local CLI)

```bash
npm install -g @railway/cli
railway login
railway link                         # pick sincere-blessing → stellar-split
railway redeploy                     # picks current linked service
```

---

## Post-deploy verification

```bash
# 1. Basic liveness — should be 200 within 5s
curl -fsS https://stellar-split-production.up.railway.app/health/live

# 2. Dependency liveness — 200 means Postgres is reachable
curl -fsS https://stellar-split-production.up.railway.app/health/ready

# 3. Metrics — should contain stellarsplit_* counters
curl -fsS https://stellar-split-production.up.railway.app/metrics | head -20

# 4. Analytics — first call warms 60s cache; subsequent calls are fast
curl -fsS https://stellar-split-production.up.railway.app/analytics/summary | jq

# 5. Swagger (when NODE_ENV !== 'production' and Swagger is exposed)
open https://stellar-split-production.up.railway.app/api/docs
```

If (4) returns a 5xx, check Sentry — the instrument loads before NestJS
so uncaught errors reach the project even when the HTTP handler fails.

---

## Known quirks

- **`/analytics/summary` 500 on cold cache when Redis is unreachable** —
  the service wraps `cache.set()` in try/catch but `cache.get()` throws
  unwrapped. When Redis is flapping the first un-cached request bubbles
  up. Subsequent requests succeed because the summary is computed in
  memory before the cache read fails out. Tracked in Sentry; medium
  priority because we want public metrics to degrade to uncached, not
  500.
- **Railway CDN `x-railway-fallback: true` with 404** — this is what
  Railway returns when the domain is wired but no active deployment
  serves it. Means redeploy is needed; not an app bug.
- **`empathic`, `effect`, `keyv` drift** — if a future `@prisma/config`
  or `@nestjs/cache-manager` bump changes peer versions, repeat the pin
  pattern above.

---

## Change log

| Date           | Event                                                                 | Commit      |
| -------------- | --------------------------------------------------------------------- | ----------- |
| 2026-04-24     | Prod-ready: backend live, /health/ready green, Sentry wired           | _(this PR)_ |
| 2026-04-24     | `empathic` pinned (3rd @prisma/config peer)                           | `5a202de`   |
| 2026-04-24     | `bullmq` reverted to ^5.4.0 (had been accidentally typed as ^0.0.1)   | `fb768f7`   |
| 2026-04-24     | `effect` + `keyv` pinned; Sentry refactored to `instrument.ts` pattern | `4ef58ea`   |
| 2026-04-24     | Jest transformIgnorePatterns widened for @aws-sdk ESM                 | `19b0a99`   |
| earlier        | Full L6 scaffolding — fee sponsorship, metrics dashboard, user guide  | `07b5b68`   |
