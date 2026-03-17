# Copilot Instructions for agent-board

## Required Skills

**Always read and follow `.github/skills/worktree-workflow/SKILL.md` before starting any development work.** It contains the mandatory worktree-based workflow for every session.

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

See `.github/skills/worktree-workflow/SKILL.md` for the full worktree-based development workflow. Always follow it when starting a new session.

## Conventions

- **Path alias**: Use `@/*` to import from `src/*` (e.g., `import Foo from "@/components/Foo"`)
- **Styling**: Tailwind CSS v4 via PostCSS — use utility classes directly, no CSS modules
- **Unit tests**: Place in `__tests__/` directories as `*.test.tsx`. Use `@testing-library/react` with `screen` queries and `jest-dom` matchers
- **E2E tests**: Place in `e2e/` as `*.spec.ts`. Use Playwright's locator API (`getByRole`, `getByText`) — avoid CSS selectors
- **Components**: React Server Components by default. Add `"use client"` only when client interactivity is needed
