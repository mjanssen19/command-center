# Command Center vs Paperclip -- Comparison

## What They Are

| | **Command Center** | **Paperclip** |
|---|---|---|
| **Tagline** | Local-first operational dashboard for OpenClaw | Control plane for autonomous AI companies |
| **Status** | Deployed, open-source (18 screens, local-first with optional Paperclip overlay) | Shipping open-source product (v0.3.0, full codebase) |
| **Core metaphor** | An operations console for one AI system | A company structure where agents are employees |

Both solve the same fundamental problem: **giving visibility and control over autonomous AI agents** that would otherwise be opaque background processes.

---

## Feature Comparison

| Feature | **Command Center** | **Paperclip** |
|---|---|---|
| **Task Management** | Kanban board (Recurring/Backlog/In Progress/Review/Done) | Issue tracker with hierarchical parent-child tasks, single-assignee atomic checkout |
| **Scheduling** | Schedule grid + separate Calendar view for milestones | Heartbeat protocol (cron + event-triggered wakeups) |
| **Projects** | Project cards with status, progress, linked tasks/docs | Projects with overview, issues, config |
| **Agent Management** | Team view with org structure, agent runtime state, health | Full org chart with reporting hierarchy, roles, job descriptions, budgets |
| **Approvals/Governance** | Approval workflow + Council screen for multi-agent decisions | Board approval gates with audit trail |
| **Cost Control** | Not mentioned | Monthly token budgets per agent with hard-limit auto-pause |
| **Sessions/Continuity** | Not detailed in spec | Persistent `agentTaskSessions` that carry context across heartbeats |
| **Documents/Memory** | Docs browser + memory reader (journals, long-term memory, Mem0, Supermemory) | Not a focus -- relies on external tools |
| **Content Pipeline** | Idea backlog, drafts, reviews, scheduled/published items | Not present |
| **People Tracking** | People screen linked to work, reviews, outputs | Not present |
| **Radar/Signals** | Monitored trends, opportunities, recurring scans | Not present |
| **Factory/Pipeline** | Repeatable generation systems, stage-based pipelines | Not present |
| **Feedback** | User feedback, agent self-critique, post-mortems | Not present |
| **Multi-tenancy** | Single-user, single system | Multi-company with data isolation |
| **Activity/Audit** | Live activity feed | Immutable audit trail with cost/tool-call tracing |
| **Search** | Global search across all entities | Not highlighted as a feature |
| **Notifications/Inbox** | Not detailed | Inbox with unread/recent/all notifications |

---

## Architecture Comparison

| Aspect | **Command Center** | **Paperclip** |
|---|---|---|
| **Frontend** | Next.js (App Router), Tailwind | React 19, Vite 6, Radix UI, Tailwind 4 |
| **Backend** | Next.js API routes (implied) | Express.js 5 REST API |
| **Database** | SQLite (local indexing layer) | PostgreSQL 17 (Drizzle ORM), embedded PGlite for dev |
| **Real-time** | Not specified | SSE (Server-Sent Events) |
| **Auth** | Not specified (local-first, presumably none) | Better Auth (sessions + API keys + agent JWT tokens) |
| **Data philosophy** | Local files remain canonical; SQLite indexes them | PostgreSQL is the source of truth |
| **Agent adapters** | OpenClaw/Claude Code only | 9 adapters: Claude, Codex, Cursor, Gemini, OpenCode, Pi, OpenClaw, Process, HTTP |
| **Deployment** | Local dev server | Self-hosted, Docker-ready, embedded DB option |

---

## Design & UX

Both use a **dark premium dashboard aesthetic**. The Command Center screenshots show a polished, Linear-inspired UI with:
- Kanban task board with color-coded cards
- Weekly schedule grid with color-coded blocks
- Project cards with progress bars and team avatars
- Session journals with structured notes
- Document/newsletter preview
- Agent team visualization with network graph

Paperclip's UI is similarly dark-themed with:
- Dashboard with active agent panels and activity charts
- Org chart visualization
- Issue detail views with comment threads
- Agent detail pages with run transcripts and session logs
- Cost tracking dashboards

**Key design difference**: Command Center feels more like a *personal operations dashboard* (journals, memory, content pipeline, radar). Paperclip feels more like a *business management platform* (org charts, budgets, multi-company).

---

## Key Differences

### 1. Scope & Philosophy
- **Command Center** is broader and more ambitious in feature count (16 screens) but focused on a single user's AI system. It emphasizes memory, documents, content creation, and personal knowledge management alongside task management.
- **Paperclip** is narrower in scope but deeper in execution. It focuses on the core loop: define agents, assign work, track costs, govern decisions.

### 2. Agent Support
- **Command Center** is tightly coupled to OpenClaw/Claude Code.
- **Paperclip** has a pluggable adapter system supporting 9 different agent runtimes out of the box.

### 3. Data Model
- **Command Center** indexes local files (markdown, JSON, YAML) into SQLite. Files remain canonical.
- **Paperclip** uses PostgreSQL as the source of truth with 35+ schema tables. Much more structured.

### 4. Maturity
- **Command Center** has detailed specs and a working prototype ("Mission Control"), but the Phase 1 checklist suggests it's early in structured development.
- **Paperclip** is a complete, running open-source project with a full monorepo, migrations, tests, CI/CD, and versioned releases.

