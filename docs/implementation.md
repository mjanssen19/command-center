# Command Center — Implementation Guide

> Step-by-step build instructions per phase. Each phase is self-contained and can be handed to Claude Code CLI in a fresh session. Always read `plan.md` and `comparison.md` first for context.

---

## Phase 0: Documentation Discovery & Workspace Audit

**Goal**: Understand what already exists before writing any code.

### Steps

1. **Read all spec files**:
   - `CommandCentre.md` — product vision and screen specs
   - `CommandCentre-Phase1-Checklist.md` — original Phase 1 checklist
   - `CommandCentre-CLI-Prompt.md` — phased build prompt
   - `comparison.md` — architecture decision (side-by-side with Paperclip)
   - `plan.md` — phase overview and conventions

2. **Inspect the local OpenClaw workspace**:
   ```bash
   find ~ -maxdepth 5 -type d -name "openclaw" 2>/dev/null
   find ~ -maxdepth 5 -type d -name "memory" 2>/dev/null
   find ~ -maxdepth 5 -name "*.cron" -o -name "schedule*" 2>/dev/null | head -20
   ```
   Identify:
   - Where OpenClaw stores generated documents
   - Where memory/journal files live
   - Where schedule or cron definitions live
   - Whether agent/runtime metadata exists locally
   - Whether activity logs exist
   - Whether Mem0 or Supermemory appear configured (look for API keys in shell config)

3. **Catalogue the Paperclip REST API**:
   - Read `paperclip/server/src/routes/` — list every route file
   - Read `paperclip/packages/shared/src/` — note API types and route constants
   - Focus on: agents, issues, projects, org, approvals, costs, activity, heartbeat runs, events (SSE)
   - Note the auth method used (Better Auth API key header)

4. **Write `docs/workspace-audit.md`**:
   ```markdown
   # Workspace Audit

   ## OpenClaw Data Sources
   | Data type | Path | File types | Notes |
   |---|---|---|---|
   | Documents | ... | ... | ... |
   | Memory | ... | ... | ... |
   | Schedules | ... | ... | ... |
   | Activity logs | ... | ... | ... |

   ## Paperclip API Endpoints
   | Method | Path | Purpose |
   |---|---|---|
   | GET | /api/agents | ... |
   | ... | ... | ... |

   ## Integrations Detected
   - Mem0: configured / not found
   - Supermemory: configured / not found
   - External calendar: configured / not found

   ## Unknowns & Recommendations
   - ...
   ```

### Verification
- `docs/workspace-audit.md` exists with real paths (not guesses)
- Paperclip endpoints listed with method + path + response shape
- All unknowns explicitly noted

### Anti-patterns
- Do not assume file paths without running `find` first
- Do not invent Paperclip endpoints; only list what exists in `routes/`

---

## Phase 1: Project Scaffold & App Shell

**Goal**: A running Next.js app with dark shell, all 17 routes, and base components.

### Steps

1. **Bootstrap the app**:
   ```bash
   npx create-next-app@latest command-center \
     --typescript --tailwind --app --src-dir --eslint
   cd command-center
   npx shadcn@latest init
   # Choose: dark theme, zinc base color, CSS variables yes
   ```

2. **Lock Node version** — create `.nvmrc`:
   ```
   20
   ```
   Add to `package.json`:
   ```json
   "engines": {
     "node": ">=20.0.0",
     "npm": ">=10.0.0"
   }
   ```

3. **Install dependencies**:
   ```bash
   npm install lucide-react
   npm install @tanstack/react-query
   npm install cmdk
   npm install react-markdown rehype-highlight
   # shadcn components needed in Phase 1:
   npx shadcn@latest add button input dialog tooltip badge separator
   npx shadcn@latest add scroll-area sheet dropdown-menu
   ```

4. **Configure Prettier**:
   ```bash
   npm install -D prettier eslint-config-prettier
   ```
   Create `.prettierrc`:
   ```json
   {
     "semi": false,
     "singleQuote": true,
     "trailingComma": "es5",
     "printWidth": 100,
     "tabWidth": 2
   }
   ```
   Add to `.eslintrc.json` extends: `"prettier"`
   Add to `package.json` scripts:
   ```json
   "lint": "next lint",
   "format": "prettier --write ."
   ```

5. **Create the folder structure**:
   ```
   src/
     app/
       (dashboard)/
         tasks/page.tsx
         agents/page.tsx
         content/page.tsx
         approvals/page.tsx
         council/page.tsx
         scheduling/page.tsx
         calendar/page.tsx
         projects/page.tsx
         memory/page.tsx
         docs/page.tsx
         people/page.tsx
         team/page.tsx
         system/page.tsx
         radar/page.tsx
         factory/page.tsx
         pipeline/page.tsx
         feedback/page.tsx
         layout.tsx        ← AppShell wrapper
         page.tsx          ← dashboard home
       api/
         paperclip/[...path]/route.ts   ← Phase 3
         search/route.ts                ← Phase 6
         index-status/route.ts          ← Phase 2
       layout.tsx
       globals.css
     components/
       layout/
         AppShell.tsx
         Sidebar.tsx
         SidebarItem.tsx
         TopBar.tsx
       ui/                  ← shadcn auto-generated
       cards/
         MetricCard.tsx
         SectionCard.tsx
         KanbanCard.tsx
       lists/
         ListPanel.tsx
         DetailPanel.tsx
       search/
         CommandBar.tsx     ← Phase 6
     lib/
       db/
         index.ts           ← Phase 2 (placeholder now)
         schema.ts          ← Phase 2 (placeholder now)
       entities/
         types.ts           ← Phase 2 (placeholder now)
       workspace/
         scanner.ts         ← Phase 2 (placeholder now)
       indexing/
         indexer.ts         ← Phase 2 (placeholder now)
       search/
         command-bar.ts     ← Phase 6 (placeholder now)
       paperclip/
         client.ts          ← Phase 3 (placeholder now)
         hooks/             ← Phase 3
       utils/
         cn.ts
         dates.ts
   ```

6. **Design tokens** in `src/app/globals.css`:
   ```css
   :root {
     --bg-base: 9 9 11;          /* zinc-950 */
     --bg-panel: 24 24 27;       /* zinc-900 */
     --bg-elevated: 39 39 42;    /* zinc-800 */
     --border: 63 63 70;         /* zinc-700 */
     --border-subtle: 39 39 42;  /* zinc-800 */
     --text-primary: 250 250 250;
     --text-secondary: 161 161 170;
     --text-muted: 113 113 122;
     --accent: 99 102 241;       /* indigo-500 */

     /* Status colors */
     --status-backlog: 113 113 122;
     --status-in-progress: 59 130 246;
     --status-review: 245 158 11;
     --status-done: 34 197 94;
     --status-blocked: 239 68 68;
     --status-recurring: 168 85 247;
   }
   ```

