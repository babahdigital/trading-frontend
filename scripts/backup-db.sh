#!/bin/bash
# BabahAlgo PostgreSQL Backup Script
# Cron: 0 3 * * * /opt/backups/backup-db.sh >> /opt/backups/backup.log 2>&1
#
# This script is kept in the repo for reference.
# The actual cron job on VPS2 runs /opt/backups/backup-db.sh

set -euo pipefail

BACKUP_DIR="/opt/backups/db"
DB_NAME="trading_commercial"
DB_USER="trading_user"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup: $FILENAME"

# Dump and compress
pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: $FILENAME ($SIZE)"

# Remove old backups
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date -Iseconds)] Cleaned $DELETED old backups (>${RETENTION_DAYS} days)"
fi

# Optional: upload to cloud (uncomment and configure)
# rclone copy "$BACKUP_DIR/$FILENAME" r2:babahalgo-backups/db/ --quiet

echo "[$(date -Iseconds)] Done."
