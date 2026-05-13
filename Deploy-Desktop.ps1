# =========================================================
#   SCMD PRO - AUTO DEPLOY & HEALTH CHECK (PRODUCTION-GRADE)
#   Version: 4.50.0+
# =========================================================
Set-StrictMode -Version Latest
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "SCMD Pro - Auto Deploy"

# Auto-unblock configuration files if they were downloaded
Unblock-File -Path $PSCommandPath -ErrorAction SilentlyContinue
Unblock-File -Path "docker-compose.desktop.yml", "Dockerfile.desktop", ".env" -ErrorAction SilentlyContinue

# --- Configuration ---
$COMPOSE_FILE = "docker-compose.desktop.yml"
$DOCKERFILE   = "Dockerfile.desktop" # Assuming this is the Dockerfile used by docker-compose.desktop.yml
$APP_URL      = "http://localhost:3000"
$APP_SERVICE  = "app" # The main API service to healthcheck
$BOOT_TIMEOUT = 300   # Increased timeout for all services to become healthy (seconds)
$BACKUP_DIR   = ".\.deploy_backup"
$CURRENT_DIR  = (Get-Location).Path

function Write-Header($text) {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Cyan
}

function Write-Step($step, $text) {
    Write-Host ""
    Write-Host "[$step] $text" -ForegroundColor Yellow
}

function Write-OK($text)   { Write-Host "  OK   $text" -ForegroundColor Green }
function Write-WARN($text) { Write-Host "  WARN $text" -ForegroundColor Yellow }
function Write-ERR($text)  { Write-Host "  ERR  $text" -ForegroundColor Red }
function Write-INFO($text) { Write-Host "  INFO $text" -ForegroundColor DarkGray }

function Invoke-DockerCompose($ComposeArgs, $noOutput = $false) {
    $fullArgs = "compose -f $COMPOSE_FILE $ComposeArgs"
    Write-INFO "Executing: docker $fullArgs"
    
    $stdoutFile = [System.IO.Path]::GetTempFileName()
    $stderrFile = [System.IO.Path]::GetTempFileName()
    
    $process = Start-Process -FilePath "docker" -ArgumentList $fullArgs -PassThru -NoNewWindow -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile

    if ($null -eq $process) {
        Write-ERR "Failed to start docker process."
        return $false, "", "Process start failure"
    }

    $process.WaitForExit()

    $stdout = if (Test-Path $stdoutFile) { Get-Content $stdoutFile -Raw } else { "" }
    $stderr = if (Test-Path $stderrFile) { Get-Content $stderrFile -Raw } else { "" }
    
    Remove-Item $stdoutFile -ErrorAction SilentlyContinue
    Remove-Item $stderrFile -ErrorAction SilentlyContinue

    if (-not $noOutput) {
        if ($stdout) { Write-Host $stdout -ForegroundColor DarkGray }
        if ($stderr) { Write-Host $stderr -ForegroundColor Red }
    }

    if ($process.ExitCode -ne 0) {
        Write-ERR "Docker Compose command failed with exit code $($process.ExitCode): docker $fullArgs"
        return $false, $stdout, $stderr
    }
    Write-INFO "Command successful."
    return $true, $stdout, $stderr
}

function Restore-Deployment($reason) {
    Write-Header "ROLLBACK INITIATED"
    Write-ERR "Deployment failed: $reason. Attempting rollback..."

    try {
        Write-Step "R/1" "Stopping current stack..."
        $success, $out, $err = Invoke-DockerCompose "down --remove-orphans" $true
        if (-not $success) {
            Write-WARN "Failed to stop current stack during rollback. Continuing anyway. Output: $out, Error: $err"
        }
        Write-OK "Current stack stopped."

        Write-Step "R/2" "Restoring previous configuration..."
        if (Test-Path "$BACKUP_DIR\$DOCKERFILE") {
            Copy-Item "$BACKUP_DIR\$DOCKERFILE" "$CURRENT_DIR\$DOCKERFILE" -Force
            Write-OK "Restored $DOCKERFILE."
        } else { Write-WARN "Backup for $DOCKERFILE not found. Skipping restore." }
        if (Test-Path "$BACKUP_DIR\$COMPOSE_FILE") {
            Copy-Item "$BACKUP_DIR\$COMPOSE_FILE" "$CURRENT_DIR\$COMPOSE_FILE" -Force
            Write-OK "Restored $COMPOSE_FILE."
        } else { Write-WARN "Backup for $COMPOSE_FILE not found. Skipping restore." }

        Write-Step "R/3" "Starting previous stack..."
        $success, $out, $err = Invoke-DockerCompose "up -d" $true
        if (-not $success) {
            Write-ERR "Failed to start previous stack during rollback. Manual intervention required. Output: $out, Error: $err"
            exit 1
        }
        Write-OK "Previous stack started successfully."

        Write-Header "ROLLBACK COMPLETE"
        Write-WARN "System rolled back to previous stable state. Please investigate the failed deployment."
        exit 1
    } catch {
        Write-ERR "An unexpected error occurred during rollback: $($_.Exception.Message)"
        exit 1
    } finally {
        # Clean up backup directory after rollback attempt
        if (Test-Path $BACKUP_DIR) {
            Remove-Item $BACKUP_DIR -Recurse -Force -ErrorAction SilentlyContinue
            Write-INFO "Cleaned up backup directory."
        }
    }
}


