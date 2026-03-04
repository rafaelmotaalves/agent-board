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

## Quick Start with `bunx`

Run the development server without cloning or installing:

```bash
bunx agent-board
```

You can also specify a command:

```bash
bunx agent-board dev     # Dev server (default)
bunx agent-board build   # Production build
bunx agent-board start   # Start production server
```

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
