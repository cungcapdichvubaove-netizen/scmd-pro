# =========================================================
#   SCMD PRO - DIAGNOSTICS & HEALTH CHECK (DESKTOP)
#   Version: 2.2.0
#   Changelog:
#     - [v2.1] Dung "docker compose" (V2) thay "docker-compose" (V1 deprecated)
#     - [v2.1] Gan voi docker-compose.desktop.yml
#     - [v2.1] Them CPU/RAM theo tung container thay vi process
#     - [v2.1] Them port conflict detection
#     - [v2.1] Format dep hon, mau sac ro rang hon
#     - [v2.2] FIX port mapping: 5433 (PostgreSQL), 6380 (Redis) khop voi compose
#     - [v2.2] Them mo ta service ro rang cho tung port
#     - [v2.2] Check-Health.bat them check powershell + PS1 file + exit code
#     - [v2.2] Them exit code: thoat 0 neu OK, 1 neu co loi
# =========================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

$COMPOSE_FILE = "docker-compose.desktop.yml"
$APP_URL      = "http://localhost:3000"
$exitCode     = 0  # Track overall health: 0=OK, 1=co van de

function Write-Section($text) {
    Write-Host ""
    Write-Host "  --- $text ---" -ForegroundColor Cyan
}

function Write-OK($text)   { Write-Host "    [OK]  $text" -ForegroundColor Green  }
function Write-WARN($text) { Write-Host "  [WARN]  $text" -ForegroundColor Yellow }
function Write-ERR($text)  {
    Write-Host "   [ERR]  $text" -ForegroundColor Red
    $script:exitCode = 1
}

Write-Host ""
Write-Host "  =========================================================" -ForegroundColor Cyan
Write-Host "       SCMD PRO - DIAGNOSTICS & HEALTH CHECK (DESKTOP)"     -ForegroundColor Cyan
Write-Host "  =========================================================" -ForegroundColor Cyan

# ── 1: Docker Compose Services ───────────────────────────
Write-Section "Docker Services ($COMPOSE_FILE)"

if (-not (Test-Path $COMPOSE_FILE)) {
    Write-ERR "Khong tim thay $COMPOSE_FILE — chay script nay tu thu muc goc project"
} elseif (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-ERR "Docker khong tim thay. Vui long cai Docker Desktop."
} else {
    $psResult = docker compose -f $COMPOSE_FILE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>&1
    foreach ($line in $psResult) {
        $lineStr = "$line"
        if     ($lineStr -match "Restarting|unhealthy|Exit [^0]") {
            Write-Host "  $lineStr" -ForegroundColor Red
            $script:exitCode = 1
        }
        elseif ($lineStr -match "(healthy)|Up ")                   { Write-Host "  $lineStr" -ForegroundColor Green  }
        elseif ($lineStr -match "Exit 0")                          { Write-Host "  $lineStr  <- migration OK" -ForegroundColor Gray }
        else                                                        { Write-Host "  $lineStr" -ForegroundColor Gray   }
    }

    # Resource usage theo container
    Write-Host ""
    Write-Host "  Resource Usage:" -ForegroundColor Gray
    docker stats --no-stream --format "    {{.Name}}: CPU {{.CPUPerc}}  RAM {{.MemUsage}}" 2>&1 |
        Where-Object { $_ -match "scmd-desktop" }
}

# ── 2: Port check ────────────────────────────────────────
Write-Section "Port Status"

$ports = @(
    @{ Port = 3000; Desc = "API / App (scmd-desktop-app)" },
    @{ Port = 3001; Desc = "PDF Service" },
    @{ Port = 5433; Desc = "PostgreSQL (host:5433 → container:5432)" },
    @{ Port = 6380; Desc = "Redis (host:6380 → container:6379)" }
)

foreach ($p in $ports) {
    $listening = netstat -ano 2>$null | Select-String ":$($p.Port)\s" | Select-String "LISTENING"
    if ($listening) {
        Write-OK ":$($p.Port)  $($p.Desc) — LISTENING"
    } else {
        Write-WARN ":$($p.Port)  $($p.Desc) — khong co process nao lang nghe"
    }
}

# ── 3: API Health Endpoints ──────────────────────────────
Write-Section "API Health"

try {
    $health = Invoke-RestMethod -Uri "$APP_URL/api/health/detailed" -Method Get -TimeoutSec 5 -ErrorAction Stop
    $dbOk    = $health.database -eq $true -or $health.database -eq "ok"
    $redisOk = $health.redis    -eq $true -or $health.redis    -eq "ok"
    Write-OK "API endpoint: /api/health/detailed"
    Write-Host "    Database  : " -NoNewline
    if ($dbOk)    { Write-Host "OK"   -ForegroundColor Green  } else { Write-Host "WARN" -ForegroundColor Yellow }
    Write-Host "    Redis     : " -NoNewline
    if ($redisOk) { Write-Host "OK"   -ForegroundColor Green  } else { Write-Host "WARN" -ForegroundColor Yellow }
} catch {
    try {
        $null = Invoke-RestMethod -Uri "$APP_URL/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-OK "API /health: OK (detailed khong kha dung)"
    } catch {
        Write-ERR "Khong the ket noi toi $APP_URL/api/health"
        Write-ERR "  $($_.Exception.Message)"
        Write-WARN "Server co the chua san sang — thu chay Deploy-Desktop.bat"
    }
}

# ── 4: Queue Metrics (optional) ──────────────────────────
Write-Section "Queue Metrics (tuy chon)"

$token = Read-Host "  Nhap Super Admin Token (an Enter de bo qua)"
if (-not [string]::IsNullOrWhiteSpace($token)) {
    try {
        $headers = @{ "Authorization" = "Bearer $token" }
        $metrics = Invoke-RestMethod -Uri "$APP_URL/api/v1/monitor/metrics" -Method Get -Headers $headers -TimeoutSec 5
        Write-OK "Metrics:"
        $metrics | ConvertTo-Json -Depth 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
    } catch {
        Write-ERR "Loi khi lay metrics: $($_.Exception.Message)"
    }
} else {
    Write-Host "    (bo qua)" -ForegroundColor Gray
}

# ── 5: Cac lenh debug huu ich ────────────────────────────
Write-Section "Lenh debug huu ich"
Write-Host "    docker compose -f $COMPOSE_FILE logs app --tail=50" -ForegroundColor Gray
Write-Host "    docker compose -f $COMPOSE_FILE logs db --tail=20"  -ForegroundColor Gray
Write-Host "    docker compose -f $COMPOSE_FILE logs migrate --tail=20" -ForegroundColor Gray
Write-Host "    docker compose -f $COMPOSE_FILE ps" -ForegroundColor Gray
Write-Host "    docker compose -f $COMPOSE_FILE restart app" -ForegroundColor Gray
Write-Host ""
Write-Host "  =========================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "  Nhan Enter de thoat"
exit $exitCode
