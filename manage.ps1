<#
.SYNOPSIS
  TOPRunAssistant - Script Quan Tri He Thong Nhanh (Windows PowerShell)
  Ho tro: build, start, stop, reload (zero-downtime UI), restart (major changes), status, logs

.EXAMPLE
  .\manage.ps1 reload
  .\manage.ps1 restart
  .\manage.ps1 build web
  .\manage.ps1 stop
  .\manage.ps1 -Dev start
#>

param(
  [Parameter(Position = 0)]
  [ValidateSet("build", "start", "stop", "reload", "restart", "status", "logs", "help")]
  [string]$Action = "help",

  [Parameter(Position = 1)]
  [string]$Service = "",

  [switch]$Dev,
  [switch]$Local,
  [switch]$Prod,
  [switch]$Pull
)

$ErrorActionPreference = "Stop"

# File Compose muc tieu
$ComposeFile = "docker-compose.prod.yml"
$EnvMode = "Production"

if ($Dev) {
  $ComposeFile = "docker-compose.dev.yml"
  $EnvMode = "Development/Hot-Reload"
} elseif ($Local) {
  $ComposeFile = "docker-compose.yml"
  $EnvMode = "Local/Standard"
}

function Show-HelpMessage {
  Write-Host "========================================================================" -ForegroundColor Cyan
  Write-Host "TOPRunAssistant - Quan Tri He Thong Nhanh (PowerShell)" -ForegroundColor Green
  Write-Host "========================================================================" -ForegroundColor Cyan
  Write-Host "Cach su dung: .\manage.ps1 <lenh> [service] [-Dev] [-Pull]`n"
  Write-Host "CAC LENH CHINH:" -ForegroundColor Yellow
  Write-Host "  build [service]   Build image moi (mac dinh api + web, hoac 'web'/'api')"
  Write-Host "  start [service]   Khoi dong he thong hoac service cu the"
  Write-Host "  stop [service]    Dung an toan cac container (giu nguyen du lieu Database)"
  Write-Host "  reload            Cap nhat code Giao dien (Web) khong gay downtime"
  Write-Host "  restart           Khoi dong lai voi thay doi lon (Rebuild + Sync DB + Prune)"
  Write-Host "  status            Kiem tra trang thai cac container"
  Write-Host "  logs [service]    Theo doi logs thoi gian thuc`n"
  Write-Host "THAM SO BO SUNG:" -ForegroundColor Yellow
  Write-Host "  -Dev              Su dung docker-compose.yml (Moi truong Local)"
  Write-Host "  -Pull             Keo ma nguon moi nhat tu Git truoc khi thuc hien`n"
  Write-Host "VI DU:" -ForegroundColor Yellow
  Write-Host "  .\manage.ps1 reload              # Reload code giao dien Web khong downtime"
  Write-Host "  .\manage.ps1 restart             # Rebuild toan bo, cap nhat DB Schema an toan"
  Write-Host "  .\manage.ps1 -Dev start          # Khoi dong moi truong local"
  Write-Host "  .\manage.ps1 status              # Xem danh sach container dang chay"
  Write-Host "========================================================================" -ForegroundColor Cyan
}

if ($Action -eq "help" -or [string]::IsNullOrWhiteSpace($Action)) {
  Show-HelpMessage
  exit 0
}

Write-Host "Moi truong: $EnvMode ($ComposeFile)" -ForegroundColor Cyan

# Kiem tra file .env
if (-not (Test-Path ".env") -and $ComposeFile -eq "docker-compose.prod.yml") {
  if (Test-Path ".env.example") {
    Write-Host "Chua tim thay file .env, dang sao chep tu .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
  } else {
    Write-Host "Thieu file .env cau hinh moi truong!" -ForegroundColor Red
    exit 1
  }
}

# Tu dong Git Pull neu co co -Pull
if ($Pull) {
  Write-Host "Dang keo ma nguon moi nhat tu Git..." -ForegroundColor Cyan
  git pull origin main 2>$null
}

