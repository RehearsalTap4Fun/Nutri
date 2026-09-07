#!/usr/bin/env bash
# 每日备份同步数据（密文），保留 14 天。crontab: 30 3 * * * /opt/nutri/backup-sync.sh
set -e
SRC=/var/lib/nutri/sync
DST=/var/lib/nutri/backup/$(date +%F)
mkdir -p "$DST"
cp -a "$SRC"/*.json "$DST"/ 2>/dev/null || true
find /var/lib/nutri/backup -maxdepth 1 -mindepth 1 -type d -mtime +14 -exec rm -rf {} +
