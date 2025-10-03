@echo off
echo Starting Dapr sidecar for debugging...

REM Load environment variables from .env file
echo Loading environment from .env file...
if exist .env (
    for /f "eol=# tokens=1,* delims==" %%a in (.env) do (
        if "%%b" neq "" (
            set "%%a=%%b"
            echo    Loaded: %%a
        )
    )
) else (
    echo WARNING: .env file not found!
)

echo.

REM Check if Dapr is already running
dapr list | findstr "dapr-agents" >nul
if %errorlevel% == 0 (
    echo Dapr agent 'dapr-agents' is already running. Stopping it first...
    dapr stop --app-id dapr-agents
    timeout /t 2 /nobreak >nul
)

echo Starting Dapr with:
echo    App ID: dapr-agents
echo    HTTP Port: 3500
echo    gRPC Port: 50001
echo    No App Port (standalone mode)
echo.
start /B dapr run --app-id dapr-agents --dapr-http-port 3500 --dapr-grpc-port 50001 --max-body-size 16Mi --log-level info --resources-path ./components --config ./components/config.yaml

REM Wait for Dapr to be ready
echo Waiting for Dapr to start...
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://localhost:3500/v1.0/healthz >nul 2>&1
if %errorlevel% == 0 (
    echo Dapr is ready!
    goto :end
)
echo Still waiting for Dapr...
goto :wait_loop

:end
echo Dapr startup complete.