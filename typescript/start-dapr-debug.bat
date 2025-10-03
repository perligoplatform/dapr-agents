@echo off
REM Setup script for Dapr debugging with OpenAI integration
REM This script loads environment from .env file and starts the Dapr sidecar

echo Setting up Dapr environment for debugging...

REM Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found
    echo Please create a .env file from .env.example:
    echo copy .env.example .env
    echo.
    echo Then edit .env and add your OpenAI API key:
    echo OPENAI_API_KEY=sk-your-key-here
    echo.
    pause
    exit /b 1
)

REM Load environment variables from .env file
echo ✅ Loading environment variables from .env file...
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    REM Skip comments and empty lines
    echo %%a | findstr /r "^#" >nul
    if errorlevel 1 (
        echo %%a | findstr /r "^$" >nul
        if errorlevel 1 (
            set "%%a=%%b"
            echo    - Loaded: %%a
        )
    )
)

REM Check if OPENAI_API_KEY is set
if "%OPENAI_API_KEY%"=="" (
    echo ❌ OPENAI_API_KEY is not set in .env file
    echo Please edit .env and add your OpenAI API key:
    echo OPENAI_API_KEY=sk-your-key-here
    echo.
    pause
    exit /b 1
)

if "%OPENAI_API_KEY%"=="your-openai-api-key-here" (
    echo ❌ OPENAI_API_KEY is still set to placeholder value
    echo Please edit .env and add your actual OpenAI API key:
    echo OPENAI_API_KEY=sk-your-actual-key-here
    echo.
    pause
    exit /b 1
)

echo ✅ OPENAI_API_KEY is configured

echo.
echo Starting Dapr sidecar with the following configuration:
echo - App ID: dapr-agents
echo - HTTP Port: 3500
echo - gRPC Port: 50001
echo - Components Path: ./components
echo - Config: ./components/config.yaml
echo.

REM Start Dapr sidecar
dapr run --app-id dapr-agents --dapr-http-port 3500 --dapr-grpc-port 50001 --max-body-size 16Mi --log-level debug --resources-path ./components --config ./components/config.yaml