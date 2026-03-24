# Phase 10 — Local-First Refactoring Plan

**Status: COMPLETED** (2026-03-24)

Commits: `38ae94f` (10a), `5d300e9` (10b), `0d76461` (10c/d), `2414d40` (10e)

## Problem (resolved)

Command Center's core screens (Tasks, Agents, Projects, Approvals) were built primarily around Paperclip hooks. Without Paperclip running, these screens are mostly broken or empty. The original vision is that Command Center works **fully standalone** with local SQLite, and Paperclip is an optional read-only overlay.

Additionally, the screens are disconnected — agents don't link to tasks, tasks don't link to approvals, schedules don't link to tasks/agents, and council proposals don't become projects.

## Good News

The infrastructure is already there:
- SQLite tables exist for `issues`, `agents`, `projects`, `approvals`, `schedule_jobs`, `activity_events`, `entity_links`
- Local CRUD API exists at `/api/local/[entity]` with full GET/POST/PATCH/DELETE
- A `useMergedList` hook already merges local + Paperclip data
- The screens already have dual-source architecture with normalize functions

## What Needs to Change

### Core Issues
1. **Agent discovery** — OpenClaw agents are defined in `/home/ubuntu/.openclaw/openclaw.json` on the server. The workspace scanner needs to parse this file and auto-populate the `agents` table.
2. **Screens default to Paperclip-dependent behavior** — when Paperclip is offline, screens show empty states or errors instead of working with local data.
3. **Entity relationships are missing** — no proper linking between agents↔tasks, tasks↔approvals, tasks↔schedules, proposals↔projects.
4. **Council is localStorage-only** — proposals should live in SQLite and have a "Create Project" action.
5. **Scheduling screen has no data** — needs to be wired to local `schedule_jobs` and linked to tasks/agents.
6. **Team screen only shows Paperclip org** — needs to show locally discovered agents too.

---

## Phase 10a: Agent Discovery from openclaw.json

**Goal**: The workspace scanner reads `openclaw.json` and auto-populates the `agents` table.

### What to do

1. **Update the workspace scanner** (`src/lib/workspace/scanner.ts`):
   - After scanning files, look for `openclaw.json` in the workspace root
   - Parse it and extract agent definitions
   - For each agent found: upsert into the `agents` table with `source: 'scanner'`
   - Preserve manually created agents (`source: 'local'`)
   - If an agent from the scanner already exists (by name match), update its fields but don't overwrite user edits

2. **Read the actual openclaw.json format on the server** first. The file is at `$OPENCLAW_WORKSPACE_PATH/openclaw.json`. The scanner already reads `OPENCLAW_WORKSPACE_PATH` from env.

3. **Map openclaw.json fields to the agents table**:
   - `name` → `agents.name`
   - `role` / `description` → `agents.role`
   - `model` → `agents.model`
   - `provider` → `agents.provider`
   - `status` → default to `'idle'`
   - `adapter_type` → `'openclaw'`
   - `source` → `'scanner'`
   - `config_path` → path to openclaw.json

### Verification
- Deploy to server, check `pm2 logs` — should see "Discovered N agents from openclaw.json"
- Agents screen should show the OpenClaw agents without Paperclip running
- Re-scan should not create duplicates

### References
- `src/lib/workspace/scanner.ts` — existing scanner code
- `src/lib/db/index.ts` — database operations
- `src/lib/entities/types.ts` — LocalAgent interface

---

## Phase 10b: Fix Core Screens for Local-First

**Goal**: Tasks, Agents, Projects, and Approvals work fully with local SQLite. No Paperclip needed for basic functionality.

### Tasks Screen (`src/app/(dashboard)/tasks/page.tsx`)

Current problem: Activity sidebar and comments depend entirely on Paperclip. When offline, the kanban works for local issues but the right panel is broken.

Changes:
1. **Activity sidebar**: merge Paperclip activity (when available) with local `activity_events`. When Paperclip is offline, show only local events — not "No activity".
2. **Comments/activity trail in task detail**: use local `activity_events` filtered by `entity_type='issue' AND entity_id=taskId`. Paperclip comments merge in when connected.
3. **Agent assignment dropdown**: populate from local `agents` table (discovered from openclaw.json). Paperclip agents merge in when connected.
4. **New Task dialog**: add fields for `assignee` (select from local agents), `project` (select from local projects), `due date` (date picker).
5. **Ensure all task state changes log to local `activity_events`** — they already do, but verify.

