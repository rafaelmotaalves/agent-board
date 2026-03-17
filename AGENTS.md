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

Follow these steps when starting new work, committing changes, and submitting a pull request.

### 1. Create a Worktree from the Current Branch

Use a Git worktree to isolate work without switching branches in the main directory.

```bash
# Get the current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Define the feature branch and worktree path
FEATURE_BRANCH="<your-feature-branch-name>"
WORKTREE_PATH="../ai-board-$FEATURE_BRANCH"

# Create a new branch and worktree based on the current branch
git worktree add -b "$FEATURE_BRANCH" "$WORKTREE_PATH" "$BRANCH"

# Navigate into the worktree
cd "$WORKTREE_PATH"
```

> Replace `<your-feature-branch-name>` with a descriptive name, e.g. `feat/my-feature` or `fix/bug-description`.

### 2. Make Your Changes

Implement your changes inside the worktree directory.

### 3. Commit Changes

Stage and commit your work with a clear, conventional commit message:

```bash
# Stage all changes (or specific files)
git add .

# Commit with a descriptive message
git commit -m "feat: <short description of what changed>"
```

Commit message conventions:
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — tooling, dependencies, or non-functional changes
- `refactor:` — code restructuring without behaviour change
- `docs:` — documentation updates
- `test:` — adding or updating tests

### 4. Push the Branch

```bash
git push -u origin "$FEATURE_BRANCH"
```

### 5. Create a Pull Request with the gh CLI

```bash
gh pr create \
  --base main \
  --head "$FEATURE_BRANCH" \
  --title "<PR title>" \
  --body "<PR description>"
```

#### Useful gh pr flags

| Flag | Description |
|------|-------------|
| `--draft` | Open as a draft PR |
| `--reviewer <handle>` | Request a specific reviewer |
| `--label <label>` | Attach a label to the PR |
| `--web` | Open the newly created PR in the browser |

#### Example

```bash
gh pr create \
  --base main \
  --head feat/task-filtering \
  --title "feat: add task filtering by status" \
  --body "Adds a status filter to the Board view. Closes #42." \
  --draft
```

### 6. Submit for Review

Once the PR is created, include the PR link and return to the user for review. Example:

```markdown
Please review the changes in this PR: [PR Title](<PR-link>)
```

## Conventions

- **Path alias**: Use `@/*` to import from `src/*` (e.g., `import Foo from "@/components/Foo"`)
- **Styling**: Tailwind CSS v4 via PostCSS — use utility classes directly, no CSS modules
- **Unit tests**: Place in `__tests__/` directories as `*.test.tsx`. Use `@testing-library/react` with `screen` queries and `jest-dom` matchers
- **E2E tests**: Place in `e2e/` as `*.spec.ts`. Use Playwright's locator API (`getByRole`, `getByText`) — avoid CSS selectors
- **Components**: React Server Components by default. Add `"use client"` only when client interactivity is needed