7. **Build shell components**:

   `components/layout/AppShell.tsx`:
   - Fixed left sidebar (240px) + scrollable content area
   - `children` in content area

   `components/layout/Sidebar.tsx`:
   - Logo / app name at top
   - Grouped nav items with section labels
   - Active route highlight using `usePathname()`
   - Nav groups:
     ```
     Operations: Tasks, Agents, Approvals, Council
     Planning:   Projects, Scheduling, Calendar
     Knowledge:  Memory, Docs, People, Team
     Systems:    Content, Radar, Factory, Pipeline, Feedback, System
     ```

   `components/layout/SidebarItem.tsx`:
   - Icon (lucide) + label
   - Active state: `bg-zinc-800 text-zinc-100`
   - Inactive state: `text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900`

   `components/layout/TopBar.tsx`:
   - Left: breadcrumb / page title
   - Right: `Cmd+K` search trigger button + Paperclip connection status dot

   `components/cards/MetricCard.tsx`:
   - Number (large) + label + optional trend arrow + optional period label

   `components/cards/SectionCard.tsx`:
   - Header (title + optional action) + body slot + subtle border

   `components/lists/ListPanel.tsx` / `DetailPanel.tsx`:
   - SplitPane layout for list + detail views

   `EmptyState` (in `components/ui/`):
   - Icon + heading + description + optional CTA button

8. **Create all 17 route pages** — each must have:
   - `PageHeader` with title + one-line description
   - At least one `SectionCard` with a relevant placeholder
   - Correct import of layout wrapper
   - No `TODO` comments — use `EmptyState` components instead

9. **Dashboard home** (`src/app/(dashboard)/page.tsx`):
   - Product intro: "Command Center is your operational dashboard for OpenClaw and Paperclip."
   - Quick-link cards: Tasks, Agents, Projects, Approvals, Memory, Docs
   - System status widget: Paperclip connection indicator (placeholder, wired in Phase 3)

10. **Create placeholder lib modules** (empty but typed):
    ```typescript
    // lib/db/index.ts
    export const db = null // TODO: Phase 2

    // lib/entities/types.ts
    export interface Document { id: string; path: string; title: string }
    export interface Memory { id: string; date: string; content: string }
    // ... etc

    // lib/workspace/scanner.ts
    export async function scanWorkspace() { return [] } // TODO: Phase 2

    // lib/paperclip/client.ts
    export async function paperclipFetch(path: string) { return null } // TODO: Phase 3
    ```

### Verification
- `npm run dev` starts without errors
- All 17 routes render with no 404s or broken imports
- `npm run build` passes with zero TypeScript errors
- `npm run lint` passes with zero ESLint errors
- Dark shell renders correctly with active sidebar highlighting

### Anti-patterns
- No hardcoded demo agent names or fake data
- No empty pages — use `EmptyState` components
- Do not skip linting setup — it's much harder to add later

---

## Phase 1b: GitHub Repository & Deployment Pipeline

**Goal**: Code on GitHub, auto-deploys to OpenClaw server via GitHub Actions, secured by Tailscale.

### Steps

#### Repository setup

1. **Create `.gitignore`**:
   ```
   # Dependencies
   node_modules/

   # Build output
   .next/

   # Local data — never commit
   data/
   *.db
   *.db-journal

   # Secrets — never commit
   .env.local
   .env.production
   .env*.local

   # OS
   .DS_Store
   Thumbs.db

   # PM2
   .pm2/
   ```

2. **Create `.env.example`** (committed — documents all variables):
   ```bash
   # Paperclip integration
   PAPERCLIP_API_URL=http://localhost:3100
   PAPERCLIP_API_KEY=

   # OpenClaw workspace — path to scan for local files
   OPENCLAW_WORKSPACE_PATH=/path/to/openclaw/workspace

   # Optional integrations (Phase 9)
   MEM0_API_KEY=
   SUPERMEMORY_API_KEY=
   CALENDAR_ICS_URL=
   ```

3. **Create `.env.local`** (not committed — your local dev values):
   ```bash
   PAPERCLIP_API_URL=http://localhost:3100
   PAPERCLIP_API_KEY=your_local_paperclip_key
   OPENCLAW_WORKSPACE_PATH=/Users/you/openclaw
   ```

4. **Initialize git and push to GitHub**:
   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "feat: initial Command Center scaffold"
   gh repo create command-center \
     --public \
     --source=. \
     --remote=origin \
     --push \
     --description "Local-first operations dashboard for OpenClaw and Paperclip"
   gh repo edit --add-topic openclaw,paperclip,ai-agents,nextjs,dashboard
   ```

5. **Add branch protection**:
   ```bash
   gh api repos/:owner/command-center/branches/main/protection \
     --method PUT \
     -f 'required_status_checks[strict]=true' \
     -f 'required_status_checks[contexts][]=build' \
     -f 'enforce_admins=false' \
     -f 'restrictions=null' \
     -f 'required_pull_request_reviews=null'
   ```

#### Server setup (one-time, run on the OpenClaw server)

6. **Install Node 20 and PM2**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   node --version  # confirm: v20.x.x
   ```

7. **Create the deploy directory**:
   ```bash
   sudo mkdir -p /opt/command-center
   sudo chown $USER:$USER /opt/command-center
   cd /opt/command-center
   git clone https://github.com/YOUR_USERNAME/command-center.git .
   ```

8. **Create production env file on the server** (never via GitHub):
   ```bash
   nano /opt/command-center/.env.production
   ```
   ```bash
   NODE_ENV=production
   PAPERCLIP_API_URL=http://localhost:3100
   PAPERCLIP_API_KEY=your_paperclip_production_key
   OPENCLAW_WORKSPACE_PATH=/home/user/openclaw
   ```

9. **Create `ecosystem.config.js`** in the repo (committed):
   ```javascript
   module.exports = {
     apps: [{
       name: 'command-center',
       script: 'node_modules/.bin/next',
       args: 'start',
       cwd: '/opt/command-center',
       instances: 1,
       env_production: {
         NODE_ENV: 'production',
         PORT: 3200,
       },
     }],
   }
   ```

10. **First manual start on server**:
    ```bash
    cd /opt/command-center
    npm ci
    npm run build
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup  # follow the output instructions to auto-start on reboot
    ```

#### Tailscale setup (replaces nginx/Caddy entirely)

11. **Install Tailscale on the server** (if not already):
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up
    ```

12. **Expose Command Center on the Tailscale network**:
    ```bash
    tailscale serve --bg localhost:3200
    ```
    This makes Command Center available at:
    `https://[machine-name].[tailnet-name].ts.net`
    - Automatic HTTPS with a valid cert
    - Only accessible on your Tailscale network — zero public exposure
    - No passwords, no auth middleware — Tailscale membership is the auth

