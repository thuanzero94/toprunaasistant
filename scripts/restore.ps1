<#
.SYNOPSIS
  TOPRunAssistant - Disaster Recovery & Database Restore Script (PowerShell)
.EXAMPLE
  .\scripts\restore.ps1 -Archive "backups\toprun_backup_20261104_120000.tar.gz" -Prod
  .\scripts\restore.ps1 -Archive "backups\toprun_backup_20261104_120000.tar.gz" -Force
#>

param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Archive,

  [switch]$Prod,
  [switch]$Dev,
  [switch]$Local,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

$ComposeFile = "docker-compose.prod.yml"
if ($Dev) {
  $ComposeFile = "docker-compose.dev.yml"
} elseif ($Local) {
  $ComposeFile = "docker-compose.yml"
}

if (-not (Test-Path $Archive)) {
  Write-Error "[ERROR] File backup khong ton tai tai: $Archive"
  exit 1
}

Write-Host "========================================================================" -ForegroundColor Red
Write-Host "[WARNING] CANH BAO NGUY HIEM: TIEN TRINH KHOI PHUC DU LIEU (DISASTER RESTORE)" -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Red
Write-Host "File backup muc tieu: $Archive"
Write-Host "Compose file:         $ComposeFile"
Write-Host "LUU Y: Thao tac nay se GHI DE toan bo Database va thu muc ./data!" -ForegroundColor Red
Write-Host "========================================================================"

if (-not $Force) {
  $confirmation = Read-Host "Ban co chac chan muon khoi phuc khong? Nhap chinh xac 'RESTORE' de tiep tuc"
  if ($confirmation -ne "RESTORE") {
    Write-Host "[CANCEL] Da huy bo tien trinh khoi phuc." -ForegroundColor Yellow
    exit 0
  }
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TempRestoreDir = Join-Path $RootDir "temp_restore_$Timestamp"
if (-not (Test-Path $TempRestoreDir)) { New-Item -ItemType Directory -Path $TempRestoreDir | Out-Null }

try {
  Write-Host "[STEP 1/5] Dang giai nen goi backup..." -ForegroundColor Cyan
  tar -xzf $Archive -C $TempRestoreDir

  $DbDump = Join-Path $TempRestoreDir "toprun_db.dump"
  if (-not (Test-Path $DbDump)) {
    Write-Error "[ERROR] Khong tim thay toprun_db.dump ben trong goi backup!"
    exit 1
  }

  # Restore .env
  $EnvBackup = Join-Path $TempRestoreDir ".env.backup"
  $EnvTarget = Join-Path $RootDir ".env"
  if (Test-Path $EnvBackup) {
    Write-Host "[STEP 2/5] Khoi phuc file .env..." -ForegroundColor Cyan
    if (Test-Path $EnvTarget) {
      Copy-Item -Path $EnvTarget -Destination "$EnvTarget.bak_$Timestamp" -Force
      Write-Host "[INFO] Da sao luu .env cu sang .env.bak_$Timestamp"
    }
    Copy-Item -Path $EnvBackup -Destination $EnvTarget -Force
    Write-Host "[OK] Da khoi phuc .env thanh cong."
  }

  $DbUser = "toprun"
  $DbPass = "toprun_secure_prod_2026"
  $DbName = "toprun_db"

  if (Test-Path $EnvTarget) {
    Get-Content $EnvTarget | ForEach-Object {
      $line = $_.Trim()
      if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line.Split("=", 2)
        $k = $parts[0].Trim()
        $v = $parts[1].Trim().Trim('"').Trim("'")
        if ($k -eq "POSTGRES_USER") { $DbUser = $v }
        elseif ($k -eq "POSTGRES_PASSWORD") { $DbPass = $v }
        elseif ($k -eq "POSTGRES_DB") { $DbName = $v }
      }
    }
  }

  Write-Host "[STEP 3/5] Khoi dong PostgreSQL container..." -ForegroundColor Cyan
  docker compose -f $ComposeFile up -d postgres

  Write-Host "Cho PostgreSQL san sang..."
  Start-Sleep -Seconds 5

  Write-Host "[STEP 4/5] Dang khoi phuc Database '$DbName'..." -ForegroundColor Cyan

  # Terminate active connections
  $termSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DbName' AND pid <> pg_backend_pid();"
  docker compose -f $ComposeFile exec -T -e PGPASSWORD="$DbPass" postgres psql -U $DbUser -d postgres -c $termSql 2>$null

  # Restore via pg_restore
  Get-Content -Raw $DbDump | docker compose -f $ComposeFile exec -T -e PGPASSWORD="$DbPass" postgres pg_restore -U $DbUser -d $DbName --clean --if-exists --no-owner --no-privileges -v 2>$null
  Write-Host "[OK] Khoi phuc database thanh cong!"

  # Restore ./data
  $TempData = Join-Path $TempRestoreDir "data"
  $TargetData = Join-Path $RootDir "data"
  if (Test-Path $TempData) {
    Write-Host "Dang khoi phuc thu muc ./data..." -ForegroundColor Cyan
    if (Test-Path $TargetData) {
      Copy-Item -Path $TargetData -Destination "$TargetData.bak_$Timestamp" -Recurse -Force
    }
    Copy-Item -Path "$TempData\*" -Destination $TargetData -Recurse -Force
    Write-Host "[OK] Da khoi phuc ./data thanh cong."
  }

  Write-Host "[STEP 5/5] Khoi dong lai toan bo ung dung..." -ForegroundColor Cyan
  docker compose -f $ComposeFile up -d

  Start-Sleep -Seconds 3
  docker compose -f $ComposeFile ps

  Write-Host "========================================================================" -ForegroundColor Green
  Write-Host "[SUCCESS] KHOI PHUC HE THONG THANH CONG!" -ForegroundColor Green
  Write-Host "========================================================================" -ForegroundColor Green
} finally {
  if (Test-Path $TempRestoreDir) {
    Remove-Item -Path $TempRestoreDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
