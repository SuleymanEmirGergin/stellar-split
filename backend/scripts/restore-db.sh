#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Birik DB Restore Script
# ─────────────────────────────────────────────────────────────────────────────
# Usage:
#   DATABASE_URL=postgres://... ./scripts/restore-db.sh /backups/birik-db-20260424T020000Z.sql.gz
#
# For S3 restore:
#   S3_BUCKET=my-bucket ./scripts/restore-db.sh s3://my-bucket/birik-db/20260424T020000Z/birik-db-20260424T020000Z.sql.gz
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DUMP_PATH="${1:-}"
if [[ -z "${DUMP_PATH}" ]]; then
  echo "Usage: $0 <dump-file.sql.gz | s3://bucket/key>"
  exit 1
fi

# Download from S3 if path starts with s3://
if [[ "${DUMP_PATH}" == s3://* ]]; then
  LOCAL_DUMP="/tmp/birik-restore-$(date +%s).sql.gz"
  echo "[restore] Downloading ${DUMP_PATH} → ${LOCAL_DUMP}"
  aws s3 cp "${DUMP_PATH}" "${LOCAL_DUMP}"
  DUMP_PATH="${LOCAL_DUMP}"
fi

echo "[restore] ⚠️  WARNING: This will overwrite the current database!"
echo "[restore] Dump file: ${DUMP_PATH}"
read -rp "[restore] Type 'yes' to confirm: " CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
  echo "[restore] Aborted."
  exit 1
fi

echo "[restore] Restoring from ${DUMP_PATH}…"
zcat "${DUMP_PATH}" | psql "${DATABASE_URL}"

echo "[restore] ✅ Restore complete. Run 'npx prisma migrate deploy' if schema migrations are needed."