13. **Make Tailscale serve persistent across reboots**:
    ```bash
    # tailscale serve config persists automatically — confirm with:
    tailscale serve status
    ```

14. **Note the URL** in `README.md` and your `.env.production` for reference:
    ```bash
    # Add to .env.production for logging/reference only (not used by the app)
    COMMAND_CENTER_URL=https://your-machine.your-tailnet.ts.net
    ```

#### GitHub Secrets

15. **Add secrets to the GitHub repo**:
    ```bash
    gh secret set DEPLOY_HOST        # IP or hostname of OpenClaw server
    gh secret set DEPLOY_USER        # SSH user (e.g. ubuntu)
    gh secret set DEPLOY_SSH_KEY     # contents of ~/.ssh/id_ed25519 (private key)
    gh secret set DEPLOY_PATH        # /opt/command-center
    gh secret set PAPERCLIP_API_KEY  # production Paperclip API key
    ```

#### GitHub Actions workflow

16. **Create `.github/workflows/deploy.yml`**:
    ```yaml
    name: Build & Deploy

    on:
      push:
        branches: [main]

    jobs:
      build:
        name: Build & lint check
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4

          - uses: actions/setup-node@v4
            with:
              node-version-file: '.nvmrc'
              cache: 'npm'

          - run: npm ci

          - run: npm run lint

          - run: npm run build
            env:
              PAPERCLIP_API_URL: http://localhost:3100
              PAPERCLIP_API_KEY: placeholder
              OPENCLAW_WORKSPACE_PATH: /tmp

      deploy:
        name: Deploy to OpenClaw server
        needs: build
        runs-on: ubuntu-latest
        steps:
          - name: Deploy via SSH
            uses: appleboy/ssh-action@v1.0.3
            with:
              host: ${{ secrets.DEPLOY_HOST }}
              username: ${{ secrets.DEPLOY_USER }}
              key: ${{ secrets.DEPLOY_SSH_KEY }}
              script: |
                set -e
                cd ${{ secrets.DEPLOY_PATH }}
                git pull origin main
                npm ci --production=false
                npm run build
                pm2 reload ecosystem.config.js --env production
                pm2 save
                echo "Deploy complete: $(date)"
    ```

#### SQLite backup

17. **Add a daily backup cron on the server**:
    ```bash
    # Add to crontab: crontab -e
    0 3 * * * mkdir -p /opt/backups/command-center && \
      cp /opt/command-center/data/cc.db \
         /opt/backups/command-center/cc-$(date +\%Y\%m\%d).db && \
      find /opt/backups/command-center -name "*.db" -mtime +30 -delete
    ```
    This keeps 30 days of daily backups and auto-cleans old ones.

#### Rollback

18. **To rollback a bad deploy**:
    ```bash
    # Option 1: revert on GitHub (triggers a new deploy automatically)
    git revert HEAD
    git push origin main

    # Option 2: rollback directly on the server
    ssh user@server
    cd /opt/command-center
    git log --oneline -5          # find the last good commit
    git checkout <commit-hash>
    npm run build
    pm2 reload ecosystem.config.js --env production
    ```

### Verification
- `gh run list` shows a green build + deploy job
- `https://[machine].[tailnet].ts.net` loads Command Center from a Tailscale device
- The URL is unreachable from a device not on Tailscale (test with mobile data)
- `pm2 list` shows `command-center` as `online`
- `tailscale serve status` shows `localhost:3200` mapped
- A trivial push (e.g. whitespace change) deploys automatically within ~2 minutes

### Anti-patterns
- Never commit `.env.local`, `.env.production`, or `data/` — in `.gitignore`
- Never put secrets in workflow YAML — always GitHub Secrets
- Do not open port 3200 to the public internet — Tailscale only
- Do not use `--force` push to main — use revert + push for rollbacks

---

## Phase 2: Data Layer — SQLite + Local File Indexing

**Goal**: A local SQLite index that scans OpenClaw files, extracts metadata, and powers search.

### Steps

1. **Install dependencies**:
   ```bash
   npm install better-sqlite3 @types/better-sqlite3
   npm install chokidar @types/chokidar
   npm install gray-matter
   npm install fast-glob
   ```

2. **Create SQLite connection** (`src/lib/db/index.ts`):
   ```typescript
   import Database from 'better-sqlite3'
   import path from 'path'
   import fs from 'fs'

   const DATA_DIR = path.join(process.cwd(), 'data')
   if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

   export const db = new Database(path.join(DATA_DIR, 'cc.db'))
   db.pragma('journal_mode = WAL')
   db.pragma('foreign_keys = ON')
   ```

3. **Define schema** (`src/lib/db/schema.ts`) and run migrations on startup:

   Tables:
   - `documents` (id, path, type, title, summary, tags, project_id, agent_id, indexed_at, mtime)
   - `memories` (id, date, type, source, content, tags, project_id, agent_id, created_at)
   - `schedule_jobs` (id, name, cron, next_run, last_run, status, linked_project, linked_agent)
   - `activity_events` (id, type, entity_type, entity_id, summary, timestamp, agent_id)
   - `people` (id, name, role, email, notes, created_at)
   - `content_items` (id, title, type, status, channel, published_at, linked_agent)
   - `feedback_items` (id, type, content, entity_ref, agent_id, timestamp)
   - `radar_signals` (id, topic, source, summary, priority, detected_at)
   - `entity_links` (id, from_type, from_id, to_type, to_id, relationship, confidence)
   - `search_index` (FTS5 virtual table: entity_type, entity_id, title, body)

4. **Define entity types** (`src/lib/entities/types.ts`):
   ```typescript
   export type EntityType =
     | 'document' | 'memory' | 'schedule_job' | 'activity_event'
     | 'person' | 'content_item' | 'feedback_item' | 'radar_signal'
     // Paperclip entities (read-only, not stored in SQLite):
     | 'agent' | 'task' | 'project' | 'approval' | 'run'

   export interface Document {
     id: string; path: string; type: string; title: string
     summary: string; tags: string[]; projectId?: string
     agentId?: string; indexedAt: string; mtime: string
   }
   // ... full types for each entity
   ```

