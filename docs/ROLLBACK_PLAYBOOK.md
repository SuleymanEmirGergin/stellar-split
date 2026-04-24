# Rollback Playbook

> Use this document when something goes wrong in production.  
> Each section is a self-contained runbook for a specific failure scenario.

---

## 1. Emergency Pause (Contract Circuit-Breaker)

When an exploit or critical bug is discovered in the Soroban contract:

```bash
# 1. Immediately pause the contract (stop all writes)
stellar contract invoke \
  --id  $CONTRACT_ID \
  --source $ADMIN_SECRET_KEY \
  --network mainnet \
  -- pause \
  --admin $(stellar keys address $ADMIN_SECRET_KEY)

# 2. Verify paused state
stellar contract invoke \
  --id $CONTRACT_ID \
  --network mainnet \
  -- is_paused_query
# → true

# 3. Investigate — no user funds can move while paused
# 4. Deploy fixed contract (see §3 below)
# 5. Unpause once fix is confirmed
stellar contract invoke \
  --id $CONTRACT_ID \
  --source $ADMIN_SECRET_KEY \
  --network mainnet \
  -- unpause \
  --admin $(stellar keys address $ADMIN_SECRET_KEY)
```

**Who:** Any team member with `ADMIN_SECRET_KEY`  
**Time budget:** < 5 minutes from incident detection to pause  
**Escalate if:** Pause transaction fails (admin key compromised? Horizon down?)

---

## 2. Backend Rollback (Railway)

### Option A — Instant rollback via Railway dashboard

1. Go to [railway.app](https://railway.app) → Project → API service
2. Click **Deployments** tab
3. Find the last known-good deployment
4. Click **Redeploy** on that deployment

### Option B — Git revert + push

```bash
# Find the last good commit hash
git log --oneline --graph origin/main | head -20

# Revert the bad commit(s)
git revert <bad-commit-sha> --no-edit

# Push — Railway auto-deploys on push to main
git push origin main
```

### Option C — Emergency env var override

If the issue is a config bug (wrong REDIS_URL, wrong contract ID, etc.):

```bash
# Railway CLI
railway variables set CONTRACT_ID=<old-working-id> --service api
railway variables set REDIS_URL=<correct-url> --service api

# Force restart
railway restart --service api
```

---

## 3. Contract Upgrade / Fix Deploy

Soroban contracts are immutable once deployed, but you can:

1. **Deploy a new contract** at a new address
2. **Update the frontend** to point at the new contract address (`VITE_CONTRACT_ID`)
3. **Migrate state** — there is no automatic migration; all existing group data
   lives in the old contract.  For hackathon scope, document the cutover.

```bash
# Build optimised wasm
cd contracts/stellar_split
cargo build --target wasm32-unknown-unknown --release

# Optionally run wasm-opt (requires wasm-opt in PATH)
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/stellar_split.wasm

# Deploy to mainnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_split.wasm \
  --source $ADMIN_SECRET_KEY \
  --network mainnet

# Note the new CONTRACT_ID
# Update Railway env var
railway variables set CONTRACT_ID=<new-id> --service api

# Update frontend env var on Vercel
vercel env add VITE_CONTRACT_ID production
# → paste new contract ID

# Re-init admin on new contract
stellar contract invoke \
  --id <new-contract-id> \
  --source $ADMIN_SECRET_KEY \
  --network mainnet \
  -- init_admin \
  --admin $(stellar keys address $ADMIN_SECRET_KEY)
```

---

## 4. Database Restore

```bash
# List available backups (S3)
aws s3 ls s3://$S3_BUCKET/birik-db/ --recursive | sort -r | head -10

# Download and restore
DATABASE_URL="$PROD_DATABASE_URL" \
  ./backend/scripts/restore-db.sh \
  s3://$S3_BUCKET/birik-db/20260424T020000Z/birik-db-20260424T020000Z.sql.gz

# After restore, re-apply any pending migrations
cd backend && npx prisma migrate deploy
```

**RPO (Recovery Point Objective):** 24 hours (daily backups at 02:00 UTC)  
**RTO (Recovery Time Objective):** ~15 minutes for restore + migrate  

---

## 5. Redis / BullMQ Recovery

If Redis loses all data (restart, failover):

```bash
# Queue state is non-persistent by default.
# Pending jobs will be lost — manually re-trigger affected operations:

# Recurring templates — reschedule next run
curl -X POST https://api.stellarsplit.app/api/v1/recurring/reschedule-all \
  -H "Authorization: Bearer $ADMIN_JWT"

# DLQ — failed jobs in Redis are gone; check AuditLog for them
npx prisma studio  # → Filter AuditLog where action = 'JOB_MOVED_TO_DLQ'
```

---

## 6. Monitoring & Alert Runbooks

| Alert | Threshold | Response |
|-------|-----------|----------|
| `ApiDown` | > 1 min | Check Railway logs; restart service if OOM |
| `HighErrorRate` | 5xx > 5% | Check recent deploy; rollback if needed (§2) |
| `DlqJobsCritical` | > 10 in 5 min | Check worker logs; restart workers |
| `SettlementConfirmationSlow` | P95 > 60 s | Check [Stellar Dashboard](https://dashboard.stellar.org) |
| `HighMemoryUsage` | > 512 MB | Scale up Railway plan or investigate memory leak |

---

## 7. Contact / Escalation

| Severity | Who | How |
|----------|-----|-----|
| P0 — funds at risk | Admin team | Telegram group `#birik-incident` |
| P1 — service down | Backend on-call | PagerDuty / Slack `#alerts` |
| P2 — degraded | Anyone | Slack `#birik-backend` |
