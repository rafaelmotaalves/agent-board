# Copilot Instructions for ai-board

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

When implementing any change, follow this sequence strictly:

1. **Implement the change** — Write the feature or fix in the source code.
2. **Write unit tests** — Add or update Jest tests in the relevant `__tests__/` directory covering the changed behavior.
3. **Run unit tests and confirm they pass** — Execute `bun test` (or `bunx jest path/to/file` for a targeted run). Do not proceed until all unit tests pass.
4. **Write E2E tests** — Add or update Playwright tests in `e2e/` covering the user-facing behavior introduced by the change.
5. **Run E2E tests and confirm they pass** — Execute `bun run test:e2e`. Do not consider the task complete until all E2E tests pass.

Never skip or reorder these steps. If a test fails, fix the underlying code (or test) before moving on.

## Conventions

- **Path alias**: Use `@/*` to import from `src/*` (e.g., `import Foo from "@/components/Foo"`)
- **Styling**: Tailwind CSS v4 via PostCSS — use utility classes directly, no CSS modules
- **Unit tests**: Place in `__tests__/` directories as `*.test.tsx`. Use `@testing-library/react` with `screen` queries and `jest-dom` matchers
- **E2E tests**: Place in `e2e/` as `*.spec.ts`. Use Playwright's locator API (`getByRole`, `getByText`) — avoid CSS selectors
- **Components**: React Server Components by default. Add `"use client"` only when client interactivity is needed
