# Deploy to Hostinger VPS (Ubuntu) — amirtraders.tech

This guide deploys the Next.js app with PM2 behind Nginx and HTTPS.

Prereqs
- Domain DNS A record: amirtraders.tech → your VPS public IP
- SSH root access enabled

1) SSH into VPS (from Windows PowerShell)

```powershell
ssh root@72.60.222.235
```

2) System updates and essentials

```bash
apt-get update -y && apt-get upgrade -y
apt-get install -y build-essential curl git ufw nginx
```

3) Firewall (allow SSH, HTTP, HTTPS)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

4) Install Node.js (LTS) with nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm alias default 20
node -v && npm -v
```

5) PM2 process manager

```bash
npm i -g pm2
pm2 -v
```

6) App directory and code

```bash
mkdir -p /var/www/amir-traders
cd /var/www/amir-traders
# Clone your repo (replace with the actual URL)
# git clone https://github.com/<owner>/<repo>.git .

# Or upload files via git/zip and extract into this folder.
```

7) Environment variables (DO NOT commit)

```bash
cp .env.production.example .env.production
nano .env.production
# Fill with real values:
# MONGODB_URI=...
# NEXTAUTH_URL=https://amirtraders.tech
# NEXTAUTH_SECRET=...
# SITE_URL=...
# NEXT_PUBLIC_SITE_URL=...
```

8) Install dependencies and build

```bash
npm ci
npm run build
```

9) Start with PM2 (uses ecosystem.config.cjs)

```bash
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs amir-traders --lines 100
pm2 save
pm2 startup systemd -u root --hp /root
# Follow the printed instruction (run the systemctl command) then:
pm2 save
```

10) Nginx reverse proxy to Next.js (port 3000)

Create a server block:

```bash
cat >/etc/nginx/sites-available/amirtraders.conf <<'EOF'
server {
  listen 80;
  server_name amirtraders.tech www.amirtraders.tech;

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
ln -sf /etc/nginx/sites-available/amirtraders.conf /etc/nginx/sites-enabled/amirtraders.conf
nginx -t && systemctl reload nginx
```

11) HTTPS (Let’s Encrypt)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d amirtraders.tech -d www.amirtraders.tech --redirect --non-interactive --agree-tos -m admin@amirtraders.tech
systemctl reload nginx
```

12) MongoDB Atlas network access
- Whitelist the VPS public IP in Atlas → Network Access.
- If you change servers/IP, update the whitelist.

13) Health check
- http://amirtraders.tech should redirect to https and show the app
- PM2: `pm2 logs amir-traders` should be clean
- Nginx: `journalctl -u nginx -n 50 --no-pager`

Common issues
- 502/Bad Gateway: PM2 app not running or wrong port; check `pm2 logs`
- Mongo connection errors: Atlas IP not whitelisted or wrong MONGODB_URI
- Auth/cookies: ensure `NEXTAUTH_URL` matches https domain

Rolling updates
```bash
cd /var/www/amir-traders
# git pull (if using git)
npm ci
npm run build
pm2 reload amir-traders
```
