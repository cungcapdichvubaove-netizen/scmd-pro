@echo off
setlocal EnableDelayedExpansion
title SCMD Pro - Factory Reset v2.3

:: ============================================================
:: SCMD Pro - Reset-Desktop.bat  (v2.3)
:: Fixes:
::   [FIX-BUG] Thoát dấu ngoặc đơn ^(^) trong các câu lệnh ECHO nằm trong khối IF.
::   [FIX-BUG] Đảm bảo tính ổn định của Status Matrix khi chạy trong môi trường PowerShell.
:: ============================================================

:: --- Config -------------------------------------------------
set "COMPOSE_FILE=docker-compose.desktop.yml"
set "APP_CONTAINER=scmd-desktop-app"
set "DB_CONTAINER=scmd-desktop-db"
set "REDIS_CONTAINER=scmd-desktop-redis"
set "PDF_CONTAINER=scmd-desktop-pdf"
set "APP_URL=http://localhost:3000"
set "LOG_FILE=reset-desktop.log"
set "MAX_WAIT=300"
set "REQUIRED_DISK_MB=4096"
set "MIN_DOCKER_MAJOR=20"
set "MIN_DOCKER_MINOR=10"

:: --- Header -------------------------------------------------
echo.
echo  ================================================================
echo        SCMD PRO - FACTORY RESET  (v2.3)
echo  ================================================================
echo.
echo   [!] Thao tac nay se XOA TOAN BO du lieu hien tai:
echo       - Database (PostgreSQL volumes)
echo       - Cache (Redis volumes)
echo       - Rebuild image tu dau (no-cache)
echo       - Nap lai du lieu mau (seed tu dong qua entrypoint)
echo.
echo   De HUY, dong cua so nay NGAY BAY GIO.
echo   De DONG Y, nhan phim bat ky...
echo.
pause >nul

:: --- Init log file -------------------------------------------
echo [%date% %time%] === SCMD Pro Factory Reset v2.3 Started === > "%LOG_FILE%"

:: ============================================================
:: PRE-FLIGHT CHECKS
:: ============================================================
echo.
echo  [PRE-FLIGHT] Kiem tra moi truong...
echo  ----------------------------------------------------------------

:: -- [CHECK 1] Docker daemon ----------------------------------
docker info >nul 2>&1
if %errorlevel% neq 0 (
call :log_error "Docker Desktop chua chay."
echo   [ERR] Docker Desktop chua chay. Vui long khoi dong Docker Desktop truoc.
goto :fatal
)
echo   [OK] Docker Desktop dang chay

:: -- [CHECK 2] Compose file -----------------------------------
if not exist "%COMPOSE_FILE%" (
call :log_error "Khong tim thay %COMPOSE_FILE%"
echo   [ERR] Khong tim thay %COMPOSE_FILE%
echo         Hay chay script tu thu muc goc project.
goto :fatal
)
echo   [OK] %COMPOSE_FILE% ton tai

:: -- [CHECK 3] .env file --------------------------------------
if not exist ".env" (
echo.
echo   [ERR] Khong tim thay file .env
if exist ".env.example" (
echo   [INFO] Tim thay .env.example - chay lenh sau roi thu lai:
echo          copy .env.example .env
)
call :log_error "File .env khong ton tai"
goto :fatal
)
echo   [OK] File .env ton tai

:: -- [CHECK 4] Validate bien bat buoc trong .env --------------
set "ENV_OK=1"
for %%V in (JWT_SECRET INTERNAL_API_SECRET DEVICE_SECRET DB_USER DB_PASSWORD DB_NAME) do (
findstr /B /C:"%%V=" .env >nul 2>&1
if !errorlevel! neq 0 (
echo   [WARN] Thieu bien bat buoc: %%V trong .env
set "ENV_OK=0"
)
)
findstr /C:"replace_me_with_strong_random_secret" .env >nul 2>&1
if !errorlevel! equ 0 (
echo   [WARN] Phat hien gia tri placeholder chua doi trong .env
)
if "%ENV_OK%"=="1" (
echo   [OK] Cac bien bat buoc trong .env hop le
) else (
echo   [ERR] .env thieu bien bat buoc - dung lai.
call :log_error ".env validation failed"
goto :fatal
)