### Agents Screen (`src/app/(dashboard)/agents/page.tsx`)

Current problem: Shows register dialog for manual agents, but doesn't auto-discover agents from openclaw.json. Paperclip agents dominate.

Changes:
1. **Show scanner-discovered agents prominently** — agents with `source: 'scanner'` should show with an "OpenClaw" badge.
2. **Agent detail panel**: show linked tasks (query `issues` where `assignee_agent_id = agentId`), linked schedules (query `schedule_jobs` where `linked_agent = agentId`).
3. **Remove dependency on Paperclip for basic agent list** — local agents should be the primary view, Paperclip agents merge in with a "Paperclip" badge.
4. **Add Edit/Update functionality** for local agents — currently there's no update.

### Projects Screen (`src/app/(dashboard)/projects/page.tsx`)

Current problem: Task counts depend on Paperclip issues. Progress bars break when offline.

Changes:
1. **Task counts**: count from local `issues` table where `project_id = projectId`. Merge Paperclip issue counts when connected.
2. **Progress calculation**: use local issues for progress. Paperclip issues add to the count when connected.
3. **Project detail tabs**:
   - Tasks tab: show local issues filtered by project. Merge Paperclip issues when connected.
   - Docs tab: query local `documents` where `project_id = projectId`.
   - Add "Agents" tab: query local `agents` that are assigned to tasks in this project.
4. **Add project owner field** — select from local agents or people.

### Approvals Screen (`src/app/(dashboard)/approvals/page.tsx`)

Current problem: Works locally but agent name lookup depends on Paperclip agents.

Changes:
1. **Agent name lookup**: use local `agents` table for name resolution. Merge Paperclip agents when connected.
2. **Link approvals to entities**: add `linked_entity_type` and `linked_entity_id` fields to the New Approval dialog (e.g., "Approve task X to move to next phase").
3. **Show linked entity**: in approval detail, show the linked task/project/content item with a clickable link.

### Verification
- All 4 screens render and function with Paperclip completely disconnected
- Create a task, assign it to a local agent, link it to a project — all works
- Create an approval for a task — shows the task link
- Agent detail shows assigned tasks and schedules
- Project detail shows correct task count and progress from local data

### References
- `src/lib/hooks/useMergedData.ts` — merge pattern
- `src/lib/hooks/useLocalData.ts` — local data hook
- `src/lib/hooks/useLocalMutations.ts` — local CRUD hooks
- `src/lib/paperclip/hooks.ts` — Paperclip hooks (for merge)

---

## Phase 10c: Entity Relationships and Cross-Screen Linking

**Goal**: All entities are properly linked. Navigating between agents, tasks, projects, approvals, and schedules feels connected.

### New relationship fields needed

No new SQLite columns needed — the schema already has:
- `issues.project_id` → projects
- `issues.assignee_agent_id` → agents
- `schedule_jobs.linked_project` → projects
- `schedule_jobs.linked_agent` → agents
- `approvals.requestor_agent_id` → agents
- `entity_links` table for arbitrary relationships

### What to build

1. **Clickable entity links** — everywhere an entity ID is shown, make it a clickable link:
   - Agent name on a task card → navigates to `/agents` and expands that agent
   - Project badge on a task card → navigates to `/projects` and expands that project
   - Task link on an approval → navigates to `/tasks` and opens that task detail
   - Agent name on an approval → navigates to `/agents`

2. **"Related" panels on detail views**:
   - Task detail: show "Project: X", "Assigned to: Agent Y", "Approval: Z" as linked chips
   - Agent detail: show "Assigned Tasks" list, "Schedules" list
   - Project detail: show "Team" (agents working on tasks in this project), "Pending Approvals" for this project
   - Approval detail: show linked entity (task, project, etc.)

3. **Activity log enrichment**: when logging activity events, always include `entity_type`, `entity_id`, and `agent_id` so the activity trail can be filtered per entity.

### Verification
- Click an agent name on a task card → lands on agents screen with that agent expanded
- Agent detail shows all tasks assigned to that agent
- Project detail shows agents working on it
- Approval detail links to the relevant task/project

---

## Phase 10d: Council → Projects Flow + Scheduling Links

**Goal**: Council proposals can become projects. Schedules properly link to tasks and agents.

