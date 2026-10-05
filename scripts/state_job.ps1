# Twice-weekly state-table job, run by the Windows scheduled task
# "Scholar Street state table". Starts Claude Code headless in this repo with
# scripts/state-updates-prompt.md as its instructions. Replaced a Cowork
# scheduled task on 2026-10-05: Cowork runs left no record of what they did.
#
# Each run writes to %LOCALAPPDATA%\scholarstreet-sync\state-job\:
#   <stamp>.jsonl   the full session, every tool call and result
#   <stamp>.txt     the job's final report
#   state-job.log   one line per run: start, finish, exit code
#
# Tools are an allowlist: the job can edit only state-status-data.js, push
# only state-updates/* branches, and can't merge. Anything else it tries is
# refused, and the refusal shows in the .jsonl.

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $env:LOCALAPPDATA 'scholarstreet-sync\state-job'
New-Item -ItemType Directory -Force $logDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$session = Join-Path $logDir "$stamp.jsonl"
$report = Join-Path $logDir "$stamp.txt"
$log = Join-Path $logDir 'state-job.log'

function Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Out-File -Append -Encoding utf8 $log
}

$prompt = "Today is $(Get-Date -Format 'dddd, yyyy-MM-dd'). Read scripts/state-updates-prompt.md " +
          "in this folder and carry out one run of it, exactly as written. It is the complete " +
          "instructions. You are running unattended: nobody can answer questions, so never stop " +
          "to ask; put anything that needs a decision in the report and email as the file says."

$system = "Use the Bash tool for every shell command (not PowerShell). You have no web " +
          "browser: where the instructions say to open a page in the browser, follow their " +
          "no-browser fallback."

$allowed = @(
    'Read', 'Glob', 'Grep', 'ToolSearch', 'WebSearch', 'WebFetch',
    'Edit(./state-status-data.js)',
    'Bash(git checkout:*)', 'Bash(git switch:*)', 'Bash(git pull:*)', 'Bash(git fetch:*)',
    'Bash(git status:*)', 'Bash(git merge:*)', 'Bash(git log:*)', 'Bash(git diff:*)',
    'Bash(git branch:*)', 'Bash(git add state-status-data.js)', 'Bash(git commit:*)',
    'Bash(git push -u origin state-updates/*)', 'Bash(git push origin state-updates/*)',
    'Bash(gh pr list:*)', 'Bash(gh pr view:*)', 'Bash(gh pr create:*)',
    'Bash(gh pr comment:*)', 'Bash(gh pr checks:*)',
    'Bash(python scripts/gnews.py:*)', 'Bash(curl:*)', 'Bash(date:*)',
    'mcp__claude_ai_Gmail__send_message'
)
$denied = @(
    'PowerShell', 'Bash(gh pr merge:*)', 'Bash(git push origin main*)',
    'Bash(git push -u origin main*)', 'Bash(git push --force*)', 'Bash(git push -f*)'
)

try {
    Log "start $stamp"
    Set-Location $repo
    claude -p $prompt --append-system-prompt $system `
        --allowedTools @allowed --disallowedTools @denied `
        --output-format stream-json --verbose 2>&1 |
        Out-File -Encoding utf8 $session
    $code = $LASTEXITCODE

    # The last line of a stream-json session is the result, holding the report.
    $last = Get-Content $session -Encoding utf8 | Where-Object { $_ -match '"type":"result"' } |
        Select-Object -Last 1
    if ($last) {
        ($last | ConvertFrom-Json).result | Out-File -Encoding utf8 $report
    } else {
        'No result line: the session ended abnormally. See the .jsonl.' | Out-File -Encoding utf8 $report
    }
    Log "finish $stamp exit=$code"
    exit $code
}
catch {
    Log "ERROR $stamp $_"
    exit 1
}
