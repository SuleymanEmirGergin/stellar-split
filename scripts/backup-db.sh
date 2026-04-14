#!/usr/bin/env bash
# backup-db.sh — PostgreSQL backup script for StellarSplit
#
# Usage:
#   DATABASE_URL="postgresql://..." BACKUP_DIR="/backups" ./scripts/backup-db.sh
#
# Environment variables:
#   DATABASE_URL   — required, PostgreSQL connection URL
#   BACKUP_DIR     — optional, output directory (default: ./backups)
#   RETENTION_DAYS — optional, delete backups older than N days (default: 30)

set -euo pipefail

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="stellarsplit_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Starting dump at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_DIR}/${FILENAME}"
echo "[backup] Saved: ${BACKUP_DIR}/${FILENAME} ($(du -sh "${BACKUP_DIR}/${FILENAME}" | cut -f1))"

# Prune old backups
if [ "${RETENTION_DAYS}" -gt 0 ]; then
  find "${BACKUP_DIR}" -name "stellarsplit_backup_*.sql.gz" \
    -mtime "+${RETENTION_DAYS}" -delete -print | \
    sed 's/^/[backup] Pruned: /'
fi

echo "[backup] Done at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
