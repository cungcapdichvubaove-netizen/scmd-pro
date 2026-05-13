@echo off
chcp 65001 >nul
title SCMD Pro - Factory Reset

echo.
echo =========================================================
echo      SCMD PRO - FACTORY RESET (DESKTOP)
echo =========================================================
echo.
echo  [CANH BAO] Thao tac nay se:
echo    - XOA TOAN BO du lieu hien tai (Database, Redis, Logs)
echo    - Build lai image tu dau (khong dung cache)
echo    - Nap lai du lieu mau mac dinh
echo.
echo  De HUY, dong cua so nay ngay bay gio.
echo  De DONG Y, nhan phim bat ky...
echo.
pause >nul

:: Kiem tra Docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERR] Docker Desktop chua chay. Vui long khoi dong Docker truoc.
    echo.
    pause
    exit /b 1
)

:: Kiem tra compose file
if not exist "docker-compose.desktop.yml" (
    echo.
    echo  [ERR] Khong tim thay docker-compose.desktop.yml
    echo  Dam bao chay script nay tu thu muc goc cua project.
    echo.
    pause
    exit /b 1
)

echo.
echo  [1/4] Dung toan bo stack va xoa volumes...
docker compose -f docker-compose.desktop.yml down -v --remove-orphans
if %errorlevel% neq 0 (
    echo  [WARN] Lenh down co loi nho - tiep tuc...
)
echo  [OK] Stack da dung va volumes da xoa

echo.
echo  [2/4] Build lai image (khong dung cache - co the mat 3-10 phut)...
docker compose -f docker-compose.desktop.yml build --no-cache
if %errorlevel% neq 0 (
    echo.
    echo  [ERR] BUILD THAT BAI. Kiem tra loi o tren.
    pause
    exit /b 1
)
echo  [OK] Build thanh cong

echo.
echo  [3/4] Khoi dong stack va chay migration + seed...
docker compose -f docker-compose.desktop.yml up --force-recreate -d
if %errorlevel% neq 0 (
    echo.
    echo  [ERR] Khoi dong stack that bai.
    docker compose -f docker-compose.desktop.yml logs --tail=20
    pause
    exit /b 1
)
echo  [OK] Stack da khoi dong

echo.
echo  [4/4] Cho server san sang (toi da 180 giay)...
set /a elapsed=0
set /a max_wait=180

:health_loop
if %elapsed% geq %max_wait% goto health_timeout

:: Cho 10 giay moi lan
ping 127.0.0.1 -n 11 >nul 2>&1
set /a elapsed+=10

:: Kiem tra server bang curl (co san tren Windows 10+)
curl -sf http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 goto health_ok

echo   ... dang cho (%elapsed%/%max_wait% giay)
goto health_loop

:health_ok
echo.
echo  [OK] Server da san sang, bat dau seed du lieu...
docker compose -f docker-compose.desktop.yml exec app npm run db:seed
if %errorlevel% neq 0 (
    echo  [WARN] Loi khi seed du lieu. Xem log ben tren.
) else (
    echo  [OK] Du lieu mau da duoc seed xong.
)

echo.
echo =========================================================
echo   THANH CONG! He thong dang hoat dong tai:
echo     http://localhost:3000
echo.
echo   Tai khoan demo:
echo     Workspace: system    -^> Super Admin
echo     Workspace: vinhomes  -^> Tenant Demo
echo =========================================================
echo.
echo  Nhan phim bat ky de xem logs truc tiep (Ctrl+C de thoat)...
pause >nul
docker compose -f docker-compose.desktop.yml logs -f app
exit /b 0

:health_timeout
echo.
echo  [WARN] Server chua phan hoi sau %max_wait% giay.
echo  Co the van dang boot. Kiem tra bang lenh:
echo    docker compose -f docker-compose.desktop.yml logs app --tail=30
echo    docker compose -f docker-compose.desktop.yml ps
echo.
pause
exit /b 1
