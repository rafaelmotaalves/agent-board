---
name: development-workflow
description: 'Create a worktree, commit changes, and open a PR using the gh CLI'
---

# Development Workflow

Follow these steps when starting new work, committing changes, and submitting a pull request.

## 1. Create a Worktree from the Current Branch

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

## 2. Make Your Changes

Implement your changes inside the worktree directory.

## 3. Commit Changes

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

## 4. Push the Branch

```bash
git push -u origin "$FEATURE_BRANCH"
```

## 5. Create a Pull Request with the gh CLI

```bash
gh pr create \
  --base main \
  --head "$FEATURE_BRANCH" \
  --title "<PR title>" \
  --body "<PR description>"
```

### Useful gh pr flags

| Flag | Description |
|------|-------------|
| `--draft` | Open as a draft PR |
| `--reviewer <handle>` | Request a specific reviewer |
| `--label <label>` | Attach a label to the PR |
| `--web` | Open the newly created PR in the browser |

### Example

```bash
gh pr create \
  --base main \
  --head feat/task-filtering \
  --title "feat: add task filtering by status" \
  --body "Adds a status filter to the Board view. Closes #42." \
  --draft
```

# 6. Submit for Review
Once the PR is created, include the PR link and return to the user for review. Example:

```markdown
Please review the changes in this PR: [PR Title](<PR-link>)
```