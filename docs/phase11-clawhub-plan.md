# Phase 11: ClawHub Skills Browser

## Goal

Add a top-level "ClawHub" tab to Command Center that lets users browse, search, install, analyze, and fork OpenClaw skills from the ClawHub registry — all through a visual UI instead of the CLI.

---

## What ClawHub Is

ClawHub (`https://clawhub.ai`) is the public skills registry for OpenClaw. Skills are reusable SKILL.md bundles that extend what agents can do. The registry has a full REST API — no CLI dependency needed for browsing and searching. The CLI (`clawhub`) is only needed for the install action on the server.

---

## Data Source: ClawHub HTTP API

All read operations use the public API (no auth, 180 req/min per IP):

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/skills?sort=trending&limit=50` | List popular/trending skills |
| `GET /api/v1/skills?sort=downloads&limit=50` | List most downloaded skills |
| `GET /api/v1/skills?sort=updated&limit=50` | List recently updated skills |
| `GET /api/v1/search?q={query}` | Vector search across all skills |
| `GET /api/v1/skills/{slug}` | Skill detail: metadata, owner, moderation, version |
| `GET /api/v1/skills/{slug}/versions` | Version history |
| `GET /api/v1/skills/{slug}/file?path=SKILL.md` | Raw SKILL.md content |
| `GET /api/v1/skills/{slug}/file?path={path}` | Any file in the skill bundle |
| `GET /api/v1/skills/{slug}/moderation` | Security scan results |

Base URL: `https://clawhub.ai`
No authentication required for read operations.

---

## Screen Design

### Layout

Split-pane layout (same pattern as Docs screen):
- **Left panel**: skill list with search and sort controls
- **Right panel**: skill detail with preview and action buttons

### Left Panel — Skill Browser

- **Search bar** at top with placeholder "Search ClawHub skills..."
  - Debounced (300ms), calls `/api/v1/search?q=...`
  - When empty, shows the default sorted list
- **Sort tabs**: Trending | Popular | Recent
  - Trending: `?sort=trending`
  - Popular: `?sort=downloads`
  - Recent: `?sort=updated`
- **Skill cards** (compact list):
  - Display name + slug
  - Summary (1-2 lines, truncated)
  - Version badge
  - Download count
  - Last updated (relative)
  - Moderation badge if flagged (amber warning icon)
- **Pagination**: "Load more" button using `cursor` from response
- **Click a skill** → shows detail in right panel

### Right Panel — Skill Detail

When a skill is selected:

- **Header**: display name, slug, version, owner handle
- **Badges row**:
  - OS compatibility (if specified: macOS, Linux, etc.)
  - Moderation status (clean = green, suspicious = amber, blocked = red)
  - License: MIT-0
- **Summary** paragraph
- **Requirements** (from frontmatter metadata):
  - Required env vars
  - Required CLI tools
  - OS restrictions
- **SKILL.md preview**: rendered markdown of the skill file (fetched from `/api/v1/skills/{slug}/file?path=SKILL.md`)
- **Version history**: collapsible section showing version list with changelogs
- **Files list**: other files in the bundle (from version detail)

### Three Action Buttons

Prominent button row at top of detail panel:

#### 1. Install
- **Label**: "Install on Server"
- **Icon**: Download icon
- **Action**: POST to `/api/clawhub/install` (new API route) which executes `npx clawhub@latest install {slug}` in the OpenClaw workspace on the server
- **Feedback**: shows spinner during install, then success/error message
- **Note**: The install runs in the `OPENCLAW_WORKSPACE_PATH` directory

#### 2. Analyze
- **Label**: "Analyze with Agent"
- **Icon**: Search/magnify icon
- **Action**:
  1. Fetches all skill files from the ClawHub API
  2. Creates a new Task (local SQLite) with:
     - Title: "Analyze skill: {displayName}"
     - Description: includes the full SKILL.md content and file list
     - Status: "backlog"
     - Type: "skill-analysis"
     - Tags: ["clawhub", "analysis", slug]
  3. Navigates to the Tasks screen
- **Purpose**: User doesn't trust the skill origin, wants an OpenClaw agent to review it for security, quality, and usefulness before installing

#### 3. Fork / Remix
- **Label**: "Create My Version"
- **Icon**: GitFork icon
- **Action**:
  1. Fetches all skill files from the ClawHub API
  2. Creates a new Task (local SQLite) with:
     - Title: "Create skill based on: {displayName}"
     - Description: includes the full SKILL.md content, all source files, and instructions: "Create a new skill inspired by this one. Copy the functionality but rewrite it to be your own version. Save the new skill to the workspace."
     - Status: "backlog"
     - Type: "skill-creation"
     - Tags: ["clawhub", "fork", slug]
  3. Navigates to the Tasks screen
