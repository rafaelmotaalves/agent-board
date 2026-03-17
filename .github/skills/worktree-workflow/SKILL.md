---
name: worktree-workflow
description: >-
  WORKFLOW SKILL — Mandatory workflow for creating Git worktrees, committing
  changes, and opening PRs. Always use at the start of every development session,
  before making any code changes.
---

# Agent Skill: Worktree Workflow

**When to use:** At the start of every development session, before making any code changes.

This skill defines the mandatory workflow for creating isolated worktrees, committing changes, and opening pull requests.

---

## Step 1 — Create a Worktree

Create a Git worktree from the current branch to isolate your work.

```bash
# Capture the current branch (this becomes the PR base)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Choose a descriptive feature branch name
FEATURE_BRANCH="<descriptive-branch-name>"   # e.g. feat/add-filtering, fix/null-pointer
WORKTREE_PATH="../ai-board-$FEATURE_BRANCH"

# Create the worktree and new branch
git worktree add -b "$FEATURE_BRANCH" "$WORKTREE_PATH" "$BRANCH"

# Move into the worktree
cd "$WORKTREE_PATH"
```

> **Important:** Remember the value of `$BRANCH` — you will use it as the `--base` when creating the PR.

## Step 2 — Install Dependencies

```bash
bun install
```

## Step 3 — Implement Changes

Make all code changes inside the worktree directory. Follow the project's architecture and conventions documented in `AGENTS.md`.

## Step 4 — Commit

Stage and commit with a conventional commit message. Always include the Co-authored-by trailer.

```bash
git add .
git commit -m "<type>: <short description>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Commit-message prefixes:
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — tooling, dependencies, or non-functional changes
- `refactor:` — code restructuring without behaviour change
- `docs:` — documentation updates
- `test:` — adding or updating tests

## Step 5 — Push

```bash
git push -u origin "$FEATURE_BRANCH"
```

## Step 6 — Create a Pull Request

Use the `gh` CLI. Set `--base` to the branch the worktree was created from (stored in `$BRANCH`), **not** a hardcoded value.

```bash
gh pr create \
  --base "$BRANCH" \
  --head "$FEATURE_BRANCH" \
  --title "<type>: <short description>" \
  --body "<describe the changes and motivation>"
```

## Step 7 — Return the PR Link

After the PR is created, share the link with the user:

```
Please review the changes in this PR: [<PR-title>](<PR-link>)
```

## Step 8 — Cleanup (after merge)

Once the PR is merged, remove the worktree and delete the local branch:

```bash
cd -
git worktree remove "$WORKTREE_PATH"
git branch -d "$FEATURE_BRANCH"
```
