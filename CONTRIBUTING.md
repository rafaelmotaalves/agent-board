# Contributing to AgentBoard

## Prerequisites

- [Bun](https://bun.sh) >= 1.0

## Setup

```bash
bun install
```

## Development Workflow

### 1. Create a Worktree from the Current Branch

Use a Git worktree to isolate work without switching branches in the main directory.

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
FEATURE_BRANCH="<your-feature-branch-name>"
WORKTREE_PATH="../ai-board-$FEATURE_BRANCH"

git worktree add -b "$FEATURE_BRANCH" "$WORKTREE_PATH" "$BRANCH"
cd "$WORKTREE_PATH"
```

> Replace `<your-feature-branch-name>` with a descriptive name, e.g. `feat/my-feature` or `fix/bug-description`.

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

### 4. Commit Changes

```bash
git add .
git commit -m "feat: <short description of what changed>"
```

Commit message conventions:

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Tooling, deps, or non-functional changes |
| `refactor:` | Code restructuring without behaviour change |
| `docs:` | Documentation updates |
| `test:` | Adding or updating tests |

### 5. Push and Open a Pull Request

```bash
git push -u origin "$FEATURE_BRANCH"

gh pr create \
  --base main \
  --head "$FEATURE_BRANCH" \
  --title "<PR title>" \
  --body "<PR description>" \
  --web
```

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