- **Purpose**: User wants the functionality but doesn't trust the source — an agent creates a clean-room version

---

## Implementation Steps

### Step 1: Add ClawHub to sidebar

Update `src/components/layout/Sidebar.tsx`:
- Add "ClawHub" entry with a `Package` or `Store` icon from lucide-react
- Position it after "Feedback" (last current item) or after "Factory" (near tooling)
- Route: `/clawhub`

### Step 2: Create the ClawHub API proxy

Create `src/app/api/clawhub/route.ts`:
- Proxies GET requests to `https://clawhub.ai/api/v1/...`
- Adds caching headers (5 min for lists, 1 min for search)
- Returns JSON to the client

**Query params:**
- `action=search&q={query}` → `GET https://clawhub.ai/api/v1/search?q={query}`
- `action=list&sort={sort}&limit={limit}&cursor={cursor}` → `GET https://clawhub.ai/api/v1/skills?...`
- `action=detail&slug={slug}` → `GET https://clawhub.ai/api/v1/skills/{slug}`
- `action=versions&slug={slug}` → `GET https://clawhub.ai/api/v1/skills/{slug}/versions`
- `action=file&slug={slug}&path={path}` → `GET https://clawhub.ai/api/v1/skills/{slug}/file?path={path}`
- `action=moderation&slug={slug}` → `GET https://clawhub.ai/api/v1/skills/{slug}/moderation`

### Step 3: Create the install API route

Create `src/app/api/clawhub/install/route.ts`:
- POST with `{ slug: string }`
- Executes `npx clawhub@latest install {slug}` in the `OPENCLAW_WORKSPACE_PATH` directory
- Uses `child_process.exec` with a 60-second timeout
- Returns `{ success: true, output: string }` or `{ success: false, error: string }`
- Sanitize the slug input (must match `^[a-z0-9][a-z0-9-]*$`)

### Step 4: Create React hooks

Create `src/lib/clawhub/hooks.ts`:

```typescript
useClawHubSkills(sort, limit, cursor)  // list skills
useClawHubSearch(query)                 // search skills
useClawHubSkill(slug)                   // skill detail
useClawHubVersions(slug)                // version history
useClawHubFile(slug, path)              // file content
useClawHubModeration(slug)              // moderation status
```

All use TanStack Query with appropriate stale times (search: 1min, list: 5min, detail: 5min, file: 10min).

### Step 5: Create the ClawHub page

Create `src/app/(dashboard)/clawhub/page.tsx`:
- Split-pane layout
- Left: search + sort tabs + skill list with pagination
- Right: skill detail with SKILL.md preview, metadata, action buttons
- Three action buttons: Install, Analyze, Fork

### Step 6: Create supporting components

- `SkillCard` — compact list item for left panel
- `SkillDetail` — right panel with all sections
- `InstallButton` — with loading state and result feedback
- `ModerationBadge` — colored badge based on moderation verdict

---

## Documentation Updates

### Update sidebar items in `CommandCentre.md`

Add "ClawHub" to the sidebar items list (after Feedback).

### Update `plan.md`

Add Phase 11 to the phases table:
| **11** | ClawHub browser | Skills registry browser, search, install, analyze, fork |

### Update `comparison.md`

Add to "Unique to Command Center" section:
- ClawHub skills browser with install/analyze/fork actions

### Update `install.md`

Add note about ClawHub:
- No additional configuration needed — reads from public API
- Install action requires `npx` available on the server (Node.js 20+)

### Update `implementation.md`

Add Phase 11 implementation section with all steps above.

---

## Verification

- Search returns results from ClawHub API
- Skill detail shows rendered SKILL.md
- Install button executes `clawhub install` on server
- Analyze creates a task in the kanban with skill content
- Fork creates a task with source code and remix instructions
- Moderation badges show correctly
- Empty state when no skills match search
- Works when server has no internet (shows error gracefully)

---

## Anti-patterns

- Do NOT install the `clawhub` CLI as a project dependency — use `npx clawhub@latest` at runtime
- Do NOT cache skill files in SQLite — fetch fresh from API each time
- Do NOT expose the install endpoint without slug sanitization
- Do NOT call ClawHub API from client-side — always proxy through Next.js API routes
