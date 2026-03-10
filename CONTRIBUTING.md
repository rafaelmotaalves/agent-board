# Contributing to AgentBoard

## Prerequisites

- [Bun](https://bun.sh) >= 1.0

## Setup

```bash
bun install
```

## Development Workflow

We use automated scripts to create isolated worktrees for every change. This keeps the main checkout clean and makes it easy to work on multiple tasks in parallel.

### 1. Start a Session (Create a Worktree)

```powershell
# Auto-generate a session branch name (e.g. session/2026-03-10-a3f1)
.\bin\new-session.ps1

# Or provide a descriptive name
.\bin\new-session.ps1 -Name "feat/task-filtering"
```

The script will:
- Create a new branch based on the current branch
- Set up a worktree at `../ai-board-<branch-name>`
- Run `bun install` in the worktree

Then move into the worktree:

```powershell
cd "<printed-worktree-path>"
```

| Flag | Description |
|------|-------------|
| `-Name <string>` | Feature branch name. Auto-generated if omitted. |

### 2. Make Your Changes

Implement your changes inside the worktree directory.

### 3. Build, Lint & Test

```bash
bun run build        # Production build
bun run lint         # ESLint (flat config with core-web-vitals + typescript)
bun test             # Unit tests (Bun + React Testing Library)
bun run test:watch   # Unit tests in watch mode
bunx jest path/to/file  # Run a single test file
```

**Coverage reports**

```bash
bun run test:coverage          # Terminal coverage summary
bun run test:coverage:report   # Generate LCOV report in ./coverage/
```

The terminal report shows per-file line coverage inline. The LCOV reporter writes `coverage/lcov.info` which can be consumed by CI tools (Codecov, Coveralls, GitHub Actions) or converted to HTML with `genhtml coverage/lcov.info -o coverage/html` (requires `lcov` installed).

Always run unit tests after making changes and ensure they all pass before finishing. Do **not** run E2E tests (`bun run test:e2e`) unless explicitly asked.

**E2E tests (Playwright, Chromium only)**

```bash
bun run test:e2e        # Run all E2E tests (auto-starts dev server)
bun run test:e2e:ui     # Playwright UI mode
bunx playwright test e2e/home.spec.ts  # Run a single E2E file
```

### 4. Finish the Session (Commit, Push & PR)

```powershell
.\bin\finish-session.ps1 -Message "feat: add task filtering by status"
```

The script will:
- Stage all changes
- Commit with the provided message
- Push the branch to origin
- Create a pull request via `gh pr create`

| Flag | Description |
|------|-------------|
| `-Message <string>` | **Required.** Commit message (use conventional commit format). |
| `-Cleanup` | Remove the worktree after PR creation. |

**Example with cleanup:**

```powershell
.\bin\finish-session.ps1 -Message "fix: resolve null ref on empty board" -Cleanup
```

### Commit Message Conventions

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Tooling, deps, or non-functional changes |
| `refactor:` | Code restructuring without behaviour change |
| `docs:` | Documentation updates |
| `test:` | Adding or updating tests |

## Architecture

- **Next.js 16** with App Router, TypeScript strict mode, and Turbopack dev server
- **`src/app/`** — App Router pages and layouts; each route is a directory with `page.tsx`
- **`src/lib/`** — shared logic: database, task/agent services, queues, streaming store
- **`src/worker.ts`** — background worker that polls the queue and dispatches tasks to agents
- **`e2e/`** — Playwright E2E tests (separate from `src/`)

## Code Conventions

- **Path alias**: `@/*` maps to `src/*` (e.g. `import Foo from "@/components/Foo"`)
- **Styling**: Tailwind CSS v4 via PostCSS — use utility classes directly, no CSS modules
- **Unit tests**: Place in `__tests__/` as `*.test.tsx`; use `@testing-library/react` with `screen` queries and `jest-dom` matchers
- **E2E tests**: Place in `e2e/` as `*.spec.ts`; use Playwright's locator API (`getByRole`, `getByText`) — avoid CSS selectors
- **Components**: React Server Components by default; add `"use client"` only when client interactivity is needed
