# Weekly local Substack sync, run by the Windows scheduled task
# "Scholar Street Substack sync". Pulls main, runs sync_substack.py, and
# commits + pushes any new articles (the push deploys via Netlify).
#
# Skips without touching anything if the checkout is not on main or has
# uncommitted changes, so it never sweeps in hand edits.
# Log: %LOCALAPPDATA%\scholarstreet-sync\sync.log

# Not 'Stop': PowerShell 5.1 turns git's stderr warnings (CRLF notices) into
# terminating errors under 2>&1. Failures are caught via $LASTEXITCODE.
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $env:LOCALAPPDATA 'scholarstreet-sync'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir 'sync.log'

function Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Out-File -Append -Encoding utf8 $log
}

function Invoke-Git {
    $out = & git -C $repo @args 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') failed: $out" }
    $out
}

try {
    Log 'start'
    $branch = (Invoke-Git rev-parse --abbrev-ref HEAD) -join ''
    if ($branch -ne 'main') { Log "skip: on branch '$branch', not main"; exit 0 }
    if (Invoke-Git status --porcelain) { Log 'skip: working tree has uncommitted changes'; exit 0 }

    Invoke-Git pull --ff-only -q | Out-Null

    $out = & python (Join-Path $PSScriptRoot 'sync_substack.py') 2>&1
    $out | ForEach-Object { Log "  $_" }
    if ($LASTEXITCODE -ne 0) { throw "sync_substack.py exited $LASTEXITCODE" }

    Invoke-Git add -A news news.html index.html sitemap.xml _redirects | Out-Null
    & git -C $repo diff --cached --quiet
    if ($LASTEXITCODE -eq 0) { Log 'done: no new or changed articles'; exit 0 }

    Invoke-Git commit -q -m 'Sync articles from Substack' | Out-Null
    Invoke-Git push -q origin main | Out-Null
    Log "done: pushed $((Invoke-Git log --oneline -1) -join '')"
}
catch {
    Log "ERROR: $_"
    exit 1
}
