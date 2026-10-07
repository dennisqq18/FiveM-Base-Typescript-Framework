@echo off
setlocal
title Rumble Artifact Updater
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\bootstrap.ps1" -Mode artifacts
if errorlevel 1 (
  echo.
  echo [RUMBLE] Artifact update failed.
  pause
  exit /b 1
)
echo.
echo [RUMBLE] Artifacts are up to date.
pause