:: -- [CHECK 5] Disk space -------------------------------------
set "FREE_BYTES="
for /f "tokens=3" %%D in ('dir /-c /w 2^>nul ^| findstr /C:"bytes free"') do set "FREE_BYTES=%%D"

if not defined FREE_BYTES (
echo   [WARN] Khong doc duoc thong tin disk - bo qua kiem tra dung luong.
) else (
set "BYTES_TRIM=!FREE_BYTES:~0,-6!"
if "!BYTES_TRIM!"=="" set "BYTES_TRIM=0"
set /a "FREE_MB=!BYTES_TRIM!"
if !FREE_MB! lss %REQUIRED_DISK_MB% (
echo   [WARN] Disk space thap: ~!FREE_MB! MB. Can it nhat %REQUIRED_DISK_MB% MB.
) else (
echo   [OK] Disk space: ~!FREE_MB! MB kha dung
)
)

:: -- [CHECK 6] Port 3000 --------------------------------------
:: FIX [B-02]: Port 3000 bi chiem chi xay ra khi stack cu chua down het.
:: down -v o Step 1 phai xu ly duoc, nhung neu container bi treo,
:: bao WARN de nguoi dung biet - Step 1 se force-remove.
netstat -an 2>nul | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
echo   [WARN] Port 3000 dang bi chiem. Step 1 se giai phong khi down stack.
) else (
echo   [OK] Port 3000 san sang
)

:: -- [CHECK 7] Docker version >= 20.10 ------------------------
set "DOCKER_VER_RAW="
for /f "tokens=3" %%V in ('docker --version 2^>nul') do set "DOCKER_VER_RAW=%%V"
set "DOCKER_VER=%DOCKER_VER_RAW:,=%"
for /f "tokens=1,2 delims=." %%A in ("%DOCKER_VER%") do (
set /a "DOCKER_MAJOR=%%A" 2>nul
set /a "DOCKER_MINOR=%%B" 2>nul
)
if not defined DOCKER_MAJOR set "DOCKER_MAJOR=0"
if not defined DOCKER_MINOR set "DOCKER_MINOR=0"
set "VER_OK=0"
if !DOCKER_MAJOR! gtr %MIN_DOCKER_MAJOR% set "VER_OK=1"
if !DOCKER_MAJOR! equ %MIN_DOCKER_MAJOR% if !DOCKER_MINOR! geq %MIN_DOCKER_MINOR% set "VER_OK=1"

if "%VER_OK%"=="1" (
echo   [OK] Docker %DOCKER_VER% ^(khuyen nghi ^>= %MIN_DOCKER_MAJOR%.%MIN_DOCKER_MINOR%^)
) else (
echo   [WARN] Docker %DOCKER_VER% co the qua cu.
)

echo.
echo  [PRE-FLIGHT] Tat ca kiem tra hoan tat - bat dau reset.
echo  ================================================================

:: ============================================================
:: BACKUP OPTION
:: ============================================================
echo.
set /p BACKUP_CHOICE="   Co muon backup database hien tai truoc khi xoa? (y/n): "
if /i "%BACKUP_CHOICE%"=="y" (
call :do_backup
)

:: ============================================================
:: STEP 1: DOWN + REMOVE VOLUMES
:: ============================================================
echo.
echo  [1/5] Dung toan bo stack va xoa volumes...
call :log_info "Step 1: docker compose down -v"

docker compose -f "%COMPOSE_FILE%" down -v --remove-orphans --timeout 30 2>> "%LOG_FILE%"
if %errorlevel% neq 0 (
echo   [WARN] Lenh down co canh bao nho - tiep tuc ^(binh thuong khi stack chua chay lan nao^).
)

docker image prune -f >nul 2>&1
echo   [OK] Stack da dung, volumes da xoa

:: ============================================================
:: STEP 2: BUILD
:: Strategy: pdf service dung cache (base image ~1.5GB, hiem khi doi)
::           app service --no-cache (pick up code + entrypoint changes)
:: FIX [B-01]: --no-cache cho ca 2 service lam pdf build mat 8-15 phut
::             va co the timeout -> tach ra 2 lenh build doc lap.
:: ============================================================
echo.
echo  [2/5] Build images...
call :log_info "Step 2a: build pdf service (with cache)"

echo   [2a/2] Build pdf service ^(co cache, giu lai base image~)...
docker compose -f "%COMPOSE_FILE%" build pdf >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
echo.
echo   [ERR] BUILD PDF THAT BAI. Xem log: %LOG_FILE%
call :log_error "Build failed: pdf service"
goto :fatal
)
echo   [OK] PDF service build thanh cong

