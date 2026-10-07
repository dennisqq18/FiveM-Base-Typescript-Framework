@echo off
setlocal
cd /d "%~dp0"
set missing=0
if not exist "server.cfg" echo [MISSING] server.cfg&set missing=1
if not exist "resources\[core]\core\fxmanifest.lua" echo [MISSING] core&set missing=1
if not exist "resources\[managers]\mapmanager\fxmanifest.lua" echo [MISSING] mapmanager&set missing=1
if not exist "resources\[managers]\spawnmanager\fxmanifest.lua" echo [MISSING] spawnmanager&set missing=1
if not exist "resources\[system]\chat\fxmanifest.lua" echo [MISSING] chat&set missing=1
if not exist "resources\[system]\sessionmanager\fxmanifest.lua" echo [MISSING] sessionmanager&set missing=1
if not exist "resources\[system]\hardcap\fxmanifest.lua" echo [MISSING] hardcap&set missing=1
if %missing%==0 echo [RUMBLE] Base server structure is complete.
pause
exit /b %missing%
