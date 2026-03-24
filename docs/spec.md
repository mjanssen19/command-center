# Command Centre

## Product Vision

Command Centre is a local-first operating system for OpenClaw: a premium command layer where autonomous AI work becomes visible, controllable, reviewable, and strategically useful.

Most OpenClaw setups are powerful but fragmented. Tasks live in chats, documents disappear into folders, memory is hard to inspect, autonomous schedules are invisible, and approvals happen ad hoc. Command Centre turns that fragmented experience into a coherent product: one place to assign work, watch progress, inspect outputs, review decisions, browse memory, and understand what the system is doing on your behalf.

The goal is not just to create a dashboard. The goal is to create a real operational interface for an AI organization. Command Centre should make OpenClaw feel less like a hidden background process and more like a structured, local-first autonomous company that works with me, reports clearly, and improves over time.

This product should be useful both as a personal command console and as something I could show to another operator, collaborator, or client as a serious software product.

## Product Story

OpenClaw can already reason, create files, schedule tasks, maintain memory, and generate outputs. The problem is that those capabilities are often spread across chats, markdown files, logs, and implicit workflows. Command Centre is the missing layer that turns OpenClaw from a powerful but opaque assistant into a visible and operable system.

The experience should feel like running a modern AI-native operations console:
- assign work from a real task board
- watch autonomous work move through execution states
- inspect what is scheduled and why
- browse every generated document in a structured interface
- read memory as a timeline of accumulated intelligence
- review outputs before they are sent or published
- understand the current team of agents and how they are organized
- navigate all of it through shared search, links, and operational context

In product terms, Command Centre should sit between raw OpenClaw capability and day-to-day human trust. It should increase observability, accountability, speed, and confidence.

## Claude Code CLI Fit

This product should be buildable with **Claude Code CLI**.

The specification should favor:
- local-first development
- clear file structure
- incremental implementation
- inspectable data models
- straightforward commands
- minimal reliance on proprietary hosted services unless already available
- components and workflows Claude Code CLI can realistically create and iterate on in a local repo

The implementation should be suited to a workflow where Claude Code CLI can:
- inspect the existing OpenClaw workspace
- infer folder structure
- generate or modify files in a Next.js TypeScript project
- add indexing logic
- create pages and shared components
- connect SQLite as a local metadata/index layer
- implement page-level features incrementally

Where paths, runtime discovery points, or integration details are not obvious, the builder should first inspect the local workspace and infer sensible defaults before asking unnecessary follow-up questions.

## Product Goal

Command Centre should become the main operational surface for:
- seeing what OpenClaw is doing now
- seeing what it has done
- assigning new work
- reviewing outputs
- managing projects
- browsing documents and memory
- tracking scheduled autonomous routines
- understanding the current agent structure
- reviewing approvals before important actions happen
- navigating all of this through a shared connected system

This app should not be a collection of disconnected pages. It should use a shared entity model and a consistent data layer so the pages reinforce each other.

## Architecture and Data Model

Use a shared entity graph / relational model across the app.

**All core screens work fully without Paperclip.** SQLite is the primary data store for tasks, agents, projects, approvals, and all other entities. Paperclip is an optional read-only overlay that merges live agent execution data when connected.

### Agent Discovery

Command Center automatically discovers OpenClaw agents from `openclaw.json` in the workspace (`$OPENCLAW_WORKSPACE_PATH/openclaw.json`). The scanner reads:
- `agents.list[]` — agent ID, name, emoji, workspace path, default flag
- `agents.defaults.model.primary` — which AI model agents use
- `bindings[]` — which channels (e.g., Telegram) agents are bound to

The scanner **never reads or stores** sensitive fields: bot tokens, API keys, auth credentials, or channel configurations. If `openclaw.json` doesn't exist or has no `agents` section, agents can be registered manually from the Agents screen.

### Core entities
- Agents (auto-discovered from openclaw.json + manually registered)
- Tasks (local CRUD, optionally merged with Paperclip issues)
- Projects (local CRUD, optionally merged with Paperclip projects)
- Documents
- Memories
- Long-term memory records
- Scheduled jobs
- Calendar events
- Approvals (local CRUD, optionally merged with Paperclip approvals)
- Activity events
- People
- Content items
- Council proposals (can be promoted to Projects)
- Pipelines
- System resources
- Feedback items

Every major entity should support links to related entities where appropriate. For example:
- a task can link to a project, agent, approval, document, memory, schedule, or content item
- an agent is linked to its tasks, projects, and schedules
- a document can link to a project, task, agent, approval, or pipeline
- a memory can link to a project, task, person, agent, or document
- an approval can link to a task, project gate, or deliverable review
- a scheduled job can link to a task template, agent, project, or content workflow
- a council proposal can be promoted to a project

