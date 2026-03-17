# Agent Board

A kanban-style task board where AI agents autonomously work through tasks. Create tasks, assign them to AI agents, and watch them plan and execute work in real time — with streaming responses and live status updates.

## Features

- **Kanban board** — tasks move through `pending → in_progress → done / failed` states
- **AI agents** — register agents (backed by the GitHub Copilot SDK or any compatible endpoint) that autonomously plan and execute tasks
- **Streaming responses** — agent output streams to the task detail modal in real time via SSE
- **Task queue worker** — a background worker polls for queued tasks and dispatches them to available agents in the pool
- **Conversation history** — every agent message is persisted and displayed per task
- **SQLite persistence** — lightweight local database via `better-sqlite3`

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Runtime / Package manager | [Bun](https://bun.sh) |
| Database | SQLite |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| AI | [GitHub Copilot SDK](https://github.com/github/copilot-sdk-js) |
| Unit tests | Bun built-in test runner + React Testing Library |
| E2E tests | [Playwright](https://playwright.dev) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0

### Install dependencies

```bash
bun install
```

### Run the development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run the background worker

In a separate terminal:

```bash
bun run src/worker.ts
```

The worker polls the task queue every second and dispatches tasks to registered agents.

## Agent Configuration via `--config`

You can pre-configure agents using a JSON config file instead of (or in addition to) the web UI. Pass the `--config` flag when starting the board:

```bash
agent-board --config ./agents.json
```

On startup, the worker reads the config file and syncs agents into the database:
- **New agents** (by name) are created
- **Changed agents** are updated
- **Unchanged agents** are skipped
- **Agents not in the config** are left untouched (additive-only — no deletions)

### Config file schema

```json
{
  "agents": [
    {
      "name": "My Copilot Agent",
      "type": "copilot_cli_sdk",
      "port": 8000,
      "folder": "/path/to/workspace",
      "options": { "parallel_planning": true }
    },
    {
      "name": "My ACP Agent",
      "type": "acp",
      "command": "python agent.py",
      "folder": "/path/to/project"
    }
  ]
}
```

### Agent fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Agent display name (used as the match key for syncing) |
| `type` | string | No (default: `copilot_cli_sdk`) | Agent type: `copilot_cli_sdk` or `acp` |
| `port` | number | ✅ for `copilot_cli_sdk` | Port the agent listens on (1–65535) |
| `command` | string | ✅ for `acp` | Command to start the ACP agent |
| `folder` | string | ✅ | Working directory for the agent |
| `options` | object | No | Agent-specific options (e.g. `{ "parallel_planning": true }`) |

## Available Scripts

```bash
bun run dev          # Dev server (Turbopack) on http://localhost:3000
bun run build        # Production build
bun run start        # Start production server
bun run lint         # ESLint
bun test             # Unit tests
bun run test:watch   # Unit tests in watch mode
bun run test:e2e     # Playwright E2E tests (auto-starts dev server)
bun run test:e2e:ui  # Playwright UI mode
```

## Project Structure

```
src/
  app/
    api/           # REST API routes (tasks, agents, SSE stream)
    components/    # React components (Board, TaskDetailModal, AgentList)
    page.tsx       # Entry point
  lib/
    agentCaller.ts   # IAgentCaller interface
    agentPool.ts     # Agent pool management
    agentService.ts
    copilotCaller.ts # GitHub Copilot SDK implementation
    db.ts            # SQLite setup
    queues.ts        # Queue slug constants
    taskService.ts   # Task CRUD and state machine
    types.ts         # Shared TypeScript types
    worker.ts        # TaskWorker - background queue processor
  worker.ts          # Worker entry point
e2e/               # Playwright E2E tests
```

## Environment Variables

Create a `.env.local` file (never committed) for any secrets:

```env
# Add any API keys or config required by your agent implementation
GITHUB_TOKEN=your_token_here
```

## License

MIT