### Council → Projects

1. **Migrate Council from localStorage to SQLite**: create a `council_proposals` table or use the `entity_links` pattern with a proposals concept stored in a local table. Simplest: add a `council_proposals` entity to the CRUD API (new SQLite table).

2. **"Create Project from Proposal" button**: on a resolved council proposal, show a button that:
   - Creates a new project in `projects` table with the proposal title/description
   - Creates an `entity_link` from the proposal to the new project
   - Logs an activity event

3. **Debate entries**: store as `activity_events` with `entity_type: 'council_proposal'` and `entity_id: proposalId`.

### Scheduling Links

1. **Wire the Scheduling screen** to local `schedule_jobs` table:
   - `useLocalData('schedule_jobs')` for the list
   - `useLocalCreate('schedule_jobs')` for New Schedule
   - Show linked project and linked agent on each schedule card

2. **Link schedules to tasks**: add a `linked_task` field to `schedule_jobs` table (ALTER TABLE). When a scheduled job runs, it creates or updates a task.

3. **"Schedule this task" action**: on the task detail panel, add a button to create a schedule that triggers this task on a cron.

### Verification
- Create a council proposal → resolve it → "Create Project" → project appears in Projects screen
- Create a schedule linked to an agent → agent detail shows that schedule
- Schedule a task → scheduling screen shows the linked task

---

## Phase 10e: Team Screen Shows Local Agents

**Goal**: Team screen works without Paperclip by showing locally discovered agents.

### Changes

1. **Primary data source**: local `agents` table (discovered from openclaw.json + manually registered)
2. **Org tree**: build from local agents. If agents have no hierarchy info, show as flat grid (which is already the fallback).
3. **Merge Paperclip org** when connected: Paperclip agents show with "Paperclip" badge, local agents show with "OpenClaw" or "Local" badge.
4. **Mission statement**: keep in localStorage (or migrate to a `settings` table in SQLite).

### Verification
- Team screen shows OpenClaw agents without Paperclip
- With Paperclip connected, both local and Paperclip agents appear

---

## Phase 10f: Documentation Updates

**Goal**: All project docs reflect the local-first architecture.

### Files to update

1. **`plan.md`** — already updated by user. Verify Phase 10 entry is complete.
2. **`install.md`** — already updated by user. Verify the "what works without Paperclip" table is accurate.
3. **`comparison.md`** — already updated by user. Verify ownership table reflects local-first.
4. **`implementation.md`** — add Phase 10 section with all the changes made.
5. **`docs/workspace-audit.md`** — add note about `openclaw.json` agent discovery.
6. **`README.md`** (if exists in command-center/) — update to reflect local-first architecture.

### What to document
- openclaw.json format and how agents are discovered
- Entity relationship model (which entities link to which)
- How Paperclip overlay works (badges, read-only, merge behavior)
- How to create and link entities (tasks → agents → projects → approvals)

---

## Implementation Order

| Sub-phase | Depends on | Can run in parallel? |
|---|---|---|
| **10a**: Agent discovery | Nothing | Yes — start first |
| **10b**: Fix core screens | 10a (needs local agents) | After 10a |
| **10c**: Cross-screen linking | 10b (needs working screens) | After 10b |
| **10d**: Council→Projects + Scheduling | 10b, 10c | After 10c |
| **10e**: Team screen | 10a (needs local agents) | After 10a, parallel with 10b |
| **10f**: Documentation | All above | Last |

## Anti-patterns to avoid

- Do NOT remove Paperclip integration — it stays as an optional read-only overlay
- Do NOT store Paperclip data in SQLite — only local data goes in SQLite
- Do NOT break the merge pattern — `useMergedList` stays, local data just becomes primary
- Do NOT hardcode agent names — always discover from openclaw.json or manual registration
- Do NOT create new SQLite tables unnecessarily — use existing tables and `entity_links` where possible

## Success Criteria

After Phase 10:
1. Fresh install with only `OPENCLAW_WORKSPACE_PATH` set → all screens work, agents discovered
2. Create a task → assign to an agent → link to a project → put up for approval → approve → done
3. Schedule a task on a cron → see it in Scheduling, Calendar, and the agent's detail
4. Create a council proposal → vote → create project from it → assign tasks
5. Navigate between any linked entities with clickable links
6. Connect Paperclip later → its data merges in with "Paperclip" badges, read-only
