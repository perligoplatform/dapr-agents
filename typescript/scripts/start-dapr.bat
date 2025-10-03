@echo off
REM Start Dapr script for debugging

echo 🚀 Starting Dapr sidecar for debugging...

REM Load environment from .env file if it exists
if exist ".env" (
    echo 📁 Loading environment from .env file...
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        REM Skip comments and empty lines
        echo %%a | findstr /r "^#" >nul
        if errorlevel 1 (
            echo %%a | findstr /r "^$" >nul
            if errorlevel 1 (
                set "%%a=%%b"
                echo    ✅ Loaded: %%a
            )
        )
    )
) else (
    echo ⚠️  No .env file found
)

REM Check if Dapr is already running and stop it
echo 🔄 Checking for existing Dapr processes...
dapr stop --app-id dapr-agents >nul 2>&1

REM Start Dapr
echo 🔄 Starting Dapr with:
echo    App ID: dapr-agents
echo    HTTP Port: 3500
echo    gRPC Port: 50001
echo    App Port: 3000

dapr run --app-id dapr-agents --app-port 3000 --dapr-http-port 3500 --dapr-grpc-port 50001 --max-body-size 16Mi --log-level info --resources-path ./components --config ./components/config.yaml