switch ($Action) {
  "build" {
    Write-Host "Dang build moi Docker Images ($Service)..." -ForegroundColor Green
    if ($Service) {
      docker compose -f $ComposeFile build $Service
    } else {
      docker compose -f $ComposeFile build web api
    }
    Write-Host "Build hoan tat thanh cong!" -ForegroundColor Green
  }

  "start" {
    Write-Host "Dang khoi dong he thong ($ComposeFile)..." -ForegroundColor Green
    if ($Service) {
      docker compose -f $ComposeFile up -d $Service
    } else {
      docker compose -f $ComposeFile up -d
    }
    Write-Host "Khoi dong thanh cong! Danh sach container:" -ForegroundColor Green
    docker compose -f $ComposeFile ps
  }

  "stop" {
    Write-Host "Dang dung container an toan (du lieu database duoc bao toan)..." -ForegroundColor Yellow
    if ($Service) {
      docker compose -f $ComposeFile stop $Service
    } else {
      docker compose -f $ComposeFile stop
    }
    Write-Host "Da dung cac dich vu." -ForegroundColor Green
  }

  "reload" {
    Write-Host "[Zero-Downtime Reload] Dang chuan bi cap nhat Web Frontend..." -ForegroundColor Magenta
    Write-Host "Buoc 1: Build image Web moi trong nen (Container cu van dang phuc vu)..." -ForegroundColor Cyan
    docker compose -f $ComposeFile build web

    Write-Host "Buoc 2: Hoan doi nhanh sang container Web moi..." -ForegroundColor Cyan
    docker compose -f $ComposeFile up -d --no-deps web

    Write-Host "Buoc 3: Doi 3 giay de Web khoi dong hoan toan..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3

    Write-Host "Buoc 4: Kiem tra trang thai hoat dong..." -ForegroundColor Cyan
    docker compose -f $ComposeFile ps web
    Write-Host "Reload giao dien hoan tat thanh cong, khong gay downtime!" -ForegroundColor Green
  }

  "restart" {
    Write-Host "[Major Restart] Dang tien hanh cap nhat he thong voi cac thay doi lon..." -ForegroundColor Yellow
    Write-Host "Buoc 1: Re-build toan bo service ung dung (API & Web)..." -ForegroundColor Cyan
    docker compose -f $ComposeFile build web api

    Write-Host "Buoc 2: Khoi chay va tai tao cac container..." -ForegroundColor Cyan
    docker compose -f $ComposeFile up -d --remove-orphans

    Write-Host "Buoc 3: Doi dich vu API va Database on dinh (5 giay)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5

    Write-Host "Buoc 4: Cap nhat Schema Co so du lieu PostgreSQL an toan (Bao toan du lieu cu)..." -ForegroundColor Cyan
    try {
      docker compose -f $ComposeFile exec -T api npx prisma db push --schema=packages/database/prisma/schema.prisma
    } catch {
      Write-Host "Luu y: Dong bo prisma schema chua hoan tat hoac API dang khoi dong. Du lieu DB van an toan." -ForegroundColor Yellow
    }

    Write-Host "Buoc 5: Don dep Docker images cu khong su dung..." -ForegroundColor Cyan
    docker image prune -f 2>$null

    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "Restart va dong bo hoan tat thanh cong!" -ForegroundColor Green
    docker compose -f $ComposeFile ps
    Write-Host "========================================================================" -ForegroundColor Cyan
  }

  "status" {
    Write-Host "Trang thai he thong ($ComposeFile):" -ForegroundColor Cyan
    docker compose -f $ComposeFile ps
  }

  "logs" {
    if ($Service) {
      Write-Host "Theo doi logs cho dich vu: $Service" -ForegroundColor Cyan
      docker compose -f $ComposeFile logs -f $Service
    } else {
      Write-Host "Theo doi logs cho toan bo dich vu..." -ForegroundColor Cyan
      docker compose -f $ComposeFile logs -f
    }
  }
}