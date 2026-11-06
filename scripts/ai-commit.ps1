<#
.SYNOPSIS
  TOPRunAssistant - AI Git Auto Commit & Push Script (PowerShell)
  Su dung agy CLI tren may de tu dong sinh Conventional Commit Message chuan bang tieng Anh,
  sau do commit va tu dong push len remote.

.EXAMPLE
  .\scripts\ai-commit.ps1
  .\scripts\ai-commit.ps1 -Yes
  npm run commit
#>

param(
  [Alias("y")]
  [switch]$Yes,

  [switch]$NoPush
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Header {
  param([string]$Text)
  Write-Host "`n=== $Text ===" -ForegroundColor Cyan
}

function Find-AgyCli {
  $cmd = Get-Command agy -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidates = @(
    "$env:USERPROFILE\.gemini\bin\agy.exe",
    "$env:LOCALAPPDATA\agy\bin\agy.exe",
    "$env:APPDATA\Antigravity\bin\agy.exe",
    "C:\Program Files\Antigravity\bin\agy.exe"
  )

  foreach ($cand in $candidates) {
    if (Test-Path $cand) {
      return $cand
    }
  }

  return $null
}

# 1. Kiem tra Git repository
try {
  $isInsideRepo = git rev-parse --is-inside-work-tree 2>$null
  if ($LASTEXITCODE -ne 0 -or $isInsideRepo -ne "true") {
    Write-Host "[Error] Thu muc hien tai khong phai la mot Git repository!" -ForegroundColor Red
    exit 1
  }
  $repoRoot = (git rev-parse --show-toplevel).Trim()
  Set-Location $repoRoot
} catch {
  Write-Host "[Error] Khong the thuc thi lenh git. Vui long kiem tra lai Git!" -ForegroundColor Red
  exit 1
}

# 2. Kiem tra agy CLI
$agyPath = Find-AgyCli
if (-not $agyPath) {
  Write-Host "[Error] Khong tim thay agy CLI tren may!" -ForegroundColor Red
  Write-Host "Vui long kiem tra Antigravity CLI da duoc cai dat tai ~/.gemini/bin/ hoac them vao PATH." -ForegroundColor Yellow
  exit 1
}

# 3. Kiem tra file thay doi
$gitStatus = git status --porcelain
if ([string]::IsNullOrWhiteSpace($gitStatus)) {
  Write-Host "[OK] Khong co file nao thay doi. Working tree clean!" -ForegroundColor Green
  exit 0
}

Write-Header "1. STAGING FILES (git add -A)"
git add -A
if ($LASTEXITCODE -ne 0) {
  Write-Host "[Error] Loi khi thuc hien git add -A" -ForegroundColor Red
  exit 1
}

$stagedFiles = git status --short
Write-Host $stagedFiles -ForegroundColor Yellow

$diffStat = git diff --staged --stat
Write-Header "2. DIFF SUMMARY"
Write-Host $diffStat -ForegroundColor Gray

# 4. Lay diff de gui cho AI (chuyen double-quote thanh single-quote de tranh xung dot command-line)
$cleanDiffStat = if ($diffStat) { $diffStat -replace '"', "'" } else { "" }
$rawFullDiff = git diff --staged
$cleanFullDiff = if ($rawFullDiff) { $rawFullDiff -replace '"', "'" } else { "" }

if ($cleanFullDiff.Length -gt 4000) {
  $diffSample = $cleanFullDiff.Substring(0, 4000) + "`n... [diff truncated for brevity] ..."
} else {
  $diffSample = $cleanFullDiff
}

# 5. Ham goi AI sinh commit message
function Generate-CommitMessage {
  param([string]$Hint = "")

  Write-Host "`n[AI] Dang phan tich thay doi va sinh commit message qua agy CLI..." -ForegroundColor Cyan

  $prompt = @"
You are an expert software engineer generating a concise Conventional Commit message for git changes.
Repository rules and guidelines:
1. Format: `<type>(<scope>): <short description>` or `<type>: <short description>`
2. Types must be one of: feat, fix, refactor, chore, docs, style, perf, test
3. Scope is optional (e.g. web, api, database, mobile, scripts).
4. Description MUST be in English, imperative mood (e.g. 'add', 'fix', 'update'), all lowercase, NO period at the end.
5. Max length 72 characters.
6. Return ONLY the single line commit message. No quotes, no markdown backticks, no markdown formatting, no explanations.

$Hint

STAGED FILES STAT:
$cleanDiffStat

GIT DIFF SAMPLE:
$diffSample
"@

  # Su dung System.Diagnostics.Process de tranh PowerShell command-line argument splitting
  try {
    $escapedPrompt = $prompt -replace '(\\*)"', '$1$1\"'
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $agyPath
    $pinfo.Arguments = "-p `"$escapedPrompt`" --output-format text"
    $pinfo.RedirectStandardOutput = $true
    $pinfo.RedirectStandardError = $true
    $pinfo.UseShellExecute = $false
    $pinfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8

    $proc = [System.Diagnostics.Process]::Start($pinfo)
    [void]$proc.WaitForExit(30000) # Cho toi da 30 giay (tranh tra ve bool True vao pipeline)

    $aiOutput = $proc.StandardOutput.ReadToEnd()
    $aiError = $proc.StandardError.ReadToEnd()

    if ($proc.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($aiOutput)) {
      if (-not [string]::IsNullOrWhiteSpace($aiError)) {
        Write-Host "[AI Debug] $aiError" -ForegroundColor Gray
      }
      return $null
    }
  } catch {
    Write-Host "[AI Error] $($_.Exception.Message)" -ForegroundColor Red
    return $null
  }

  # Clean message
  $firstNonEmptyLine = [string]($aiOutput -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1)
  if ([string]::IsNullOrWhiteSpace($firstNonEmptyLine)) { return $null }

  $msg = $firstNonEmptyLine.Trim()
  $msg = $msg -replace '^["'']|["'']$', ''
  $msg = $msg -replace '^```[a-z]*', ''
  $msg = $msg -replace '```$', ''
  $msg = $msg.Trim()

  return $msg
}

$commitMsg = Generate-CommitMessage
if (-not $commitMsg) {
  Write-Host "[Warning] AI khong sinh duoc message. Vui long nhap thu cong:" -ForegroundColor Yellow
  $commitMsg = Read-Host "Commit message"
}

# 6. Tuong tac xac nhan voi nguoi dung
if (-not $Yes) {
  $confirmed = $false
  while (-not $confirmed) {
    Write-Header "3. PROPOSED COMMIT MESSAGE"
    Write-Host "  >> " -NoNewline -ForegroundColor Green
    Write-Host $commitMsg -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""

    Write-Host "Chon thao tac:" -ForegroundColor Cyan
    Write-Host "  [Y] Dong y commit voi message nay (Mac dinh)" -ForegroundColor Green
    Write-Host "  [e] Chinh sua message bang tay" -ForegroundColor Yellow
    Write-Host "  [r] Yeu cau AI sinh lai (Regenerate)" -ForegroundColor Magenta
    Write-Host "  [n] Huy bo (Unstage va thoat)" -ForegroundColor Red

    $choice = Read-Host "`nLua chon [Y/e/r/n] (Enter = Y)"
    if ([string]::IsNullOrWhiteSpace($choice) -or $choice -match '^[Yy]$') {
      $confirmed = $true
    } elseif ($choice -match '^[Ee]$') {
      $custom = Read-Host "Nhap commit message moi"
      if (-not [string]::IsNullOrWhiteSpace($custom)) {
        $commitMsg = $custom.Trim()
      }
      $confirmed = $true
    } elseif ($choice -match '^[Rr]$') {
      $commitMsg = Generate-CommitMessage -Hint "Provide a fresh alternative phrasing for the commit message."
      if (-not $commitMsg) {
        $commitMsg = "chore: update codebase"
      }
    } elseif ($choice -match '^[Nn]$') {
      Write-Host "`n[Huy bo] Dang unstage cac file..." -ForegroundColor Yellow
      git reset HEAD 2>$null
      Write-Host "[Done] Da unstage toan bo thay doi. Working tree giu nguyen." -ForegroundColor Yellow
      exit 0
    }
  }
}

# 7. Thuc hien commit
Write-Header "4. EXECUTING COMMIT"
git commit -m "$commitMsg"
if ($LASTEXITCODE -ne 0) {
  Write-Host "[Error] Commit that bai!" -ForegroundColor Red
  exit 1
}
Write-Host "[OK] Da commit thanh cong: '$commitMsg'" -ForegroundColor Green

# 8. Tu dong Push len Remote
if (-not $NoPush) {
  Write-Header "5. PUSHING TO REMOTE"
  $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
  Write-Host "Dang push len branch '$currentBranch'..." -ForegroundColor Cyan

  $prevEAP = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    # Git push mac dinh ghi tien trinh (progress/transfer rate) vao stderr
    # Chuyen doi sang string stream tranh NativeCommandError cua PowerShell
    $pushOutput = @(git push origin $currentBranch 2>&1 | ForEach-Object { "$_" })
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Branch co the chua set upstream, dang thu push voi --set-upstream..." -ForegroundColor Yellow
      $pushOutput = @(git push --set-upstream origin $currentBranch 2>&1 | ForEach-Object { "$_" })
    }

    if ($LASTEXITCODE -eq 0) {
      Write-Host "[OK] Da push thanh cong len origin/$currentBranch!" -ForegroundColor Green
      foreach ($line in $pushOutput) {
        if (-not [string]::IsNullOrWhiteSpace($line)) {
          Write-Host "  $line" -ForegroundColor Gray
        }
      }
    } else {
      Write-Host "[Warning] Push that bai (commit van duoc giu local an toan):" -ForegroundColor Yellow
      foreach ($line in $pushOutput) {
        Write-Host "  $line" -ForegroundColor Red
      }
    }
  } finally {
    $ErrorActionPreference = $prevEAP
  }
}

Write-Header "HOAN TAT QUY TRINH"