# --- Main Deployment Logic ---
try {
    Write-Header "SCMD PRO - AUTO DEPLOY & HEALTH CHECK"

    # ── BUOC 0: Kiem tra Docker ──────────────────────────────
    Write-Step "0/7" "Kiem tra Docker Desktop..."
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-WARN "Docker Desktop chua chay. Dang khoi dong..."
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Write-Host "  Cho Docker khoi dong (60 giay)..." -ForegroundColor Gray
        Start-Sleep 60
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-ERR "Docker Desktop khong the khoi dong. Vui long kiem tra thu cong."
            Read-Host "Nhan Enter de thoat"
            exit 1
        }
    }
    Write-OK "Docker Desktop dang chay"

    # ── BUOC 1: Backup cau hinh hien tai ────────────────────
    Write-Step "1/7" "Backup cau hinh hien tai..."
    if (Test-Path $BACKUP_DIR) {
        Remove-Item $BACKUP_DIR -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Copy-Item "$CURRENT_DIR\$DOCKERFILE" "$BACKUP_DIR\$DOCKERFILE" -Force
    Copy-Item "$CURRENT_DIR\$COMPOSE_FILE" "$BACKUP_DIR\$COMPOSE_FILE" -Force
    Write-OK "Cau hinh hien tai da duoc backup vao $BACKUP_DIR"

    # ── BUOC 2: Dung stack cu ────────────────────────────────
    Write-Step "2/7" "Dung stack cu va don dep..."
    $success, $out, $err = Invoke-DockerCompose "down --remove-orphans" $true
    if (-not $success) {
        # This might fail if no stack is running, which is fine.
        Write-WARN "Could not stop previous stack cleanly. Continuing. Output: $out, Error: $err"
    }
    Write-OK "Stack cu da dung."

    # ── BUOC 3: Kiem tra va fix .env ─────────────────────────
    Write-Step "3/7" "Kiem tra cau hinh .env..."
    $envFile = ".env"
    $envChanged = $false

    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw

        if ($envContent -match 'LOKI_URL=http') {
            $envContent = $envContent -replace 'LOKI_URL=\S+', 'LOKI_URL='
            $envChanged = $true
            Write-WARN "LOKI_URL: Da xoa URL Loki (khong co trong desktop stack)"
        }

        if ($envContent -match 'VITE_RECAPTCHA_SITE_KEY=\S+') {
            $envContent = $envContent -replace 'VITE_RECAPTCHA_SITE_KEY=\S+', 'VITE_RECAPTCHA_SITE_KEY='
            $envChanged = $true
            Write-WARN "VITE_RECAPTCHA_SITE_KEY: Da xoa (localhost khong ho tro Google reCAPTCHA)"
        }

        if ($envContent -match 'RECAPTCHA_SECRET_KEY=\S+') {
            $envContent = $envContent -replace 'RECAPTCHA_SECRET_KEY=\S+', 'RECAPTCHA_SECRET_KEY='
            $envChanged = $true
            Write-WARN "RECAPTCHA_SECRET_KEY: Da xoa (skip validation o local)"
        }

        if ($envChanged) {
            Set-Content $envFile $envContent -NoNewline
            Write-OK ".env da duoc cap nhat tu dong"
        } else {
            Write-OK ".env hop le, khong can chinh sua"
        }
    } else {
        Write-WARN "Khong tim thay file .env. Dam bao .env ton tai."
    }

    # ── BUOC 4: Build Images ─────────────────────────────────
    Write-Step "4/7" "Build cac Docker images..."
    $success, $out, $err = Invoke-DockerCompose "build"
    if (-not $success) {
        Restore-Deployment "Image build failed. Output: $out, Error: $err"
    }
    Write-OK "Build images thanh cong."

    # ── BUOC 5: Deploy Stack ─────────────────────────────────
    Write-Step "5/7" "Khoi dong stack Docker Compose..."
    $success, $out, $err = Invoke-DockerCompose "up --force-recreate -d"
    if (-not $success) {
        Restore-Deployment "Docker Compose stack startup failed. Output: $out, Error: $err"
    }
    Write-OK "Stack da duoc khoi dong."

    # ── BUOC 6: Doi tat ca service healthy ───────────────────
    Write-Step "6/7" "Doi tat ca service hoan tat khoi dong va healthy (toi da $BOOT_TIMEOUT giay)..."
    $elapsed = 0
    $allHealthy = $false

    while ($elapsed -lt $BOOT_TIMEOUT) {
        Start-Sleep 10 # Check every 10 seconds
        $elapsed += 10

        $serviceStatusJson = & docker compose -f $COMPOSE_FILE ps --format json 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-WARN "Could not get service status: $serviceStatusJson. Retrying..."
            continue
        }
        $serviceStatus = $serviceStatusJson | ConvertFrom-Json

        # Filter out the 'migrate' service if it has exited successfully
        $activeServices = @($serviceStatus | Where-Object { $_.Service -ne "migrate" -or ($_.Service -eq "migrate" -and $_.State -ne "exited (0)") })

        $unhealthyServices = @($activeServices | Where-Object { $_.State -ne "running (healthy)" -and $_.State -ne "running (starting)" -and $_.State -ne "running" })
        $startingServices = @($activeServices | Where-Object { $_.State -eq "running (starting)" })

        if ($unhealthyServices.Count -eq 0 -and $startingServices.Count -eq 0) {
            $allHealthy = $true
            Write-OK "Tat ca services da healthy."
            break
        } else {
            Write-Host "  ... Dang doi services ($elapsed/$BOOT_TIMEOUT giay). Unhealthy: $($unhealthyServices.Count), Starting: $($startingServices.Count)" -ForegroundColor Gray
            if ($unhealthyServices.Count -gt 0) {
                $unhealthyNames = $unhealthyServices | ForEach-Object { $_.Service }
                Write-WARN "  Services chua healthy: $($unhealthyNames -join ', ')"
            }
        }
    }

    if (-not $allHealthy) {
        Restore-Deployment "Mot hoac nhieu services khong healthy sau $BOOT_TIMEOUT giay."
    }

    # ── BUOC 7: Health Check API endpoint ────────────────────
    Write-Step "7/7" "Kiem tra API endpoint ($APP_URL/api/health)..."
    $apiUp = $false
    $apiCheckAttempts = 0
    $maxApiCheckAttempts = 10 # 10 attempts * 5 seconds = 50 seconds

    while ($apiCheckAttempts -lt $maxApiCheckAttempts) {
        try {
            $null = Invoke-RestMethod -Uri "$APP_URL/api/health" -TimeoutSec 5 -ErrorAction Stop
            $apiUp = $true
            Write-OK "API endpoint $APP_URL/api/health da phan hoi."
            break
        } catch {
            $apiCheckAttempts++
            Write-Host "  ... Dang doi API ($apiCheckAttempts/$maxApiCheckAttempts lan). Loi: $($_.Exception.Message)" -ForegroundColor Gray
            Start-Sleep 5
        }
    }

    if (-not $apiUp) {
        Restore-Deployment "API endpoint khong phan hoi sau nhieu lan thu."
    }

    # ── KET QUA CUOI ─────────────────────────────────────────
    Write-Header "KET QUA DEPLOY"

    Write-Host ""
    Write-Host "  --- Docker Services ---" -ForegroundColor Cyan
    $psResult = & docker compose -f $COMPOSE_FILE ps 2>&1
    foreach ($line in $psResult) {
        $lineStr = "$line"
        if ($lineStr -match "Restarting|unhealthy") {
            Write-Host "  $lineStr" -ForegroundColor Red
        } elseif ($lineStr -match "healthy|Up") {
            Write-Host "  $lineStr" -ForegroundColor Green
        } elseif ($lineStr -match "Exit 0") {
            Write-Host "  $lineStr  (migration - binh thuong)" -ForegroundColor Gray
        } else {
            Write-Host "  $lineStr" -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "  --- API Health ---" -ForegroundColor Cyan
    try {
        $health = Invoke-RestMethod -Uri "$APP_URL/api/health/detailed" -TimeoutSec 5 -ErrorAction Stop
        Write-OK "API /health/detailed: $($health | ConvertTo-Json -Compress)"
    } catch {
        Write-WARN "API detailed health check that bai. Co the API chua san sang hoan toan."
    }

    $lokiCheck = & docker compose -f $COMPOSE_FILE ps loki 2>&1 | Select-String "Restarting"
    if ($lokiCheck) {
        Write-WARN "Loki dang Restarting - chay: docker compose logs loki --tail=20"
    }

    Write-Host ""
    Write-Host "  THANH CONG! He thong dang hoat dong tai:" -ForegroundColor Green
    Write-Host "     http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "  Dang nhap:" -ForegroundColor Gray
    Write-Host "     Workspace: system    -> Super Admin" -ForegroundColor Gray
    Write-Host "     Workspace: vinhomes  -> Tenant Demo" -ForegroundColor Gray

} catch {
    Write-ERR "Mot loi khong mong muon xay ra trong qua trinh deploy: $($_.Exception.Message)"
    Restore-Deployment "Loi khong mong muon."
} finally {
    # Clean up backup directory on successful deploy
    if (Test-Path $BACKUP_DIR) {
        Remove-Item $BACKUP_DIR -Recurse -Force -ErrorAction SilentlyContinue
        Write-INFO "Cleaned up backup directory."
    }
}

Write-Host ""
Read-Host "Nhan Enter de xem logs truc tiep (Ctrl+C de thoat)"
$success, $out, $err = Invoke-DockerCompose "logs -f $APP_SERVICE" # This will block until Ctrl+C
