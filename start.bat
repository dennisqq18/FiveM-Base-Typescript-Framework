@echo off
setlocal
title Rumble Server
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\bootstrap.ps1" -Mode start
if errorlevel 1 (
  echo.
  echo [RUMBLE] Server preparation failed.
  pause
  exit /b 1
)
"%~dp0artifacts\FXServer.exe" +exec server.cfg
set "rumble_exit=%errorlevel%"
echo.
echo [RUMBLE] FXServer stopped with exit code %rumble_exit%.
pause
exit /b %rumble_exit%
