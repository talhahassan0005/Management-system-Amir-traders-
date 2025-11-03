#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/amir-traders"

cd "$APP_DIR"

# Pull latest code (if using git)
if [ -d .git ]; then
  git pull --rebase
fi

# Install deps and build
npm ci
npm run build

# Reload PM2 app
pm2 reload amir-traders || pm2 start ecosystem.config.cjs
pm2 save

echo "[DONE] Deploy complete."