5. **File scanner** (`src/lib/workspace/scanner.ts`):
   ```typescript
   import glob from 'fast-glob'
   import matter from 'gray-matter'
   import fs from 'fs'

   const WORKSPACE = process.env.OPENCLAW_WORKSPACE_PATH || ''
   const EXTENSIONS = ['**/*.md', '**/*.json', '**/*.yaml', '**/*.txt', '**/*.csv']

   export async function scanWorkspace() {
     if (!WORKSPACE) return { scanned: 0, errors: [] }
     const files = await glob(EXTENSIONS, { cwd: WORKSPACE, absolute: true })
     // for each file: extract metadata, upsert into SQLite documents table
     // use gray-matter for .md frontmatter
     // infer entity type from path (e.g. path includes 'memory/' → memory entity)
     // store first 500 chars as summary
   }
   ```

6. **Background indexer** (`src/lib/indexing/indexer.ts`):
   - Export `startIndexer()` — called from Next.js `instrumentation.ts`
   - Full scan on startup (async, non-blocking)
   - `chokidar.watch(WORKSPACE)` for incremental updates
   - Re-scan every 5 minutes via `setInterval`
   - Gracefully skips if `OPENCLAW_WORKSPACE_PATH` is not set

7. **Next.js instrumentation hook** (`src/instrumentation.ts`):
   ```typescript
   export async function register() {
     if (process.env.NEXT_RUNTIME === 'nodejs') {
       const { startIndexer } = await import('./lib/indexing/indexer')
       startIndexer()
     }
   }
   ```
   Enable in `next.config.ts`:
   ```typescript
   experimental: { instrumentationHook: true }
   ```

8. **Index status API** (`src/app/api/index-status/route.ts`):
   Returns: `{ lastScan, documentCount, memoryCount, errors, workspaceConfigured }`

### Verification
- `SELECT COUNT(*) FROM documents` returns real local files (if workspace configured)
- FTS5 search returns results for a keyword found in a local file
- If `OPENCLAW_WORKSPACE_PATH` is not set, indexer skips gracefully with a log message
- `GET /api/index-status` returns valid JSON

### Anti-patterns
- Do not block Next.js startup on indexing — always async
- Do not store full file contents in SQLite — summary + path only
- Do not crash if watched directory is deleted or moved

---

## Phase 3: Paperclip Integration Layer

**Goal**: Command Center reads live data from Paperclip; graceful degradation when offline.

### Steps

1. **Paperclip API client** (`src/lib/paperclip/client.ts`):
   ```typescript
   const BASE_URL = process.env.PAPERCLIP_API_URL || 'http://localhost:3100'
   const API_KEY = process.env.PAPERCLIP_API_KEY || ''

   export async function paperclipFetch<T>(
     path: string,
     options?: RequestInit
   ): Promise<{ data: T | null; error: string | null; offline: boolean }> {
     try {
       const res = await fetch(`${BASE_URL}${path}`, {
         ...options,
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${API_KEY}`,
           ...options?.headers,
         },
         signal: AbortSignal.timeout(5000),
       })
       if (!res.ok) return { data: null, error: res.statusText, offline: false }
       return { data: await res.json(), error: null, offline: false }
     } catch {
       return { data: null, error: 'Unreachable', offline: true }
     }
   }
   ```

2. **Server-side proxy** (`src/app/api/paperclip/[...path]/route.ts`):
   - Forwards GET/POST/PATCH to Paperclip, injecting API key server-side
   - Returns `{ offline: true }` with status 503 if Paperclip unreachable
   - Browser code only ever calls `/api/paperclip/...`, never Paperclip directly

3. **TanStack Query setup** (`src/app/(dashboard)/layout.tsx`):
   ```typescript
   // Wrap layout content with <QueryClientProvider>
   ```

4. **Paperclip hooks** (`src/lib/paperclip/hooks/`):
   ```typescript
   // hooks/useAgents.ts
   export function useAgents() {
     return useQuery({
       queryKey: ['paperclip', 'agents'],
       queryFn: () => fetch('/api/paperclip/agents').then(r => r.json()),
       retry: false,
       staleTime: 30_000,
     })
   }
   // Repeat for: useIssues, useProjects, useOrgChart,
   //             useApprovals, useCosts, useActivity, useAgentRuns
   ```

5. **WebSocket live updates** (`src/lib/paperclip/live.ts`):
   > Note: Paperclip uses WebSocket, not SSE. Endpoint: `ws://localhost:3100/api/companies/:companyId/events/ws`
   > Events pushed: `heartbeat.run.queued`, `heartbeat.run.status`, `heartbeat.run.event`, `heartbeat.run.log`, `agent.status`, `activity.logged`

   ```typescript
   export function usePaperclipLive(companyId: string) {
     const queryClient = useQueryClient()
     useEffect(() => {
       const wsUrl = `/api/paperclip/companies/${companyId}/events/ws`
       // Proxy WebSocket through Next.js API route to keep auth server-side
       const ws = new WebSocket(wsUrl.replace('/api/paperclip', 'ws://localhost:3100/api'))
       ws.onmessage = (e) => {
         const event = JSON.parse(e.data)
         // Invalidate relevant query keys based on event type
         if (event.type.startsWith('agent.')) queryClient.invalidateQueries({ queryKey: ['paperclip', 'agents'] })
         if (event.type.startsWith('heartbeat.')) queryClient.invalidateQueries({ queryKey: ['paperclip', 'runs'] })
         if (event.type.startsWith('activity.')) queryClient.invalidateQueries({ queryKey: ['paperclip', 'activity'] })
       }
       ws.onerror = () => ws.close()
       return () => ws.close()
     }, [companyId, queryClient])
   }
   ```

6. **Connection status** (`src/lib/paperclip/status.ts`):
   ```typescript
   export function usePaperclipStatus() {
     // Poll /api/paperclip/health every 10s
     // Returns: 'connected' | 'disconnected' | 'unknown'
   }
   ```

7. **`PaperclipOfflineBanner` component**:
   - Shown at top of agent-related screens when status is `disconnected`
   - "Paperclip is not running — agent data unavailable."
   - Dismiss button; re-checks every 10s

### Verification
- With Paperclip running: `useAgents()` returns real agent list
- With Paperclip stopped: offline banner shows, no uncaught errors
- API key is not visible in browser network tab (proxy pattern works)
- Local screens (Memory, Docs) work normally when Paperclip is offline

### Anti-patterns
- Never call Paperclip directly from browser components
- Do not cache Paperclip responses in SQLite
- Do not throw unhandled errors when Paperclip is unreachable

---

## Phase 4: Core Operational Screens

**Goal**: Tasks, Agents, Scheduling, Projects, Approvals, Team — fully functional with real data.

### 4a: Tasks

Data: Paperclip issues API + local SQLite activity events

- Kanban columns: **Recurring | Backlog | In Progress | Review | Done**
- Metrics bar: tasks this week, in progress count, total, completion rate
- Task card: title, description, project badge, agent avatar, status, priority dot, timestamps
- Filters: assignee, project, status, type (dropdown pills)
- **New Task** modal → `POST /api/paperclip/issues`
- Live activity feed (right panel) — last 20 events
- Task detail slide-over: description, comment thread, history, status controls
- Drag-and-drop between columns → `PATCH /api/paperclip/issues/:id`

