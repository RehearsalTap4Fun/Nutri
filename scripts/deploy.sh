#!/usr/bin/env bash
# 一键部署到自己的服务器：构建 → rsync release/pwa → 可选 reload nginx
# 用法：
#   NUTRI_SSH=root@1.2.3.4 NUTRI_PATH=/var/www/nutri scripts/deploy.sh
#   NUTRI_SSH=myserver NUTRI_PATH=/var/www/nutri NUTRI_RELOAD=1 scripts/deploy.sh   # 部署后 reload nginx
# 变量可以写进项目根目录的 .deploy.env（已 gitignore）
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .deploy.env ] && set -a && . ./.deploy.env && set +a
: "${NUTRI_SSH:?需要 NUTRI_SSH，例如 root@1.2.3.4 或 ssh config 里的 Host 名}"
: "${NUTRI_PATH:=/var/www/nutri}"

echo "▶ 构建"
npm run release >/dev/null
echo "▶ 同步到 $NUTRI_SSH:$NUTRI_PATH"
ssh "$NUTRI_SSH" "mkdir -p '$NUTRI_PATH'"
# --delete 保证旧图标/旧文件不残留；sw.js 每次构建都会变
rsync -az --delete release/pwa/ "$NUTRI_SSH:$NUTRI_PATH/"
if [ "${NUTRI_RELOAD:-0}" = "1" ]; then
  echo "▶ reload nginx"
  ssh "$NUTRI_SSH" "sudo -n nginx -t && sudo -n systemctl reload nginx"
fi
echo "✓ 已同步。本地版本：$(cat release/pwa/version.json)"
if [ -n "${NUTRI_URL:-}" ]; then
  echo "▶ 远端确认 $NUTRI_URL/version.json"
  curl -s -m 8 "$NUTRI_URL/version.json" || echo "（远端暂时没响应，稍后手动打开网址确认）"
  echo
fi