call :log_info "Step 2b: build app service (no-cache)"
echo   [2b/2] Build app service ^(no-cache, ap dung thay doi moi nhat^)...
docker compose -f "%COMPOSE_FILE%" build --no-cache app >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
echo.
echo   [ERR] BUILD APP THAT BAI. Xem log: %LOG_FILE%
call :log_error "Build failed: app service"
goto :fatal
)
echo   [OK] App service build thanh cong

:: ============================================================
:: STEP 3: KHOI DONG STACK (AUTO_SEED=true)
:: ============================================================
echo.
echo  [3/5] Khoi dong stack (AUTO_SEED=true)...
call :log_info "Step 3: docker compose up"

set AUTO_SEED=true
docker compose -f "%COMPOSE_FILE%" up --force-recreate -d 2>> "%LOG_FILE%"
if %errorlevel% neq 0 (
echo.
echo   [ERR] Khoi dong stack that bai.
call :log_error "Stack startup failed at Step 3"
goto :fatal
)
echo   [OK] Stack da khoi dong

:: ============================================================
:: STEP 4: HEALTH CHECK MATRIX
:: ============================================================
echo.
echo  [4/5] Cho services san sang (toi da %MAX_WAIT% giay)...
echo.

set /a "elapsed=0"
set "ALL_HEALTHY=0"

:health_loop
if %elapsed% geq %MAX_WAIT% goto :health_timeout
ping 127.0.0.1 -n 6 >nul 2>&1
set /a "elapsed+=5"

set "APP_OK=0"
set "DB_OK=0"
set "REDIS_OK=0"
set "PDF_OK=0"

:: App Health
curl -sf --max-time 3 "%APP_URL%/api/health" >nul 2>&1
if %errorlevel% equ 0 set "APP_OK=1"

:: DB Health
for /f "delims=" %%S in ('docker inspect --format "{{.State.Health.Status}}" %DB_CONTAINER% 2^>nul') do set "DB_STATUS=%%S"
echo !DB_STATUS! | findstr /I "healthy" >nul 2>&1
if %errorlevel% equ 0 set "DB_OK=1"

:: Redis Health
for /f "delims=" %%S in ('docker inspect --format "{{.State.Health.Status}}" %REDIS_CONTAINER% 2^>nul') do set "REDIS_STATUS=%%S"
echo !REDIS_STATUS! | findstr /I "healthy" >nul 2>&1
if %errorlevel% equ 0 set "REDIS_OK=1"

:: PDF Health
for /f "delims=" %%S in ('docker inspect --format "{{.State.Health.Status}}" %PDF_CONTAINER% 2^>nul') do set "PDF_STATUS=%%S"
echo !PDF_STATUS! | findstr /I "healthy" >nul 2>&1
if %errorlevel% equ 0 set "PDF_OK=1"

:: Print Matrix
<nul set /p "=   [%elapsed%s/%MAX_WAIT%s]  APP:"
if "%APP_OK%"=="1" (<nul set /p "=OK  ") else (<nul set /p "=..  ")
<nul set /p "=DB:"
if "%DB_OK%"=="1" (<nul set /p "=OK  ") else (<nul set /p "=..  ")
<nul set /p "=REDIS:"
if "%REDIS_OK%"=="1" (<nul set /p "=OK  ") else (<nul set /p "=..  ")
<nul set /p "=PDF:"
if "%PDF_OK%"=="1" (echo OK) else (echo ..)

if "%APP_OK%"=="1" if "%DB_OK%"=="1" if "%REDIS_OK%"=="1" (
set "ALL_HEALTHY=1"
goto :health_done
)
goto :health_loop

:health_done
echo.
echo   [OK] Core services san sang (App + DB + Redis)
call :log_info "Health check passed"
goto :step5

:health_timeout
echo.
echo   [ERR] Health check timeout.
call :log_error "Health check timeout after %MAX_WAIT%s"
echo   [WARN] Tiep tuc du co timeout...

:step5
:: ============================================================
:: STEP 5: VERIFY SEED
:: ============================================================
echo.
echo  [5/5] Xac nhan seed hoan tat...
docker compose -f "%COMPOSE_FILE%" logs --no-color app 2>nul | findstr /R /I "seed seeding upsert 

