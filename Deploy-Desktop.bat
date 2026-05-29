@echo off
chcp 65001 >nul
title SCMD Pro - Smart Deploy V.5.1.1.19

echo.
echo =============================================================
echo      SCMD PRO - SMART DEPLOY V.5.1.1.19 (Enterprise)
echo =============================================================
echo.
echo  Chon che do deploy:
echo    [1] Chi doi source code (.ts/.tsx) - Nhanh ~30 giay
echo    [2] Doi ca dependencies (package.json) - Cham ~8 phut
echo.
set /p MODE="Nhap 1 hoac 2: "

if "%MODE%"=="1" goto fast_deploy
if "%MODE%"=="2" goto full_deploy
echo [ERR] Lua chon khong hop le.
pause
exit /b 1

:: -----------------------------------------
:: CHE DO 1: Chi rebuild dist/ trong container dang chay
:: Khong rebuild image, khong restart DB/Redis
:: -----------------------------------------
:fast_deploy
echo.
echo  [FAST MODE] Build lai dist/ trong container...
echo.

:: Kiem tra container dang chay
docker inspect scmd-desktop-app >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERR] Container scmd-desktop-app chua chay.
    echo  Hay chay Reset-Desktop.bat truoc.
    pause
    exit /b 1
)

echo  [1/4] Copy source moi vao container...
docker cp src\. scmd-desktop-app:/app/src/
docker cp prisma\. scmd-desktop-app:/app/prisma/
docker cp index.html scmd-desktop-app:/app/index.html
echo  [OK] Source code and schemas synchronized.

echo  [2/4] Rebuilding Frontend + Backend (Native ESM)...
docker exec -u root scmd-desktop-app sh -c "cd /app && npx prisma generate && npm run build:frontend && ./node_modules/.bin/esbuild src/server/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --target=node22 --packages=external --sourcemap"
if %errorlevel% neq 0 (
    echo.
    echo  [CRITICAL ERR] Build failed in container environment.
    pause
    exit /b 1
)
echo  [OK] Frontend va backend da build

echo  [3/4] Restart app process...
docker restart scmd-desktop-app
echo  [OK] App da restart

echo  [4/4] Luu y: frontend da duoc build lai trong /app/dist, khong dung dist cu.

echo.
echo  Cho server san sang...
set /a elapsed=0
:fast_health_loop
if %elapsed% geq 120 goto fast_timeout
ping 127.0.0.1 -n 4 >nul 2>&1
set /a elapsed+=3
curl -sf http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 goto fast_ok
echo   ... %elapsed%s
goto fast_health_loop

:fast_ok
echo.
echo =========================================================
echo   THANH CONG! San sang tai http://localhost:3000
echo   Thoi gian: ~%elapsed% giay
echo =========================================================
pause >nul
exit /b 0

:fast_timeout
echo  [WARN] Timeout. Kiem tra: docker logs scmd-desktop-app --tail=20
pause
exit /b 1

:: -----------------------------------------
:: CHE DO 2: Rebuild toan bo image (khi doi package.json)
:: Giu nguyen DB + Redis data
:: -----------------------------------------
:full_deploy
echo.
echo  [FULL MODE] Rebuild image va restart app...
echo.

echo  [1/3] Build image moi (co cache)...
docker compose -f docker-compose.desktop.yml build --pull app
if %errorlevel% neq 0 (
    echo  [ERR] Build that bai.
    pause
    exit /b 1
)
echo  [OK] Build thanh cong

echo  [2/3] Recreate app container (giu DB + Redis)...
docker compose -f docker-compose.desktop.yml up -d --force-recreate --no-deps app
if %errorlevel% neq 0 (
    echo  [ERR] Khoi dong that bai.
    pause
    exit /b 1
)

echo  [3/3] Cho server san sang (toi da 120 giay)...
set /a elapsed=0
:full_health_loop
if %elapsed% geq 240 goto full_timeout
ping 127.0.0.1 -n 6 >nul 2>&1
set /a elapsed+=5
curl -sf http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 goto full_ok
echo   ... %elapsed%s
goto full_health_loop

:full_ok
echo.
echo =========================================================
echo   THANH CONG! San sang tai http://localhost:3000
echo   Thoi gian: ~%elapsed% giay
echo =========================================================
pause >nul
exit /b 0

:full_timeout
echo  [WARN] Timeout. Kiem tra: docker logs scmd-desktop-app --tail=30
pause
exit /b 1
