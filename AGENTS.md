# Copilot Instructions for agent-board

## Build, Test, and Lint

```bash
bun run build          # Production build
bun run dev            # Dev server on http://localhost:3000
bun run lint           # ESLint (flat config with core-web-vitals + typescript)

# Unit tests (Jest + React Testing Library)
bun test               # Run all unit tests (via Jest)
bun run test:watch     # Watch mode
bunx jest path/to/file # Run a single test file

# E2E tests (Playwright, Chromium only)
bun run test:e2e       # Run all E2E tests (auto-starts dev server)
bun run test:e2e:ui    # Playwright UI mode
bunx playwright test e2e/home.spec.ts  # Run a single E2E file
```

## Architecture

- **Next.js 16** with App Router, TypeScript strict mode, and Turbopack dev server
- **`src/app/`** — App Router pages and layouts. Each route is a directory with `page.tsx`
- **`src/app/__tests__/`** — Jest unit tests colocated with the app directory
- **`e2e/`** — Playwright E2E tests (separate from `src/`)

## Development Process
You can focus on implementing the features for now, don't need to worry about implementing tests immediately. Once the main functionality is in place, we can circle back and add tests to ensure everything is working as expected and to prevent regressions in the future.

Always run the unit tests (`bun test`) after making code changes and ensure they all pass before finishing. Do **not** run E2E tests (`bun run test:e2e`) unless explicitly asked to.

## Development Workflow

Every session **must** use the automated worktree scripts. This keeps each task isolated on its own branch.

### 1. Start a Session

```powershell
# Auto-generate a session branch name
.\bin\new-session.ps1

# Or provide a descriptive name
.\bin\new-session.ps1 -Name "feat/task-filtering"
```

The script creates a new branch + worktree at `../ai-board-<branch>`, runs `bun install`, and prints the path. **Move into the worktree before doing any work:**

```powershell
cd "<printed-worktree-path>"
```

### 2. Make Your Changes

Implement your changes inside the worktree directory.

### 3. Finish the Session

When done, commit, push, and open a PR in one step:

```powershell
.\bin\finish-session.ps1 -Message "feat: add task filtering by status"
```

Add `-Cleanup` to remove the worktree after the PR is created:

```powershell
.\bin\finish-session.ps1 -Message "fix: resolve null ref" -Cleanup
```

### 4. Submit for Review

The script prints the PR URL. Return it to the user:

```markdown
Please review the changes in this PR: [PR Title](<PR-link>)
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

### Useful `gh pr` Flags

| Flag | Description |
|------|-------------|
| `--draft` | Open as a draft PR |
| `--reviewer <handle>` | Request a specific reviewer |
| `--label <label>` | Attach a label to the PR |
| `--web` | Open the newly created PR in the browser |

## Conventions

- **Path alias**: Use `@/*` to import from `src/*` (e.g., `import Foo from "@/components/Foo"`)
- **Styling**: Tailwind CSS v4 via PostCSS — use utility classes directly, no CSS modules
- **Unit tests**: Place in `__tests__/` directories as `*.test.tsx`. Use `@testing-library/react` with `screen` queries and `jest-dom` matchers
- **E2E tests**: Place in `e2e/` as `*.spec.ts`. Use Playwright's locator API (`getByRole`, `getByText`) — avoid CSS selectors
- **Components**: React Server Components by default. Add `"use client"` only when client interactivity is needed
