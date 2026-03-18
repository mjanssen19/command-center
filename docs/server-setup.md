# Server Setup — Command Center

Run these commands on the OpenClaw server (oracle-server.basilisk-ostrich.ts.net).

## 1. Install Node.js 20 (if not already installed)

```bash
node --version  # check first
# If not 20+:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 2. Install PM2

```bash
sudo npm install -g pm2
```

## 3. Clone the repository

```bash
cd /home/ubuntu
git clone https://github.com/mjanssen19/command-center.git .command-center
cd .command-center
```

## 4. Create production environment file

```bash
nano /home/ubuntu/.command-center/.env.production
```

Add:
```bash
NODE_ENV=production
PAPERCLIP_API_URL=http://localhost:3100
PAPERCLIP_API_KEY=your_production_key_here
OPENCLAW_WORKSPACE_PATH=/home/ubuntu/.openclaw
```

## 5. Build and start

```bash
cd /home/ubuntu/.command-center
npm ci
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # follow instructions to auto-start on reboot
```

## 6. Expose via Tailscale

Check what's currently served:
```bash
tailscale serve status
```

Then add Command Center (choose one based on what's already served):

**Option A — Serve on a subpath** (if the root is already taken):
```bash
tailscale serve --bg /cc localhost:3200
# Access at: https://oracle-server.basilisk-ostrich.ts.net/cc
```

**Option B — Serve on a different port** (if root is already taken):
```bash
tailscale serve --bg --https 8443 localhost:3200
# Access at: https://oracle-server.basilisk-ostrich.ts.net:8443
```

**Option C — Serve on root** (if nothing else is served):
```bash
tailscale serve --bg localhost:3200
# Access at: https://oracle-server.basilisk-ostrich.ts.net
```

Verify:
```bash
tailscale serve status
```

## 7. Set up GitHub Secrets for auto-deploy

On your local machine, run these commands (or set via GitHub web UI):
```bash
# The server's Tailscale IP
gh secret set DEPLOY_HOST -R mjanssen19/command-center <<< "100.109.161.4"

# SSH user
gh secret set DEPLOY_USER -R mjanssen19/command-center <<< "ubuntu"

# SSH private key (Ed25519 recommended)
# Copy the contents of your deployment SSH private key:
gh secret set DEPLOY_SSH_KEY -R mjanssen19/command-center < ~/.ssh/id_ed25519

# Deploy path
gh secret set DEPLOY_PATH -R mjanssen19/command-center <<< "/home/ubuntu/.command-center"
```

## 8. SQLite backup (recommended)

Add a daily backup cron on the server:
```bash
crontab -e
```

Add this line:
```
0 3 * * * mkdir -p /home/ubuntu/backups/command-center && cp /home/ubuntu/.command-center/data/cc.db /home/ubuntu/backups/command-center/cc-$(date +\%Y\%m\%d).db && find /home/ubuntu/backups/command-center -name "*.db" -mtime +30 -delete
```

## 9. Verify

From a device on your Tailscale network, open the URL from step 6.