### 4b: Agents

Data: Paperclip agents + heartbeat runs

- Agent list: avatar, name, role, current task, status badge, last heartbeat timestamp
- Agent detail (split pane):
  - Current task + session status
  - Heartbeat health: last run, next run, consecutive failures
  - Token spend this month
  - Recent runs with expandable transcript
  - Linked projects + schedules
  - Model/provider + runtime info

### 4c: Scheduling

Data: Local `schedule_jobs` SQLite table + Paperclip agent heartbeat config

- Weekly grid: color-coded blocks per job
- Job list: name, humanized cron, next run, last run, status badge, linked project/agent
- Execution history: last 10 runs per job
- **New Schedule** modal → creates local `schedule_jobs` record

### 4d: Projects

Data: Paperclip projects + local documents + local activity events

- Project cards: title, status, progress bar, owner, priority, last activity
- Project detail tabs: Overview, Tasks, Memory, Docs
- Blockers derived from open blocked issues
- Next recommended task (first open backlog issue)

### 4e: Approvals

Data: Paperclip approvals API

- Queue list: type, requestor agent, date, linked entity preview
- Detail: payload preview, discussion thread
- Actions: **Approve** / **Reject** / **Request Changes** → `PATCH /api/paperclip/approvals/:id`
- History tab: all past decisions

### 4f: Team

Data: Paperclip org chart + local `data/mission.md`

- Mission statement (editable, stored locally)
- Org tree: top-level → agents → sub-agents
- Agent node: avatar, name, role, capabilities, model, machine
- Empty state with setup guidance if no agents found

### Verification
- Tasks kanban matches Paperclip issues list
- Creating a task in Command Center appears in Paperclip dashboard
- Approving in Command Center changes status in Paperclip
- All screens show offline banner gracefully when Paperclip is down

---

## Phase 5: Knowledge Screens

**Goal**: Memory, Docs, Calendar — local-first, rich, searchable.

### 5a: Memory

Data: Local SQLite `memories` table (indexed from local files)

- Timeline grouped by day, newest first
- Long-term / pinned memories panel
- FTS5 search bar
- Source badges (local, Mem0, Supermemory)
- Related entity chips (project, task, person, agent)
- Read-only; links to source file for editing
- Empty state with explanation of how OpenClaw populates memory

### 5b: Docs

Data: Local SQLite `documents` table

- File list: path, type icon, title, size, mtime, tags
- Filters: file type, project, agent, date range
- FTS5 search
- Split pane: list + markdown preview (react-markdown + rehype-highlight)
- Frontmatter display panel
- Inferred entity links with confidence indicator

### 5c: Calendar

Data: Paperclip issues (due dates) + local `schedule_jobs` + local `.ics` files (if found)

- Month / week toggle
- Color-coded event types:
  - 🔵 Paperclip task due dates
  - 🟣 Autonomous schedule jobs
  - 🟡 Project milestones
  - 🟠 Review deadlines
  - ⬜ External calendar events
- Day detail on click
- **New task with due date** from calendar day

### Verification
- Memory timeline shows real entries from local files (or empty state)
- Docs browser lists actual local files with working markdown preview
- Calendar shows Paperclip due dates and local schedule jobs on correct dates

---

## Phase 6: Global Command Bar

**Goal**: `Cmd+K` searches across all entities and provides action shortcuts.

### Steps

1. **Install cmdk**: `npm install cmdk`

2. **CommandBar component** (`src/components/search/CommandBar.tsx`):
   - Modal triggered by `Cmd+K` (global `useEffect` keydown listener)
   - `<Command>` from cmdk with search input
   - Result groups: Tasks, Projects, Docs, Memory, Agents, Approvals, People

3. **Search API** (`src/app/api/search/route.ts`):
   - Query param: `?q=searchterm`
   - Search local FTS5: documents, memories, schedule_jobs, people, content_items
   - Search Paperclip proxy: issues, agents, projects, approvals
   - Merge results, max 30, ranked by relevance
   - Return `{ results: Array<{ type, id, title, subtitle, path }> }`

4. **Action shortcuts** (no search text):
   - "New Task" → open task creation modal
   - "New Project" → open project creation modal
   - "Review Approvals" → navigate to `/approvals`
   - "Open Latest Doc" → navigate to most recently indexed document
   - "Open Today's Memory" → navigate to today's memory entry
   - "View Due Items" → navigate to `/calendar` with today filter

5. **Keyboard navigation**:
   - `↑` / `↓` → navigate results
   - `Enter` → select
   - `Escape` → close
   - Result subtitle shows entity path (e.g. "Task · Project Alpha")

### Verification
- `Cmd+K` opens from any page
- Typing returns mixed results from local + Paperclip sources
- Works when Paperclip is offline (local results only)
- All action shortcuts work correctly

---

## Phase 7: Heartbeat & Task Pickup

**Goal**: OpenClaw/Paperclip picks up tasks created in Command Center; UI reflects the full lifecycle.

### Steps

1. **Task state machine**:
   - States: `backlog → in_progress → review → done | blocked`
   - Transitions via `PATCH /api/paperclip/issues/:id`
   - Write local activity event on each transition

2. **Live heartbeat indicator** on task cards:
   - "Agent working..." spinner when run is active (from SSE)
   - Last heartbeat timestamp

3. **Activity trail** (task detail):
   - Timestamped log: state changes + agent comments + run summaries
   - Sources: Paperclip heartbeat runs + issue comments + local events

4. **Task creation → pickup loop**:
   - New Task modal → POST to Paperclip
   - Paperclip heartbeat picks up on next wakeup
   - SSE event → React Query invalidation → card moves to In Progress automatically

5. **Review gate**:
   - Tasks with `requiresReview: true` stop at Review column
   - Review column cards show Approve / Request Changes
   - Maps to Paperclip approvals API

### Verification
- Create task → appears in Paperclip dashboard immediately
- Trigger Paperclip heartbeat → task moves to In Progress in Command Center
- Task completes in Paperclip → moves to Done in kanban automatically

---

## Phase 8: Secondary Screens

**Goal**: All remaining screens are useful with real data or meaningful empty states.

### 8a: Content
Kanban: Idea → Draft → Review → Scheduled → Published
Local `content_items` SQLite table. New Idea button creates a record.

### 8b: Council
Proposal list + detail (description, debate entries, recommendation, status).
Stored locally. Agents append entries via heartbeat.

### 8c: People
List + detail: name, role, relationship, linked tasks/projects/docs/memory.
Local `people` table. Manual entry + inferred from memory/doc links.

