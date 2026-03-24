# Command Center — Installation Guide

## Overview

Command Center is a local-first operations dashboard built with Next.js. **All screens work fully without Paperclip.** Paperclip is an optional read-only overlay that adds live agent status and heartbeat data when connected.

**Paperclip is not required.** Every screen works standalone with local SQLite storage.

---

## What works without Paperclip

**Everything.** All core screens work with local SQLite as the primary data source:

| Screen | Standalone | With Paperclip |
|---|---|---|
| Tasks (kanban) | Full CRUD locally | + merges Paperclip issues (read-only) |
| Agents | Register agents locally | + merges Paperclip agents with live status |
| Projects | Create/manage locally | + merges Paperclip projects |
| Approvals | Create/approve locally | + merges Paperclip approvals |
| Memory | Local files | Same |
| Docs | Local files | Same |
| Calendar | Local schedules + ICS | + Paperclip task due dates |
| Content | Local SQLite | Same |
| Council | Local (localStorage) | Same |
| People | Local SQLite | Same |
| Radar | Local SQLite | Same |
| Factory | Local (localStorage) | Same |
| Pipeline | Local (localStorage) | Same |
| Feedback | Local SQLite | Same |
| Team / org chart | Shows OpenClaw agents from openclaw.json | + merges Paperclip org data |
| System health | Shows local status | + Paperclip connection status |

Items from Paperclip are marked with a "Paperclip" badge and are read-only. Items created locally show a "Local" or "OpenClaw" badge and are fully editable.

### Agent Discovery

Command Center automatically discovers OpenClaw agents from `openclaw.json` in your OpenClaw workspace (`$OPENCLAW_WORKSPACE_PATH/openclaw.json`). Agents appear on the Agents and Team screens automatically.

The scanner reads:
- `agents.list` — agent names, IDs, emojis, workspaces
- `agents.defaults.model` — which AI model each agent uses
- `bindings` — which channels agents are bound to (e.g., Telegram)

The scanner **never reads or stores** sensitive fields: bot tokens, API keys, auth credentials, or channel configurations.

If `openclaw.json` doesn't exist or has no `agents` section, the app works fine — you can register agents manually from the Agents screen.

### ClawHub Skills Browser

The ClawHub tab browses the public skills registry at `clawhub.ai`. No additional configuration is needed — it reads from the public API (no auth required, 180 requests/min).

- **Browsing and searching**: works immediately, no setup
- **Installing skills**: requires `npx` (Node.js 20+) on the server and `OPENCLAW_WORKSPACE_PATH` set
- **Analyze / Create My Version**: creates Tasks on the kanban board for OpenClaw agents to work on

---

## Prerequisites

- **Node.js 20+**
- **Git** with access to the repo
- **PM2** (for process management on a server)
- **Tailscale** (recommended for secure access)

---

## Install on a server (e.g. Oracle VPS)

These instructions are written for the OpenClaw server at `oracle-server.basilisk-ostrich.ts.net` (100.109.161.4), but work on any Ubuntu/Debian server.

### 1. SSH into the server

```bash
ssh ubuntu@100.109.161.4
```

### 2. Install Node.js 20+ (if not already installed)

```bash
node --version  # check first

# If not installed or below v20:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install PM2

```bash
sudo npm install -g pm2
```

### 4. Clone the repo

```bash
git clone git@github.com:mjanssen19/command-center.git ~/.command-center
cd ~/.command-center
```

### 5. Install dependencies and build

```bash
npm ci
npm run build
```

If `better-sqlite3` fails to compile, run `npm rebuild better-sqlite3`.

### 6. Create the environment file

```bash
cat > ~/.command-center/.env.production << 'EOF'
# === Required ===

# Path to OpenClaw workspace for file indexing
OPENCLAW_WORKSPACE_PATH=/home/ubuntu/.openclaw

# === Paperclip (optional — leave blank to run standalone) ===