$$3/4$$

" >nul 2>&1
if %errorlevel% equ 0 (
echo   [OK] Seed da chay thanh cong
) else (
echo   [WARN] Chua xac nhan duoc seed log.
)

:: Get credentials
call :read_env_var "SEED_SUPERADMIN_EMAIL"
set "SA_EMAIL=%ENV_VAR_VALUE%"
if "%SA_EMAIL%"=="" set "SA_EMAIL=superadmin@system.local"

call :read_env_var "SEED_SUPERADMIN_PASSWORD"
set "SA_PASS_RAW=%ENV_VAR_VALUE%"
if "%SA_PASS_RAW%"=="" set "SA_PASS_RAW=MISSING_SEED_SUPERADMIN_PASSWORD"

call :read_env_var "SEED_TENANT_ADMIN_PASSWORD"
set "TA_PASS_RAW=%ENV_VAR_VALUE%"
if "%TA_PASS_RAW%"=="" set "TA_PASS_RAW=MISSING_SEED_TENANT_ADMIN_PASSWORD"

call :mask_password "%SA_PASS_RAW%"
set "SA_PASS_DISPLAY=%MASKED_PASS%"
call :mask_password "%TA_PASS_RAW%"
set "TA_PASS_DISPLAY=%MASKED_PASS%"

echo.
echo  ================================================================
echo    THANH CONG! SCMD Pro dang hoat dong
echo  ================================================================
echo.
echo    URL:   %APP_URL%
echo.
echo    TAI KHOAN DEMO ^(password xem trong .env^):
echo    +----------------------------------------------------------+
echo    ^|  Workspace : system                                      ^|
echo    ^|  Role      : Super Admin                                 ^|
echo    ^|  Email     : %SA_EMAIL%
echo    ^|  Pass      : %SA_PASS_DISPLAY%
echo    +----------------------------------------------------------+
echo    ^|  Workspace : vinhomes                                    ^|
echo    ^|  Role      : Tenant Admin                                ^|
echo    ^|  Pass      : %TA_PASS_DISPLAY%
echo    +----------------------------------------------------------+
echo.
echo    Log file: %LOG_FILE%
echo  ================================================================
echo.

set /p VIEW_LOGS="   Xem logs app ngay bay gio? (y/n): "
if /i "%VIEW_LOGS%"=="y" (
docker compose -f "%COMPOSE_FILE%" logs -f app
)

endlocal
exit /b 0

:: --- Subroutines ---

:read_env_var
set "ENV_VAR_VALUE="
for /f "tokens=1,* delims==" %%K in ('findstr /B /C:"%~1=" .env 2^>nul') do (
if "%%K"=="%~1" if not "%%L"=="" set "ENV_VAR_VALUE=%%L"
)
goto :eof

:mask_password
set "_P=%~1"
set "MASKED_PASS="
if defined _P (
set "MASKED_PASS=!_P:~0,3!***"
)
goto :eof

:do_backup
call :read_env_var "DB_USER"
set "BACKUP_DB_USER=%ENV_VAR_VALUE%"
if "%BACKUP_DB_USER%"=="" set "BACKUP_DB_USER=scmduser"
set "BACKUP_DATE=%date:~-4%%date:~3,2%%date:~0,2%"
set "BACKUP_TIME=%time:~0,2%%time:~3,2%"
set "BACKUP_TIME=%BACKUP_TIME: =0%"
set "BACKUP_FILE=scmd-backup-%BACKUP_DATE%_%BACKUP_TIME%.sql"
echo   [BACKUP] Dang backup database vao %BACKUP_FILE%...
docker exec %DB_CONTAINER% pg_dumpall -U "%BACKUP_DB_USER%" > "%BACKUP_FILE%" 2>nul
if %errorlevel% equ 0 (
echo   [OK] Backup hoan tat.
) else (
echo   [WARN] Backup loi.
)
goto :eof

:log_info
echo [%date% %time%] [INFO ] %~1 >> "%LOG_FILE%"
goto :eof

:log_error
echo [%date% %time%] [ERROR] %~1 >> "%LOG_FILE%"
goto :eof

:fatal
echo.
echo  ================================================================
echo    RESET DUNG LAI DO LOI - Xem chi tiet: %LOG_FILE%
echo  ================================================================
pause
endlocal
exit /b 1
