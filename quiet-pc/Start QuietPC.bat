@echo off
:: Double-click this file. It asks for admin, then opens the QuietPC menu.
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0QuietPC.ps1"
pause
