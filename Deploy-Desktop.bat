@echo off
chcp 65001 >nul
title SCMD Pro - Auto Deploy

:: Kiem tra PowerShell ton tai
where powershell.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERR] Khong tim thay PowerShell. Vui long cai dat PowerShell 5.1+
    echo  https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell
    echo.
    pause
    exit /b 1
)

:: Kiem tra file PS1 ton tai
if not exist "%~dp0Deploy-Desktop.ps1" (
    echo.
    echo  [ERR] Khong tim thay Deploy-Desktop.ps1 cung thu muc nay.
    echo  Dam bao ca hai file nam cung mot folder.
    echo.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Deploy-Desktop.ps1" %*
if %errorlevel% neq 0 (
    echo.
    echo  [ERR] Deploy that bai. Xem thong bao loi o tren.
    pause
    exit /b 1
)
