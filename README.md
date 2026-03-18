# Command Center

Local-first operations dashboard for OpenClaw and Paperclip.

## What is this?

Command Center is a unified dashboard that brings together agent activity, task management, and local file indexing into a single interface. It connects to [Paperclip](https://github.com/mjanssen19/paperclip) for AI agent orchestration data and [OpenClaw](https://github.com/mjanssen19/openclaw) for local workspace file indexing, giving you a real-time view of everything happening across your projects.

> Screenshots coming soon.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: SQLite (local-first)
- **Data fetching**: TanStack Query

## Prerequisites

- Node.js 20+
- npm 10+

Optional:
- [Paperclip](https://github.com/mjanssen19/paperclip) — for agent data and task management
- [OpenClaw](https://github.com/mjanssen19/openclaw) — for local file indexing

## Quick Start

```bash
git clone https://github.com/mjanssen19/command-center.git
cd command-center
cp .env.example .env.local
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See [`.env.example`](.env.example) for all available configuration options.

| Variable | Required | Description |
|---|---|---|
| `PAPERCLIP_API_URL` | Yes | URL of your Paperclip instance (default: `http://localhost:3100`) |
| `PAPERCLIP_API_KEY` | Yes | API key for Paperclip authentication |
| `OPENCLAW_WORKSPACE_PATH` | Yes | Absolute path to the OpenClaw workspace directory |
| `MEM0_API_KEY` | No | Mem0 integration key (Phase 9) |
| `SUPERMEMORY_API_KEY` | No | Supermemory integration key (Phase 9) |
| `CALENDAR_ICS_URL` | No | ICS calendar feed URL (Phase 9) |

## Deployment

The app auto-deploys to the production server via GitHub Actions on every push to `main`. The server is accessible over Tailscale. See [`docs/server-setup.md`](docs/server-setup.md) for initial server configuration.

## Architecture

See [`plan.md`](../plan.md) for the full phase breakdown and architectural decisions.

## License

[MIT](LICENSE)
