<#
.SYNOPSIS
    Creates a new Git worktree for an isolated development session.

.DESCRIPTION
    Sets up a feature branch and worktree sibling to the main repo.
    Runs `bun install` in the new worktree so it's ready to go.

.PARAMETER Name
    Feature branch name. Auto-generated from timestamp + random suffix if omitted.

.EXAMPLE
    .\bin\new-session.ps1 -Name "feat/task-filtering"
    .\bin\new-session.ps1
#>

param(
    [Parameter(Position = 0)]
    [string]$Name
)

$ErrorActionPreference = "Stop"

# Resolve the main repo root (where this script lives)
$RepoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $RepoRoot) {
    Write-Error "Not inside a Git repository."
    exit 1
}

# Current branch becomes the base for the new worktree
$BaseBranch = (git rev-parse --abbrev-ref HEAD)
if ($BaseBranch -eq "HEAD") {
    Write-Error "Detached HEAD state — please checkout a branch first."
    exit 1
}

# Generate branch name if not provided
if (-not $Name) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd"
    $Suffix = -join ((48..57) + (97..102) | Get-Random -Count 4 | ForEach-Object { [char]$_ })
    $Name = "session/$Timestamp-$Suffix"
}

$WorktreePath = Join-Path (Split-Path $RepoRoot -Parent) "ai-board-$($Name -replace '[/\\]', '-')"

# Guard: branch already exists
$BranchExists = git branch --list $Name 2>$null
if ($BranchExists) {
    Write-Error "Branch '$Name' already exists. Pick a different name or delete it first."
    exit 1
}

# Guard: worktree path already exists
if (Test-Path $WorktreePath) {
    Write-Error "Worktree path '$WorktreePath' already exists. Remove it or choose a different name."
    exit 1
}

Write-Host "Creating worktree..." -ForegroundColor Cyan
Write-Host "  Base branch : $BaseBranch"
Write-Host "  New branch  : $Name"
Write-Host "  Worktree    : $WorktreePath"
Write-Host ""

git worktree add -b $Name $WorktreePath $BaseBranch
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create worktree."
    exit 1
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan
Push-Location $WorktreePath
try {
    bun install
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "bun install failed — you may need to run it manually."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Session ready! Run:" -ForegroundColor Green
Write-Host "  cd `"$WorktreePath`"" -ForegroundColor Yellow
Write-Host ""

# Output the path so callers can capture it
return $WorktreePath
