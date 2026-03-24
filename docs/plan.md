# Command Center — Plan

## Architecture Decision

Command Center is **local-first** and runs **side-by-side with Paperclip** (optional).

- **Command Center** owns: all screens, local SQLite for tasks/agents/projects/approvals/memory/docs/content/radar/factory/pipeline/feedback/people
- **Paperclip** (optional): provides live agent execution, heartbeats, cost tracking, and org structure as a read-only overlay
- When Paperclip is connected, its data merges into screens with "Paperclip" source badges (read-only)
- When Paperclip is not connected, everything works with local SQLite data
- All Command Center-owned data lives in local files + SQLite on the server
- See `comparison.md` for full rationale

## Deployment

- Open source, public GitHub repo — shareable from day one
- Auto-deploys to the OpenClaw server on every push to `main` via GitHub Actions + SSH
- Secured via **Tailscale** — bound to the Tailscale network only, no public exposure
- `tailscale serve` provides automatic HTTPS at `https://[machine].[tailnet].ts.net`
- No nginx, no Caddy, no passwords — Tailscale membership is the auth

## Phases

| Phase | Goal | Key Output |
|---|---|---|
| **0** | Discovery | `docs/workspace-audit.md`, Paperclip API catalogue |
| **1** | Scaffold | Running Next.js app, dark shell, all 17 routes, ESLint + Prettier |
| **1b** | GitHub + Deployment | Public repo, GitHub Actions CI/CD, Tailscale serve, live on server |
| **2** | Data layer | SQLite schema, file scanner, background indexer, FTS5 search |
| **3** | Paperclip integration | Server-side API proxy, React Query hooks, WebSocket live updates, offline banner |
| **4** | Core screens | Tasks (kanban), Agents, Scheduling, Projects, Approvals, Team |
| **5** | Knowledge screens | Memory, Docs, Calendar |
| **6** | Command bar | `Cmd+K` global search + action shortcuts across all entities |
| **7** | Heartbeat | Task pickup flow, activity trail, live kanban updates |
| **8** | Secondary screens | Content, Council, People, System, Radar, Factory, Pipeline, Feedback |
| **9** | Integrations | Mem0, Supermemory, external calendar (graceful degradation) |
| **10** | Local-first refactoring | Tasks, Agents, Projects, Approvals work with local SQLite as primary; Paperclip becomes optional read-only overlay |
| **11** | ClawHub browser | Skills registry browser with search, install, analyze, and fork actions |

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| UI primitives | shadcn/ui (Radix-based) |
| Icons | lucide-react |
| Local DB | better-sqlite3 |
| File watching | chokidar |
| Frontmatter parsing | gray-matter |
| File globbing | fast-glob |
| API data fetching | TanStack Query v5 |
| Command palette | cmdk |
| Markdown rendering | react-markdown + rehype-highlight |
| Process manager | PM2 |
| Network / auth | Tailscale |
| CI/CD | GitHub Actions |
| Calendar parsing | node-ical (Phase 9) |

## Conventions

- **Local-first**: all Command Center data lives in local files + SQLite; never sent to Paperclip
- **Graceful degradation**: every screen works (partially) when Paperclip is offline or not configured
- **No hallucinated data**: show empty states, never fake/demo content
- **Source attribution**: every data item shows where it came from (local file, Paperclip, Mem0, etc.)
- **Discovered vs inferred**: inferred entity links shown with a confidence indicator
- **Incremental build**: each phase is self-contained and executable in a new Claude Code session
- **Secrets never in code**: all credentials via environment variables and GitHub Secrets

## Key Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `PAPERCLIP_API_URL` | `.env.local` / server `.env.production` | Paperclip base URL (default: `http://localhost:3100`) |
| `PAPERCLIP_API_KEY` | GitHub Secret + server `.env.production` | Paperclip API key |
| `OPENCLAW_WORKSPACE_PATH` | `.env.local` / server `.env.production` | Root path for OpenClaw file indexing |
| `MEM0_API_KEY` | Optional — server `.env.production` | Mem0 integration (Phase 9) |
| `SUPERMEMORY_API_KEY` | Optional — server `.env.production` | Supermemory integration (Phase 9) |
| `CALENDAR_ICS_URL` | Optional — server `.env.production` | External calendar feed (Phase 9) |

## References

- `implementation.md` — detailed step-by-step build instructions per phase
- `comparison.md` — Command Center vs Paperclip analysis and integration approach
- `CommandCentre.md` — full product vision and screen specifications
- `CommandCentre-Phase1-Checklist.md` — original Phase 1 checklist