PAPERCLIP_API_URL=http://localhost:3100
PAPERCLIP_API_KEY=
NEXT_PUBLIC_PAPERCLIP_WS_URL=ws://localhost:3100

# === External Integrations (all optional — leave blank to skip) ===

MEM0_API_KEY=
SUPERMEMORY_API_KEY=
CALENDAR_ICS_URL=
EOF
```

Edit to set your values:
```bash
nano ~/.command-center/.env.production
```

At minimum, set `OPENCLAW_WORKSPACE_PATH` to wherever your OpenClaw files live. Everything else can stay blank.

### 7. Start with PM2

```bash
cd ~/.command-center
pm2 start npm --name command-center -- start
pm2 save
```

Auto-start on boot:
```bash
pm2 startup
# Follow the command it prints (copy-paste and run it)
pm2 save
```

### 8. Expose via Tailscale

```bash
# Check what's already being served
tailscale serve status

# If nothing is using the default port:
tailscale serve --bg 3000

# If OpenClaw already uses the default port, use a subpath:
tailscale serve --bg /cc localhost:3000
# → https://oracle-server.basilisk-ostrich.ts.net/cc

# Or use a different port:
tailscale serve --bg --https 8443 localhost:3000
# → https://oracle-server.basilisk-ostrich.ts.net:8443
```

### 9. Verify

Open in your browser (from any device on your Tailscale network):

```
https://oracle-server.basilisk-ostrich.ts.net
```

(or whichever URL you configured in step 8)

You should see the Command Center dashboard with the dark theme.

---

## Auto-deploy from GitHub (optional)

Every push to `main` triggers a GitHub Actions workflow that SSHs into the server and runs:

```bash
cd ~/.command-center
git pull origin main
npm ci
npm run build
pm2 reload command-center
```

For this to work, add these GitHub Secrets at `https://github.com/mjanssen19/command-center/settings/secrets/actions`:

| Secret | Value |
|---|---|
| `SERVER_HOST` | `100.109.161.4` (or Tailscale IP) |
| `SERVER_USER` | `ubuntu` |
| `SERVER_SSH_KEY` | Contents of your SSH private key |

---

## Running locally (development)

```bash
git clone git@github.com:mjanssen19/command-center.git
cd command-center
npm install
cp .env.example .env.local
# Edit .env.local with your settings
npm run dev
```

Open `http://localhost:3000`.

---

## Common commands

```bash
# Check status
pm2 status

# View logs
pm2 logs command-center

# Restart
pm2 restart command-center

# Stop
pm2 stop command-center

# Manual redeploy
cd ~/.command-center && git pull && npm ci && npm run build && pm2 reload command-center

# Check Tailscale serve config
tailscale serve status

# Change port (if 3000 is taken)
pm2 stop command-center
PORT=3200 pm2 start npm --name command-center -- start
```

---

## SQLite backup (recommended)

Command Center stores local data in `data/cc.db`. Back it up daily:

```bash
mkdir -p /home/ubuntu/backups
crontab -e
```

Add this line:
```
0 3 * * * cp /home/ubuntu/.command-center/data/cc.db /home/ubuntu/backups/cc-$(date +\%Y\%m\%d).db 2>/dev/null
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm ci` fails | Check Node version: `node --version` (needs 20+) |
| `better-sqlite3` build error | `npm rebuild better-sqlite3` |
| Port 3000 already in use | `PORT=3200 pm2 start npm --name command-center -- start` |
| Tailscale serve conflicts | `tailscale serve status` — pick an unused path or port |
| No files indexed | Check `OPENCLAW_WORKSPACE_PATH` in `.env.production` |
| Paperclip not connecting | Check `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY` |
| App crashes on start | `pm2 logs command-center` to see the error |

---

## For Claude Code CLI

If installing via Claude Code on the server, copy this file to the server and run:

```
Read install.md and follow the server installation steps.
The repo is github.com/mjanssen19/command-center.
Install to ~/.command-center.
Skip the GitHub Actions auto-deploy setup — I'll configure that separately.
```