### 8d: System
- Paperclip status + version
- SQLite stats (row counts, last scan, errors)
- File indexer controls (Re-scan now button, scan log)
- Integration status: Mem0, Supermemory, calendar (configured / not configured)
- Environment info: Node version, Next.js version

### 8e: Radar
Signal list grouped by topic/source. Local `radar_signals` table.
OpenClaw writes signals here via heartbeat.

### 8f: Factory
List of repeatable generation systems. Each links to a content pipeline + schedule job.
Local storage. Shows last run, output count, quality gate status.

### 8g: Pipeline
Stage-based board with custom columns per pipeline.
Separate from Tasks kanban — for repeatable process workflows.
Work items link to tasks and content items.

### 8h: Feedback
List of: rejected outputs, review notes, post-mortems, user ratings.
Local `feedback_items` table. Can be created from task/doc/content detail views.

### Verification
- No screen shows "Coming soon" — all have real UI and empty states
- Create actions work for: Content, People, Radar, Feedback
- System screen accurately reports index stats

---

## Phase 9: External Integrations

**Goal**: Mem0, Supermemory, and external calendar work if configured; app never crashes if not.

### Steps

1. **Mem0** (`src/lib/integrations/mem0.ts`):
   - Check `process.env.MEM0_API_KEY`
   - If present: fetch via Mem0 REST API, merge into Memory timeline with "Mem0" badge
   - If absent: show "Configure Mem0" card in System screen

2. **Supermemory** (`src/lib/integrations/supermemory.ts`):
   - Same pattern as Mem0

3. **External calendar** (`src/lib/integrations/calendar.ts`):
   - Check for `.ics` files in workspace or `CALENDAR_ICS_URL` env var
   - Parse with `node-ical`: `npm install node-ical @types/node-ical`
   - Surface in Calendar screen as gray external events

4. **System screen integration status**:
   - For each integration: show configured (green dot) / not configured (gray dot)
   - Link to setup instructions (`.env.example` reference)

### Verification
- With `MEM0_API_KEY` set: Memory screen shows Mem0 entries alongside local entries
- Without it: System screen shows "Mem0: not configured" — no crash, no error
- App startup does not fail regardless of which integrations are missing

---

## Phase 10: Local-First Refactoring

**Goal**: All core screens (Tasks, Agents, Projects, Approvals) work fully with local SQLite as the primary data source. Agents are auto-discovered from `openclaw.json`. Entity relationships link everything together. Paperclip becomes an optional read-only overlay.

### Prerequisites
- Phases 0–9 complete
- `OPENCLAW_WORKSPACE_PATH` points to the OpenClaw workspace (e.g., `/home/ubuntu/.openclaw`)
- `openclaw.json` exists at the workspace root (optional — app works without it)

### Phase 10a: Agent Discovery from openclaw.json

**What**: The workspace scanner reads `openclaw.json` and auto-populates the `agents` table.

