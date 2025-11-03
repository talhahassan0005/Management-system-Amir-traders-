#!/usr/bin/env bash
set -euo pipefail

APP_NAME="amir-traders"
APP_DIR="/var/www/${APP_NAME}"
DOMAIN_MAIN="amirtraders.tech"
DOMAIN_WWW="www.amirtraders.tech"
REPO_URL="https://github.com/talhahassan0005/Management-system-Amir-traders-.git"

# 1) System deps
apt-get update -y && apt-get upgrade -y
apt-get install -y build-essential curl git ufw nginx

# 2) Firewall
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable || true

# 3) Node LTS via nvm
if ! command -v nvm >/dev/null 2>&1; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi
. "$HOME/.nvm/nvm.sh"
nvm install 20
nvm alias default 20

# 4) PM2
npm i -g pm2

# 5) App folder and code
mkdir -p "$APP_DIR"
cd "$APP_DIR"
if [ ! -d .git ]; then
  git clone "$REPO_URL" .
else
  git pull --rebase
fi

# 6) Env file placeholder
if [ ! -f .env.production ]; then
  cp .env.production.example .env.production || true
  echo "[INFO] Edit $APP_DIR/.env.production with real secrets before starting."
fi

# 7) Install & build
npm ci
npm run build

# 8) PM2 start
pm2 start ecosystem.config.cjs || true
pm2 save
pm2 startup systemd -u root --hp /root || true

# 9) Nginx
cat >/etc/nginx/sites-available/${APP_NAME}.conf <<'EOF'
server {
  listen 80;
  server_name ${DOMAIN_MAIN} ${DOMAIN_WWW};

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
EOF
ln -sf /etc/nginx/sites-available/${APP_NAME}.conf /etc/nginx/sites-enabled/${APP_NAME}.conf
nginx -t && systemctl reload nginx

# 10) SSL (non-interactive)
if ! command -v certbot >/dev/null 2>&1; then
  apt-get install -y certbot python3-certbot-nginx
fi
certbot --nginx -d ${DOMAIN_MAIN} -d ${DOMAIN_WWW} --redirect --non-interactive --agree-tos -m admin@${DOMAIN_MAIN} || true
systemctl reload nginx

echo "[DONE] Setup complete. Visit: https://${DOMAIN_MAIN}"