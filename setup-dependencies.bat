@echo off
setlocal
title Rumble Dependency Setup
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\bootstrap.ps1" -Mode dependencies
if errorlevel 1 (
  echo.
  echo [RUMBLE] Dependency setup failed.
  pause
  exit /b 1
)
echo.
echo [RUMBLE] Dependencies are installed.
pause
