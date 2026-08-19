@echo off
setlocal EnableExtensions
title Spa + Cloudflare Quick Tunnel
cd /d "%~dp0"

if "%PORT%"=="" set "PORT=3000"

rem ---- 1) Locate cloudflared (local install first, then PATH) ----
set "CF=%LOCALAPPDATA%\cloudflared\cloudflared.exe"
if not exist "%CF%" (
  where cloudflared >nul 2>nul
  if errorlevel 1 goto :nocloud
  set "CF=cloudflared"
)

rem ---- 2) Sanity checks ----
if not exist "node_modules\tsx\dist\cli.mjs" goto :nodeps
if not exist "server.ts" goto :noroot

rem ---- 3) Start the app server (dev mode) in its own window ----
rem Dev mode keeps the F-08 Origin allowlist OFF, so the random
rem https://...trycloudflare.com URL can still submit booking forms.
rem Note: no "cd" in the child - `start` inherits the parent's working
rem directory, which avoids quoting issues with the "&" in this folder name.
echo Starting app server on http://127.0.0.1:%PORT% ...
start "Spa Server" node node_modules\tsx\dist\cli.mjs server.ts

rem ---- 4) Wait for the port to open ----
set /a tries=0
:wait
powershell -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient; try{$c.Connect('127.0.0.1',%PORT%);$c.Close();exit 0}catch{exit 1}" >nul 2>nul
if not errorlevel 1 goto :ready
set /a tries+=1
if %tries% GEQ 30 (
  echo [WARN] Server did not answer on port %PORT% after 30s.
  echo        Check the "Spa Server" window - is PostgreSQL running?
  goto :tunnel
)
timeout /t 1 /nobreak >nul
goto :wait

:ready
echo Server is up on http://127.0.0.1:%PORT%

rem ---- 5) Cloudflare quick tunnel (foreground, shows public URL) ----
:tunnel
echo.
echo Starting Cloudflare quick tunnel...
echo Copy the https://...trycloudflare.com URL to open the app publicly.
echo Press Ctrl+C when done; the server window keeps running.
echo.
"%CF%" tunnel --url http://127.0.0.1:%PORT%
echo.
echo Tunnel closed. Opening the local app in your browser...
start "" "http://127.0.0.1:%PORT%"
pause
exit /b 0

:nocloud
echo [ERROR] cloudflared.exe not found.
echo Install Cloudflare Tunnel from:
echo   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
echo or put cloudflared.exe into your PATH.
pause
exit /b 1

:nodeps
echo [ERROR] node_modules missing. Run:  npm install
pause
exit /b 1

:noroot
echo [ERROR] This .bat must be at the project root (where server.ts lives).
pause
exit /b 1
