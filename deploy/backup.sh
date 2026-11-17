#!/usr/bin/env bash
# Backup harian database. Cron: 20 2 * * * /srv/chemistry/deploy/backup.sh >> /var/log/chemistry/backup.log 2>&1
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${BACKUP_DIR:-$HOME/backup-chemistry}"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$DEST"
MONGO_URL="$(grep -E '^MONGO_URL=' "$APP_DIR/api/.env" | cut -d= -f2-)"
mongodump --uri="$MONGO_URL" --archive="$DEST/db-$(date +%Y-%m-%d_%H%M).archive.gz" --gzip --quiet
find "$DEST" -type f -mtime +"$KEEP_DAYS" -delete
echo "$(date) backup selesai"