### 5. Unique to Command Center (not in Paperclip)
- Memory/journal system with daily entries
- Document browser with file indexing
- Content pipeline (drafts, reviews, publishing)
- People tracking
- Radar/signals monitoring
- Factory (repeatable generation systems)
- Pipeline (stage-based workflows)
- Feedback/post-mortems
- ClawHub skills browser with install/analyze/fork actions

### 6. Unique to Paperclip (not in Command Center)
- Per-agent token budgets with hard spending limits
- Multi-company/multi-tenant support
- Persistent conversation sessions across heartbeats
- Pluggable adapter system for any agent runtime
- Auth system (sessions, API keys, agent JWT)
- CLI client for onboarding and control

---

## Decision: Run Side-by-Side with API Integration

After evaluating three options, **keeping the projects separate** is the chosen path:

- **Build on top of Paperclip** -- Rejected. Creates a fork maintenance problem. Every Paperclip update would require merging upstream changes, resolving conflicts, and re-testing. The codebases would diverge over time, making upgrades increasingly painful.
- **Port Paperclip features into Command Center** -- Rejected. Unclear whether Command Center would be widely adopted, so investing in reimplementing Paperclip's infrastructure (adapters, sessions, cost control) is hard to justify upfront.
- **Run side-by-side** -- Chosen. Command Center stays fully independent with its own stack, vision, and release cadence. Paperclip runs alongside as the agent orchestration engine.

---

## Integration Approach

### Relationship

```
┌─────────────────────────────────────────────────┐
│  Command Center (Next.js)                       │
│  Personal operations dashboard                  │
│                                                 │
│  Owns: ALL screens, local SQLite for:           │
│    tasks, agents, projects, approvals,          │
│    memory, docs, content, radar, factory,       │
│    pipeline, feedback, people, schedules        │
│                                                 │
│  Auto-discovers agents from openclaw.json       │
│                                                 │
│  Optionally reads from Paperclip REST API:      │
│  - Live agent heartbeat and execution status    │
│  - Heartbeat runs and session logs              │
│  - Token costs and budget usage                 │
│  - Org structure                                │
├─────────────────────────────────────────────────┤
│  Paperclip REST API (http://localhost:3100)      │
├─────────────────────────────────────────────────┤
│  Paperclip (Express + PostgreSQL)               │
│  Agent orchestration engine                     │
│                                                 │
│  Owns: Agent execution, heartbeat scheduling,   │
│        adapters, sessions, cost control, auth,  │
│        issue tracking, org chart, approvals     │
└─────────────────────────────────────────────────┘
```

### What Command Center owns vs delegates

| Concern | Owner | Notes |
|---|---|---|
| Task/issue CRUD | **Command Center** (primary) + Paperclip (overlay) | Local SQLite for full CRUD; Paperclip issues merge as read-only |
| Agent registration & status | **Command Center** (primary) + Paperclip (overlay) | Local agents editable; Paperclip agents read-only with live heartbeat |
| Projects | **Command Center** (primary) + Paperclip (overlay) | Local SQLite for CRUD; Paperclip projects merge as read-only |
| Approvals | **Command Center** (primary) + Paperclip (overlay) | Local approve/reject; Paperclip approvals via API |
| Agent execution & scheduling | **Paperclip** | Heartbeat protocol, adapter system (not replicated locally) |
| Cost tracking & budgets | **Paperclip** | Command Center surfaces this data in its dashboard |
| Agent sessions & continuity | **Paperclip** | Command Center shows session history/logs |
| Org structure | **Paperclip** | Command Center renders its own Team view using this data |
| Memory & journals | **Command Center** | Local files, not in Paperclip |
| Documents & file browsing | **Command Center** | Local filesystem indexing |
| Content pipeline | **Command Center** | Drafts, reviews, publishing workflow |
| Radar / signals | **Command Center** | Trend monitoring, opportunity scanning |
| Factory / pipelines | **Command Center** | Repeatable generation systems |
| Feedback & post-mortems | **Command Center** | Agent self-critique, user feedback |
| People tracking | **Command Center** | Linked to work and outputs |
| Calendar / scheduling UI | **Command Center** | May pull heartbeat schedules from Paperclip |
| Search | **Command Center** | Unified search across local data + Paperclip entities |

### Integration pattern

Command Center connects to Paperclip as a **read-heavy API client**:

1. **Server-side data fetching** -- Next.js API routes proxy to Paperclip's REST API, keeping the Paperclip URL/auth server-side
2. **Polling or SSE** -- Subscribe to Paperclip's SSE endpoint for real-time agent status, or poll at intervals
3. **Write-through for actions** -- When a user assigns a task or approves something in Command Center, forward the action to Paperclip's API
4. **Local-first for Command Center data** -- Memory, documents, content, radar etc. stay in local files indexed by SQLite, completely independent of Paperclip
5. **Graceful degradation** -- If Paperclip is not running, Command Center still works for all its own features; agent-related screens show a "connect to Paperclip" prompt

### Benefits of this approach

- **Zero coupling** -- Paperclip upgrades are just `git pull && pnpm install`. No merge conflicts.
- **Independent releases** -- Ship Command Center features without waiting on or breaking Paperclip.
- **Clean separation of concerns** -- Paperclip does orchestration, Command Center does operations UX.
- **Optionality** -- If a better orchestration engine appears, swap it out by writing a new API adapter.
- **Full control** -- Command Center's stack, data model, and UX decisions are entirely yours.
