<#
.SYNOPSIS
  TOPRunAssistant - Automated Database & Data Backup Script (PowerShell)
.EXAMPLE
  .\scripts\backup.ps1 -Prod
  .\scripts\backup.ps1 -Dev
#>

param(
  [switch]$Prod,
  [switch]$Dev,
  [switch]$Local,
  [int]$RetentionDays = 7
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

$BackupDir = Join-Path $RootDir "backups"
$LogDir = Join-Path $RootDir "logs"
$LogFile = Join-Path $LogDir "backup.log"

if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $entry = "[$timestamp] $Message"
  Write-Host $entry
  Add-Content -Path $LogFile -Value $entry
}

Write-Log "========================================================================"
Write-Log "[START] BAT DAU TIEN TRINH BACKUP TOPRUNASSISTANT"
Write-Log "[CONFIG] Cau hinh Compose: $ComposeFile"

# Parse .env if exists
$EnvFile = Join-Path $RootDir ".env"
$DbUser = "toprun"
$DbPass = "toprun_secure_prod_2026"
$DbName = "toprun_db"
$RcloneRemote = ""

if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
      $parts = $line.Split("=", 2)
      $key = $parts[0].Trim()
      $val = $parts[1].Trim().Trim('"').Trim("'")
      if ($key -eq "POSTGRES_USER") { $DbUser = $val }
      elseif ($key -eq "POSTGRES_PASSWORD") { $DbPass = $val }
      elseif ($key -eq "POSTGRES_DB") { $DbName = $val }
      elseif ($key -eq "RCLONE_REMOTE") { $RcloneRemote = $val }
    }
  }
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TempDir = Join-Path $BackupDir "temp_$Timestamp"
$ArchiveName = "toprun_backup_$Timestamp.tar.gz"
$ArchivePath = Join-Path $BackupDir $ArchiveName

if (-not (Test-Path $TempDir)) { New-Item -ItemType Directory -Path $TempDir | Out-Null }

try {
  # 1. Kiem tra postgres container
  $containerStatus = docker compose -f $ComposeFile ps -q postgres
  if ([string]::IsNullOrWhiteSpace($containerStatus)) {
    Write-Log "[ERROR] Container PostgreSQL khong hoat dong trong $ComposeFile!"
    exit 1
  }

  Write-Log "[STEP 1/4] Dang ket xuat (Dump) PostgreSQL Database '$DbName'..."
  $DumpFile = Join-Path $TempDir "toprun_db.dump"

  # Chay pg_dump qua docker compose exec
  & docker compose -f $ComposeFile exec -T -e PGPASSWORD="$DbPass" postgres pg_dump -U $DbUser -d $DbName -F c -b -v > $DumpFile

  if (-not (Test-Path $DumpFile) -or (Get-Item $DumpFile).Length -eq 0) {
    Write-Log "[ERROR] File dump database rong hoac tao that bai!"
    exit 1
  }

  $DumpSizeKB = [math]::Round((Get-Item $DumpFile).Length / 1KB, 2)
  Write-Log "[OK] Dump DB thanh cong! Kich thuoc: $DumpSizeKB KB"

  # 2. Backup ./data
  Write-Log "[STEP 2/4] Dang sao chep thu muc du lieu ./data..."
  $DataDir = Join-Path $RootDir "data"
  $TempDataDir = Join-Path $TempDir "data"
  if (Test-Path $DataDir) {
    Copy-Item -Path $DataDir -Destination $TempDataDir -Recurse
    Write-Log "[OK] Da sao chep thu muc ./data."
  } else {
    New-Item -ItemType Directory -Path $TempDataDir | Out-Null
    Write-Log "[INFO] Khong co ./data, tao thu muc trong."
  }

  # 3. Backup .env
  Write-Log "[STEP 3/4] Dang dong goi file cau hinh .env..."
  if (Test-Path $EnvFile) {
    Copy-Item -Path $EnvFile -Destination (Join-Path $TempDir ".env.backup")
    Write-Log "[OK] Da dinh kem .env vao ban backup."
  }

  # Manifest
  $Manifest = @{
    timestamp = $Timestamp
    created_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    database = $DbName
    db_user = $DbUser
    compose_file = $ComposeFile
    retention_days = $RetentionDays
  } | ConvertTo-Json
  Set-Content -Path (Join-Path $TempDir "backup_manifest.json") -Value $Manifest

  # 4. Nen tar.gz
  Write-Log "[STEP 4/4] Dang nen thanh file luu tru: $ArchiveName..."
  tar -czf $ArchivePath -C $TempDir .

  $FinalSizeKB = [math]::Round((Get-Item $ArchivePath).Length / 1KB, 2)
  Write-Log "[SUCCESS] TAO BAN BACKUP THANH CONG: $ArchivePath ($FinalSizeKB KB)"

  # 5. Xoa ban backup cu hon N ngay
  Write-Log "[CLEANUP] Dang don dep cac ban backup cu hon $RetentionDays ngay..."
  $Threshold = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem -Path $BackupDir -Filter "toprun_backup_*.tar.gz" | Where-Object { $_.LastWriteTime -lt $Threshold } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Log "[CLEANUP] Da xoa ban backup cu: $($_.Name)"
  }

  # 6. Cloud sync (neu co)
  if ($RcloneRemote) {
    Write-Log "[CLOUD] Phat hien cau hinh Cloud Storage ($RcloneRemote). Dang dong bo..."
    if (Get-Command rclone -ErrorAction SilentlyContinue) {
      & rclone copy $ArchivePath $RcloneRemote
      Write-Log "[CLOUD] Da tai len Cloud Storage thanh cong!"
    } else {
      Write-Log "[WARN] Khong tim thay lenh rclone tren he thong!"
    }
  }

  Write-Log "[DONE] TIEN TRINH HOAN TAT."
  Write-Log "========================================================================"
} finally {
  if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
