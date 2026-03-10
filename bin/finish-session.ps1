<#
.SYNOPSIS
    Commits changes, pushes the branch, and opens a pull request.

.DESCRIPTION
    Wraps the end-of-session workflow: stage, commit, push, and PR creation.
    Must be run from inside a worktree created by new-session.ps1.

.PARAMETER Message
    Commit message. Required.

.PARAMETER Cleanup
    If set, removes the worktree and branch after PR creation.

.EXAMPLE
    .\bin\finish-session.ps1 -Message "feat: add task filtering"
    .\bin\finish-session.ps1 -Message "fix: resolve null ref" -Cleanup
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message,

    [switch]$Cleanup
)

$ErrorActionPreference = "Stop"

# Ensure we're in a git repo
$RepoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $RepoRoot) {
    Write-Error "Not inside a Git repository."
    exit 1
}

$CurrentBranch = (git rev-parse --abbrev-ref HEAD)
if ($CurrentBranch -eq "HEAD") {
    Write-Error "Detached HEAD state — cannot finish session."
    exit 1
}

# Determine the base branch (the branch the worktree was created from).
# `git log --first-parent` traces back to the fork point from main/master or
# the branch recorded at worktree creation. A simpler heuristic: find the
# branch that was the merge-base target. We'll default to 'main' and fall
# back to 'master'.
$BaseBranch = $null
foreach ($candidate in @("main", "master", "develop")) {
    $exists = git branch --list $candidate 2>$null
    if ($exists) {
        $BaseBranch = $candidate
        break
    }
}
if (-not $BaseBranch) {
    Write-Warning "Could not detect base branch — defaulting to 'main'."
    $BaseBranch = "main"
}

# Check for gh CLI
$GhAvailable = Get-Command gh -ErrorAction SilentlyContinue
if (-not $GhAvailable) {
    Write-Warning "The GitHub CLI (gh) is not installed. PR creation will be skipped."
    Write-Warning "Install it from https://cli.github.com/ and run: gh auth login"
}

# Stage all changes
Write-Host "Staging changes..." -ForegroundColor Cyan
git add .

# Check if there's anything to commit
$Status = git status --porcelain
if (-not $Status) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
}
else {
    Write-Host "Committing..." -ForegroundColor Cyan
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Commit failed."
        exit 1
    }
}

# Push
Write-Host "Pushing branch '$CurrentBranch'..." -ForegroundColor Cyan
git push -u origin $CurrentBranch
if ($LASTEXITCODE -ne 0) {
    Write-Error "Push failed."
    exit 1
}

# Create PR
$PrUrl = $null
if ($GhAvailable) {
    Write-Host "Creating pull request..." -ForegroundColor Cyan

    # Extract a title from the commit message (first line)
    $PrTitle = ($Message -split "`n")[0]

    $PrUrl = gh pr create `
        --base $BaseBranch `
        --head $CurrentBranch `
        --title $PrTitle `
        --body "Automated PR from session branch ``$CurrentBranch``." 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "PR creation failed: $PrUrl"
        Write-Warning "You can create it manually with: gh pr create --base $BaseBranch --head $CurrentBranch"
    }
    else {
        Write-Host ""
        Write-Host "Pull request created:" -ForegroundColor Green
        Write-Host "  $PrUrl" -ForegroundColor Yellow
    }
}

# Cleanup
if ($Cleanup) {
    Write-Host ""
    Write-Host "Cleaning up worktree..." -ForegroundColor Cyan

    $MainRepoRoot = (git -C $RepoRoot rev-parse --git-common-dir 2>$null)
    if ($MainRepoRoot) {
        # Navigate to the main repo (parent of the .git common dir)
        $MainRepo = Split-Path (Split-Path $MainRepoRoot -Parent) -Parent
        # Resolve paths for git worktree remove — use the current worktree path
        $WorktreePath = $RepoRoot

        Push-Location $MainRepo
        try {
            git worktree remove $WorktreePath --force
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Worktree removed: $WorktreePath" -ForegroundColor Green
            }
            else {
                Write-Warning "Failed to remove worktree. Run manually: git worktree remove `"$WorktreePath`""
            }
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Warning "Could not locate main repo. Remove the worktree manually."
    }
}

Write-Host ""
Write-Host "Session finished." -ForegroundColor Green
if ($PrUrl -and $LASTEXITCODE -eq 0) {
    Write-Host "Please review the PR: $PrUrl"
}