**openclaw.json schema** (relevant sections only — scanner MUST skip `channels`, `gateway`, and any fields containing tokens/keys):

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "azure-openai/gpt-5.2"
      },
      "models": {
        "azure-openai/gpt-5.2": { "alias": "gpt52" },
        "featherless/moonshotai/Kimi-K2.5": { "alias": "kimi" }
      },
      "maxConcurrent": 4,
      "subagents": { "maxConcurrent": 8 }
    },
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "Boba",
        "workspace": "/home/ubuntu/.openclaw/workspace",
        "identity": { "name": "Boba", "emoji": "🧋" }
      },
      {
        "id": "peptides",
        "name": "PeppyBoba",
        "workspace": "/home/ubuntu/.openclaw/workspace-peptides",
        "identity": { "name": "PeppyBoba", "emoji": "💊" }
      }
    ]
  },
  "bindings": [
    { "agentId": "peptides", "match": { "channel": "telegram", "accountId": "peptides" } }
  ]
}
```

**Field mapping** (openclaw.json → agents table):

| openclaw.json field | agents column | Notes |
|---|---|---|
| `agents.list[].id` | `id` | Primary key, prefixed with `oc-` to avoid collision |
| `agents.list[].name` or `agents.list[].identity.name` | `name` | Display name |
| `agents.list[].identity.emoji` | stored in `role` prefix | e.g., "🧋 Main Agent" |
| `agents.list[].workspace` | `config_path` | Agent workspace path |
| `agents.list[].default` | noted in `role` | "(default)" suffix |
| `agents.defaults.model.primary` | `model` | Default model for all agents |
| `agents.defaults.models` keys | available model list | Stored as JSON in new column or notes |
| `bindings[].match.channel` | enriches `adapter_type` | e.g., "telegram" |
| All agents | `source` = `'scanner'` | Distinguishes from manually created agents |
| All agents | `provider` = `'openclaw'` | Identifies the runtime |
| All agents | `status` = `'idle'` | Default, updated by heartbeat if available |

**Implementation steps**:

1. Update `src/lib/workspace/scanner.ts`:
   - After file scanning, check for `openclaw.json` at `$OPENCLAW_WORKSPACE_PATH/openclaw.json`
   - If found, parse with `JSON.parse()`
   - Read `agents.list` array — each entry becomes an agent
   - Read `agents.defaults.model.primary` for the default model
   - Read `bindings` to enrich agents with channel info
   - **NEVER read or store**: `channels`, `gateway`, `botToken`, `auth.token`, API keys
   - For each agent: upsert into `agents` table where `source = 'scanner'`
   - Do NOT overwrite agents where `source = 'local'` (user-created)
   - Log: `[scanner] Discovered N agents from openclaw.json`

2. Handle edge cases:
   - `openclaw.json` doesn't exist → skip silently, log info message
   - `agents` section missing → skip silently
   - `agents.list` missing or empty → create one agent from `agents.defaults` with name "OpenClaw Agent"
   - Only one agent defined → show it (don't hide single agents)
   - Malformed JSON → log error, continue with file scanning

**Verification**:
- `pm2 logs command-center` shows "Discovered 6 agents from openclaw.json"
- Agents screen shows all 6 OpenClaw agents with correct names and emojis
- Re-scan does not create duplicates (upsert by `id`)
- Manually created agents (`source: 'local'`) are preserved

**References**:
- `src/lib/workspace/scanner.ts` — add agent discovery function
- `src/lib/db/index.ts` — upsert operations
- `src/lib/entities/types.ts` — LocalAgent interface

---

### Phase 10b: Fix Core Screens for Local-First

**What**: Tasks, Agents, Projects, and Approvals use local SQLite as the primary data source. Paperclip data merges in as read-only when connected.

#### Tasks Screen (`src/app/(dashboard)/tasks/page.tsx`)

Current problem: Activity sidebar, comments, and agent runs depend on Paperclip. Empty when offline.

Changes:
1. **Activity sidebar**: fetch local `activity_events` where `entity_type = 'issue'`. Merge Paperclip activity when connected. Never show "No activity" if local events exist.
2. **Task detail comments**: use local `activity_events` filtered by task ID as the conversation. Paperclip comments merge in when connected.
3. **Agent assignment dropdown**: populate from local `agents` table. Merge Paperclip agents when connected. Show agent emoji + name.
4. **Project dropdown**: populate from local `projects` table. Merge Paperclip projects when connected.
5. **New Task dialog**: add fields:
   - Assignee (select from agents)
   - Project (select from projects)
   - Due date (date input)
6. **Ensure status changes log to `activity_events`** with `entity_type: 'issue'`, `entity_id: taskId`, `agent_id: assigneeId`.

#### Agents Screen (`src/app/(dashboard)/agents/page.tsx`)

Current problem: Only shows manually registered agents + Paperclip agents. No auto-discovery.

Changes:
1. **Show scanner-discovered agents** with "OpenClaw" badge (source badge system already exists).
2. **Agent detail panel**: add "Assigned Tasks" section (query `issues` where `assignee_agent_id = agentId`), add "Schedules" section (query `schedule_jobs` where `linked_agent = agentId`).
3. **Local agents are primary view**. Paperclip agents merge with "Paperclip" badge.
4. **Add edit/update** for local agents (currently only create exists).
5. **Show emoji** from openclaw.json identity field.

#### Projects Screen (`src/app/(dashboard)/projects/page.tsx`)

Current problem: Task counts depend on Paperclip issues. Progress bars break offline.

Changes:
1. **Task counts**: count from local `issues` where `project_id = projectId`. Add Paperclip counts when connected.
2. **Progress bar**: calculate from local issues only (Paperclip adds to the count).
3. **Project detail tabs**:
   - Tasks tab: local issues filtered by project, merged with Paperclip issues
   - Docs tab: local `documents` where `project_id = projectId`
   - Agents tab: agents assigned to any task in this project
4. **New Project dialog**: add owner field (select from agents or people).

#### Approvals Screen (`src/app/(dashboard)/approvals/page.tsx`)

Current problem: Agent name lookup depends on Paperclip agents.

Changes:
1. **Agent name lookup**: query local `agents` table. Merge Paperclip agents.
2. **New Approval dialog**: add "Linked Entity" fields:
   - Entity type: select (task/project/content)
   - Entity ID: select from relevant entities
3. **Approval detail**: show linked entity as clickable link.
4. **Add approval type "task_continuation"**: when an agent finishes a task and needs approval to proceed to the next task in a project.

**Verification**:
- Disconnect Paperclip → all 4 screens work with local data
- Create task → assign agent → link to project → all shown correctly
- Create approval for a task → shows task link in detail view
- Agent detail shows assigned tasks list

**References**:
- `src/lib/hooks/useMergedData.ts` — existing merge pattern
- `src/lib/hooks/useLocalData.ts` — local data hook
- `src/lib/hooks/useLocalMutations.ts` — local CRUD hooks

---

### Phase 10c: Entity Relationships and Cross-Screen Linking

**What**: Clickable navigation between all linked entities. "Related" panels on detail views.

**Implementation**:

1. **Create a `EntityLink` component** (`src/components/common/EntityLink.tsx`):
   ```typescript
   // Renders a clickable chip that navigates to the entity's screen
   // Props: type ('agent' | 'issue' | 'project' | 'approval' | ...), id, label, emoji?
   // Clicking navigates to /{type}s?selected={id}
   ```

2. **Add EntityLink chips** to all detail views:
   - Task card: agent chip, project chip
   - Task detail: agent, project, approval links
   - Agent detail: "Assigned Tasks" list with task links, "Schedules" list
   - Project detail: "Team" (agents on tasks), "Pending Approvals"
   - Approval detail: linked entity (task/project/content) chip

3. **Activity log enrichment**: all `logLocalActivity()` calls include `entity_type`, `entity_id`, `agent_id`.

4. **URL-based selection**: screens accept `?selected=id` query param to auto-expand a detail panel for that entity. The EntityLink navigates with this param.

**Verification**:
- Click agent name on task card → agents page opens with that agent selected
- Agent detail → click a task → tasks page opens with that task selected
- Project detail → click an agent → agents page

---

### Phase 10d: Council → Projects + Scheduling Links

**What**: Council proposals can become projects. Schedules link to tasks and agents.

#### Council → Projects

1. **Migrate Council from localStorage to SQLite**: add `council_proposals` table:
   ```sql
   CREATE TABLE IF NOT EXISTS council_proposals (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'open',  -- 'open', 'resolved'
     recommendation TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     resolved_at TEXT
   );
   ```
   Add `council_proposals` to the CRUD API entity allowlist.

2. **Store debate entries** as `activity_events` with `entity_type: 'council_proposal'`.

3. **"Create Project" button** on resolved proposals:
   - Creates a `projects` row with the proposal title/description
   - Creates an `entity_links` row: `council_proposal → project`
   - Logs activity event

4. **Update Council page** to use `useLocalData('council_proposals')` instead of localStorage.

#### Scheduling → Tasks/Agents

1. **Add `linked_task` column** to `schedule_jobs` table:
   ```sql
   ALTER TABLE schedule_jobs ADD COLUMN linked_task TEXT;
   ```

2. **Update Scheduling page**:
   - Wire to `useLocalData('schedule_jobs')`
   - Show linked agent (with EntityLink chip) and linked task (with EntityLink chip)
   - "New Schedule" dialog: add agent selector and task selector

3. **"Schedule This Task" action** in task detail panel:
   - Opens a pre-filled schedule dialog with the task linked

**Verification**:
- Create proposal → resolve → "Create Project" → project appears
- Create schedule linked to agent and task → shows on agent detail and task detail
- Scheduling page shows all local schedules with linked entities

---

### Phase 10e: Team Screen Shows Local Agents

**What**: Team screen works without Paperclip by showing OpenClaw-discovered agents.

**Changes** to `src/app/(dashboard)/team/page.tsx`:

1. **Primary data**: local `agents` table (scanner-discovered + manual)
2. **Agent cards**: show emoji, name, role, model, status, workspace path
3. **Merge Paperclip org** when connected (with "Paperclip" badge)
4. **Mission statement**: keep in localStorage (simple, works fine)
5. **Show model info**: display `agents.defaults.model.primary` and available models

**Verification**:
- Team screen shows 6 OpenClaw agents without Paperclip
- Each agent shows emoji, name, model
- With Paperclip connected, both sets of agents appear

---

### Phase 10f: Documentation Updates

Update these files to reflect the completed local-first architecture:

1. **`docs/workspace-audit.md`**: add "Agent Discovery" section documenting the `openclaw.json` parsing
2. **`implementation.md`**: Phase 10 section (this section — already written above)
3. **`phase10-plan.md`**: mark as completed, note what was built
4. **`plan.md`**: already up to date (user edited)
5. **`install.md`**: already up to date (user edited). Add note about `openclaw.json` auto-discovery.
6. **`comparison.md`**: already up to date (user edited)

**Add to `install.md`** under the "What works without Paperclip" section:
```markdown
### Agent Discovery