### Data sources

| Entity | Primary source | Optional overlay |
|---|---|---|
| Tasks | Local SQLite | Paperclip issues (read-only) |
| Agents | Local SQLite (from openclaw.json + manual) | Paperclip agents (read-only, live heartbeat) |
| Projects | Local SQLite | Paperclip projects (read-only) |
| Approvals | Local SQLite | Paperclip approvals (read-only) |
| Memory | Local files indexed into SQLite | Mem0, Supermemory |
| Documents | Local files indexed into SQLite | — |
| Schedules | Local SQLite | — |
| Calendar | Local schedules + Paperclip due dates | External ICS feed |
| Content, Council, People, Radar, Factory, Pipeline, Feedback | Local SQLite | — |

Use SQLite as the preferred local indexing and relationship layer, but do not force everything into the database if local files are already the source of truth. Prefer this model:
- local OpenClaw-created files remain canonical where appropriate
- SQLite acts as the searchable index, metadata store, relationship graph, and UI query layer
- background indexing keeps the UI current

Support a file indexing pipeline that:
- scans known OpenClaw local folders recursively
- reads markdown, json, yaml, txt, csv, and other common OpenClaw-generated files
- extracts metadata
- creates entity links where possible
- refreshes on startup and on a background interval
- safely tolerates missing or changing files

## Global UI Shell

Create a shared shell with:
- left sidebar navigation
- top bar with global search / command bar
- page title and context
- status indicators
- fast navigation
- keyboard-friendly design
- responsive layout for desktop-first usage

Keep the sidebar and exclude Office only.

Sidebar items:
- Tasks
- Agents
- Content
- Approvals
- Council
- Scheduling
- Calendar
- Projects
- Memory
- Docs
- People
- Team
- System
- Radar
- Factory
- Pipeline
- Feedback
- ClawHub

Even if some of these are early-stage screens, they must still be useful and functional, not empty placeholders.

Global search / command bar should:
- search across tasks, projects, docs, memories, agents, people, schedules, approvals, and content
- allow quick navigation
- support action shortcuts like new task, new project, review approvals, open latest document, open today’s memory, view due items

## Design Direction

Use the attached visual direction as inspiration:
- dark background
- subtle panel contrast
- compact left sidebar
- sharp but soft card edges
- kanban and split-pane layouts
- high information density without clutter
- premium dashboard aesthetic
- calm colors with selected accent colors for state
- no bright consumer-style UI
- no cartoonish design
- no giant rounded toy components

The UI should feel like a serious AI operations console.

Do not hardcode example agent names from any demo video. Instead, inspect the current OpenClaw environment and populate agent and sub-agent structures dynamically. If there are no discovered agents yet, create a graceful empty state and instructions for how the app should populate them over time.

## Screens

### Tasks
Build a real task operations board with:
- top-level metrics such as tasks this week, in progress, total, completion rate
- filters for assignee, project, status, and type
- a “New Task” action
- kanban columns such as Recurring, Backlog, In Progress, Review, Done
- task cards with title, short description, linked project, linked agent, status, timestamps, and priority
- right-side live activity feed
- recurring task support
- lightweight task creation and task state changes from the UI

OpenClaw must use this board operationally, not just visually.

Add support for heartbeat-driven task pickup behavior:
- on each heartbeat, OpenClaw should check for eligible backlog tasks assigned to it or to an eligible agent
- if found, it should pick up the task, update state accordingly, and begin work
- the UI should reflect the task lifecycle and activity history
- keep an event trail of transitions and work logs
- allow review states and approvals before final completion where appropriate

### Scheduling
Create a Scheduling screen focused on autonomous routines, cron jobs, recurring workflows, and system-driven work.

Show:
- recurring routines
- cron-like scheduled jobs
- per-day / per-week schedule view
- always-running automations
- job frequency
- next run time
- linked project / agent / task template
- status and last run result
- execution history

### Calendar
Create a separate Calendar screen for:
- project milestones
- due dates
- review deadlines
- scheduled approvals
- optionally visible external calendars
- optionally visible calendars OpenClaw already has access to

Clearly distinguish:
- autonomous schedules
- milestone dates
- external calendar events
- deadlines and review dates

### Projects
Create a projects dashboard with:
- title
- short description
- status
- progress indicator
- owner/responsible agent if known
- priority
- last activity
- linked tasks, docs, approvals, schedules

Project views should show blockers, approvals, related memory, milestones, and next recommended tasks.

### Memory
Create a read-focused memory browser with:
- daily journals / grouped memories
- long-term memory records
- search
- source attribution
- links to related projects, tasks, people, documents, and agents
- unified view across local memory, Mem0, and Supermemory if configured

