# Deployment

Warden runs as a single long-lived Node process, kept alive by PM2.

## Prerequisites (once)

```bash
apt-get update && apt-get install -y nodejs npm git
npm install -g pm2
```

## Deploy

```bash
git clone https://github.com/Bsh54/warden.git
cd warden
npm install --omit=dev

cat > .env <<'EOF'
CLEANVERSE_BASE_URL=https://uatapi.cleanverse.com/api/cooperate
CLEANVERSE_API_ID=your_api_id
CLEANVERSE_API_KEY=your_base64_api_key
EOF

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

The dashboard is served on port `3000` (`http://<host>:3000`).

## Update

```bash
cd warden && git pull && npm install --omit=dev && pm2 restart warden
```

## Optional: reverse proxy (nginx)

Point a domain at the host and proxy `:80` to `:3000` so the demo runs on a clean URL over HTTPS.