Command Center automatically discovers OpenClaw agents from `openclaw.json`
in your OpenClaw workspace. Set `OPENCLAW_WORKSPACE_PATH` and agents appear
on the Agents and Team screens automatically.

The scanner reads agent definitions and model configuration. It NEVER reads
or stores sensitive fields (bot tokens, API keys, auth credentials).
```

**Verification**:
- All docs accurately describe the local-first architecture
- No docs still claim Paperclip is required for Tasks/Agents/Projects/Approvals
- `openclaw.json` discovery is documented

---

### Phase 10 — Claude Code Session Prompt

> Read plan.md, implementation.md Phase 10, and phase10-plan.md. Execute sub-phases 10a through 10f in order.
>
> 10a: Update the workspace scanner to discover agents from openclaw.json. Parse agents.list, agents.defaults.model, and bindings. NEVER read channels, gateway, or any token/key fields. Upsert into agents table with source='scanner'.
>
> 10b: Refactor Tasks, Agents, Projects, and Approvals screens to use local SQLite as the primary data source. Paperclip data merges as read-only overlay. Add agent/project selectors to New Task dialog. Add Assigned Tasks and Schedules to agent detail. Fix task counts and progress for projects. Add entity linking to approvals.
>
> 10c: Create an EntityLink component for clickable cross-screen navigation. Add entity link chips to all detail views. Support ?selected=id URL params for deep linking.
>
> 10d: Migrate Council from localStorage to SQLite (council_proposals table). Add "Create Project from Proposal" button. Wire Scheduling screen to local schedule_jobs with agent and task selectors.
>
> 10e: Update Team screen to show local agents as primary, Paperclip org as overlay.
>
> 10f: Update docs/workspace-audit.md and install.md with agent discovery documentation.
>
> Build and lint must pass after each sub-phase. Commit and push after each.

---

## Phase 11: ClawHub Skills Browser

**Goal**: Add a top-level "ClawHub" tab that lets users browse, search, install, analyze, and fork OpenClaw skills from the ClawHub registry (clawhub.ai).

### Data Source

All reads use the public ClawHub HTTP API at `https://clawhub.ai/api/v1/` (no auth, 180 req/min):

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/skills?sort=trending&limit=50` | List popular/trending skills |
| `GET /api/v1/search?q={query}` | Vector search across all skills |
| `GET /api/v1/skills/{slug}` | Skill detail: metadata, owner, moderation |
| `GET /api/v1/skills/{slug}/versions` | Version history |
| `GET /api/v1/skills/{slug}/file?path=SKILL.md` | Raw skill file content |

### Implementation

1. **API proxy** (`src/app/api/clawhub/route.ts`): proxies GET requests to clawhub.ai, caches appropriately
2. **Install route** (`src/app/api/clawhub/install/route.ts`): POST with `{ slug }`, runs `npx clawhub@latest install {slug}` in workspace, slug sanitized (`^[a-z0-9][a-z0-9-]*$`)
3. **Types** (`src/lib/clawhub/types.ts`): ClawHubSkill, ClawHubSkillDetail, ClawHubSearchResult, ClawHubVersion
4. **Hooks** (`src/lib/clawhub/hooks.ts`): useClawHubSkills, useClawHubSearch, useClawHubSkill, useClawHubVersions, useClawHubFile
5. **Sidebar** entry: "ClawHub" under new "Marketplace" group with Package icon
6. **Page** (`src/app/(dashboard)/clawhub/page.tsx`): split-pane layout
   - Left: search bar + sort tabs (Trending/Popular/Recent) + skill card list
   - Right: skill detail with SKILL.md preview + three action buttons

### Three Action Buttons

| Button | Action |
|---|---|
| **Install on Server** | POST to `/api/clawhub/install`, runs CLI on server |
| **Analyze with Agent** | Fetches skill source, creates a Task for agent review |
| **Create My Version** | Fetches skill source, creates a Task for clean-room fork |

"Analyze" and "Create My Version" both create local tasks in the kanban with the skill content embedded in the description.

### Phase 11 — Claude Code Session Prompt

> Read phase11-clawhub-plan.md and implementation.md Phase 11. Build the ClawHub tab: API proxy, install route, hooks, types, sidebar entry, and split-pane page. Follow the Docs page pattern for the split-pane layout. Build and lint must pass. Commit and push.

---

## Claude Code Session Prompts

Use these prompts to start each phase in a fresh Claude Code session:

**Phase 0**:
> Read plan.md, comparison.md, and CommandCentre.md. Then inspect the local OpenClaw workspace to find where documents, memory, schedules, and logs are stored. Also read paperclip/server/src/routes/ to catalogue the Paperclip API. Write the findings to docs/workspace-audit.md.

**Phase 1**:
> Read plan.md and implementation.md Phase 1. Scaffold a Next.js 15 + TypeScript app called command-center with a premium dark shell, all 17 sidebar routes, ESLint + Prettier, and the base component set described in implementation.md. Do not add demo data. Use EmptyState components for all placeholder content.

**Phase 1b**:
> Read plan.md and implementation.md Phase 1b. Set up the GitHub repo, GitHub Actions deploy workflow, and Tailscale serve configuration for the OpenClaw server as described. Create ecosystem.config.js and the .github/workflows/deploy.yml file.

**Phase 2**:
> Read plan.md and implementation.md Phase 2. Add better-sqlite3 with the full schema, file scanner using fast-glob and gray-matter, and a background indexer started via Next.js instrumentation hook. The OPENCLAW_WORKSPACE_PATH env var controls what gets scanned.

**Phase 3**:
> Read plan.md and implementation.md Phase 3. Add the Paperclip server-side proxy, typed API client, TanStack Query hooks for all Paperclip entities, SSE live updates, connection status hook, and PaperclipOfflineBanner component.

**Phase 4**:
> Read plan.md and implementation.md Phase 4. Implement the Tasks kanban, Agents, Scheduling, Projects, Approvals, and Team screens with real data from Paperclip and local SQLite as described.

*(Continue pattern for Phases 5–9)*