Memory should not be manually edited by default from the UI.

### Docs
Create a Docs screen for locally created OpenClaw documents and related files with:
- recursive indexing
- search
- file type filters
- tags
- metadata extraction
- rich preview
- markdown rendering
- code blocks
- inferred links to projects, tasks, agents, and approvals

### Team
Create an org-structure screen with:
- mission statement section at the top
- top-level OpenClaw role
- discovered agents and sub-agents
- hierarchy
- responsibilities
- capabilities/tags
- machine/runtime placement if known
- model/provider if known

### Approvals
Create a first-class Approvals workflow for:
- draft emails
- content drafts
- documents before finalization
- project gates
- task reviews
- human review requests from OpenClaw

### Agents
Create an operational runtime screen for individual agents, including:
- current task
- session status
- heartbeat health
- machine/environment
- model/provider
- recent actions
- linked schedules and projects

### Content
Track content workflows including:
- idea backlog
- drafts
- reviews
- scheduled items
- published items
- channels
- approvals

### Council
Create a multi-agent decision surface for:
- proposals
- debates
- rationale
- recommendations
- unresolved decisions

### People
Track people/entities linked to work, reviews, outputs, and memory.

### System
Show health, indexing status, integrations, scheduler status, errors, and environment visibility.

### Radar
Track monitored trends, signals, opportunities, and recurring scans.

### Factory
Represent repeatable generation systems, production loops, and quality-gated output workflows.

### Pipeline
Represent stage-based movement of work across repeatable processes.

### Feedback
Collect user feedback, agent self-critique, post-mortems, review notes, and rejected-output reasons.

### ClawHub
Browse, search, and manage OpenClaw skills from the ClawHub registry (clawhub.ai).

Show:
- trending, popular, and recently updated skills
- vector search across all published skills
- skill detail with rendered SKILL.md preview
- metadata: version, owner, OS compatibility, moderation/security status
- version history with changelogs

Actions per skill:
- Install on Server: runs `clawhub install` in the OpenClaw workspace
- Analyze with Agent: fetches the skill source and creates a Task for an OpenClaw agent to review it for security, quality, and usefulness
- Create My Version: fetches the skill source and creates a Task for an agent to build a clean-room reimplementation when the user does not trust the original source

Data source: ClawHub public REST API (no authentication needed for reads). Install action requires `npx` on the server.

## Integrations and Memory Providers

If available, support integrations for:
- local OpenClaw files and generated artifacts
- local memory files
- Mem0
- Supermemory
- existing OpenClaw scheduling data
- external calendar data if already accessible

For Mem0 and Supermemory, expose configuration/status cleanly if discoverable and do not break the app if they are not configured.

## Indexing, Relationship Extraction, and Search

Build a local indexing layer that:
- scans files
- stores searchable metadata
- extracts candidate relationships
- powers the global search and page-level search
- updates incrementally when possible

Where exact relationship inference is uncertain, use safe heuristics and show inferred links carefully.

## Additional Improvements

Add a global command/search bar that can jump to tasks, projects, docs, memories, agents, schedules, approvals, and actions.

Treat SQLite as the indexing and relationship layer, while local files remain the source of truth where appropriate. This should support robust search, linking, and navigation without forcing all data to become database-native immediately.

If any required local paths, memory sources, or runtime discovery points are unknown, inspect the current OpenClaw workspace and infer the best defaults before asking follow-up questions.

## UX Principles

The app should:
- be immediately useful even with partial data
- gracefully handle empty states
- surface uncertainty instead of hallucinating data
- separate discovered facts from inferred relationships
- be fast
- feel premium
- prioritize operational clarity
- be easy for OpenClaw itself and Claude Code CLI to extend over time

## Implementation Notes

Use sensible local-first defaults.
Prefer robust file-system scanning and indexing.
Use SQLite to unify metadata, search, and relationships where appropriate.
Do not block the app on all integrations being available.
Design the codebase so new pages and entities can be added easily.
Make the system self-describing so future OpenClaw prompts can extend it.
Favor implementation steps Claude Code CLI can execute incrementally in a local repo.

## Success Criteria

I should be able to:
- open Command Centre locally
- create a task
- have OpenClaw detect and pick it up through its operating flow / heartbeat behavior
- inspect scheduled autonomous work
- inspect milestones and calendar items separately
- browse projects, documents, and memory with meaningful links
- review approvals before important actions
- understand the current agent structure and runtime state
- search across everything from one place
- use this as the main dashboard for my OpenClaw environment

Build the first working version now with real screens, real data plumbing, and a cohesive shared architecture.
