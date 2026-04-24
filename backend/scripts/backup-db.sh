#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Birik DB Backup Script
# ─────────────────────────────────────────────────────────────────────────────
# Usage (Railway cron or local):
#
#   DATABASE_URL=postgres://... BACKUP_DIR=/backups ./scripts/backup-db.sh
#
# Environment variables:
#   DATABASE_URL    — PostgreSQL connection string (required)
#   BACKUP_DIR      — Local directory to write dumps to (default: /tmp/backups)
#   RETAIN_DAYS     — How many days of backups to keep (default: 7)
#   S3_BUCKET       — If set, upload to s3://$S3_BUCKET/birik-db/ using aws-cli
#   SLACK_WEBHOOK   — If set, send a success/failure notification
#
# Cron (Railway): run daily at 02:00 UTC
#   0 2 * * * /app/scripts/backup-db.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"
DUMP_FILE="${BACKUP_DIR}/birik-db-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Starting database dump at ${TIMESTAMP}"

# pg_dump — compress inline to avoid large temp files
pg_dump \
  --format=plain \
  --no-owner \
  --no-acl \
  --exclude-table="AuditLog" \
  "${DATABASE_URL}" \
  | gzip --best > "${DUMP_FILE}"

DUMP_SIZE=$(du -sh "${DUMP_FILE}" | cut -f1)
echo "[backup] Dump complete: ${DUMP_FILE} (${DUMP_SIZE})"

# ── Upload to S3 (optional) ────────────────────────────────────────────────
if [[ -n "${S3_BUCKET:-}" ]]; then
  S3_KEY="birik-db/${TIMESTAMP}/birik-db-${TIMESTAMP}.sql.gz"
  echo "[backup] Uploading to s3://${S3_BUCKET}/${S3_KEY}"
  aws s3 cp "${DUMP_FILE}" "s3://${S3_BUCKET}/${S3_KEY}" \
    --storage-class STANDARD_IA \
    --sse AES256
  echo "[backup] S3 upload complete"
fi

# ── Prune old local dumps ───────────────────────────────────────────────────
echo "[backup] Pruning backups older than ${RETAIN_DAYS} days from ${BACKUP_DIR}"
find "${BACKUP_DIR}" -name "birik-db-*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete

# ── Slack notification ──────────────────────────────────────────────────────
if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
  STATUS="success"
  MESSAGE="✅ *Birik DB Backup* — ${TIMESTAMP}\nSize: ${DUMP_SIZE}\nRetain: ${RETAIN_DAYS} days"
  curl -sf -X POST "${SLACK_WEBHOOK}" \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"${MESSAGE}\"}" \
    || echo "[backup] Slack notification failed (non-fatal)"
fi

echo "[backup] Done"
