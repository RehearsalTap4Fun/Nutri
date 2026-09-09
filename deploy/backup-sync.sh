#!/usr/bin/env bash
# 每日备份同步数据（密文）与贡献草稿（明文，两者互不相关），保留 14 天。crontab: 30 3 * * * /opt/nutri/backup-sync.sh
set -e
DST=/var/lib/nutri/backup/$(date +%F)
mkdir -p "$DST"
cp -a /var/lib/nutri/sync/*.json "$DST"/ 2>/dev/null || true
cp -a /var/lib/nutri/contrib/contributions.jsonl "$DST"/ 2>/dev/null || true
find /var/lib/nutri/backup -maxdepth 1 -mindepth 1 -type d -mtime +14 -exec rm -rf {} +
