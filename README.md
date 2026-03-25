# Command Center

Local-first operations dashboard for [OpenClaw](https://openclaw.ai). A premium command layer where autonomous AI work becomes visible, controllable, reviewable, and strategically useful.

## What is this?

Command Center turns a fragmented OpenClaw setup into a coherent operational interface. One place to assign work, watch progress, inspect outputs, review decisions, browse memory, manage documents, and understand what your AI agents are doing.

**Everything works without Paperclip.** All 18 screens are fully functional with local SQLite storage. [Paperclip](https://github.com/openclaw/paperclip) is an optional read-only overlay that adds live agent execution data when connected.

## Screens

| Screen | Description |
|---|---|
| **Tasks** | Kanban board (Backlog / In Progress / Review / Done) with metrics, filters, and task detail panel |
| **Agents** | Agent grid with status, heartbeat, model/cost display — auto-discovers from `openclaw.json` |
| **Projects** | Project cards with progress, status, linked tasks and docs |
| **Approvals** | Approval queue with approve/reject actions |
| **Team** | Org tree visualization with mission statement |
| **Scheduling** | Schedule list with cron humanization and weekly grid |
| **Memory** | Timeline view grouped by day with search, source badges, entity links |
| **Docs** | Split-pane file browser with markdown preview and metadata |
| **Calendar** | Month grid with multi-source events (tasks, schedules, external ICS) |
| **Content** | Content pipeline (Idea / Draft / Review / Scheduled / Published) |
| **Council** | Multi-agent decision surface with proposals and debate entries |
| **People** | People tracking with roles, relationships, linked entities |
| **Radar** | Monitored trends, signals, and opportunities |
| **Factory** | Repeatable generation systems with pipeline steps |
| **Pipeline** | Stage-based workflow boards |
| **Feedback** | User feedback, agent self-critique, post-mortems |
| **ClawHub** | Browse, search, and install skills from the ClawHub registry |
| **System** | Health dashboard, integration status, indexing controls |

## Agent Discovery

Command Center automatically discovers OpenClaw agents from `openclaw.json` in your workspace. It reads agent names, IDs, emojis, models, and channel bindings. **Sensitive fields (bot tokens, API keys) are never read or stored.**

If no `openclaw.json` exists, agents can be registered manually.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: SQLite (better-sqlite3, local-first)
- **Data fetching**: TanStack Query
- **Command palette**: cmdk
- **Icons**: lucide-react
- **Process manager**: PM2
- **Network / auth**: Tailscale
- **CI/CD**: GitHub Actions

## Quick Start

```bash
git clone https://github.com/mjanssen19/command-center.git
cd command-center
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENCLAW_WORKSPACE_PATH` | Yes | Path to your OpenClaw workspace (for file indexing and agent discovery) |
| `PAPERCLIP_API_URL` | No | Paperclip base URL (default: `http://localhost:3100`) |
| `PAPERCLIP_API_KEY` | No | Paperclip API key |
| `NEXT_PUBLIC_PAPERCLIP_WS_URL` | No | Paperclip WebSocket URL for real-time updates |
| `MEM0_API_KEY` | No | Mem0 integration for memory |
| `SUPERMEMORY_API_KEY` | No | Supermemory integration for memory |
| `CALENDAR_ICS_URL` | No | External calendar ICS feed URL |

Only `OPENCLAW_WORKSPACE_PATH` is required. Everything else is optional.

## Server Deployment

The app auto-deploys via GitHub Actions on every push to `main`. The server is secured via Tailscale.

See [`docs/install.md`](docs/install.md) for full installation instructions.

## Documentation

- [`docs/spec.md`](docs/spec.md) — Product vision and screen specifications
- [`docs/plan.md`](docs/plan.md) — Architecture decisions, phases, tech stack
- [`docs/implementation.md`](docs/implementation.md) — Step-by-step build guide
- [`docs/comparison.md`](docs/comparison.md) — Command Center vs Paperclip analysis
- [`docs/install.md`](docs/install.md) — Server installation guide

## License

[MIT](LICENSE)
