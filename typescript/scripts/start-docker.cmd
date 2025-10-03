@echo off
echo Checking if Docker is running...

:: Check if Docker is already running
docker version >nul 2>&1
if %errorlevel% == 0 (
    echo Docker is already running.
    goto :end
)

echo Docker is not running. Starting Docker Desktop...

:: Try to start Docker Desktop
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:: Wait for Docker to start (check every 5 seconds, max 60 seconds)
set /a counter=0
:wait_loop
timeout /t 5 /nobreak >nul
docker version >nul 2>&1
if %errorlevel% == 0 (
    echo Docker is now running.
    goto :end
)

set /a counter+=1
if %counter% lss 12 (
    echo Waiting for Docker to start... (%counter%/12)
    goto :wait_loop
)

echo Warning: Docker may not be fully started yet.
echo You may need to wait a bit longer before debugging.

:end
echo Docker setup complete.