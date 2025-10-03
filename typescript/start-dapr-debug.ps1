# PowerShell script for Dapr debugging with OpenAI integration
# This script loads environment from .env file and starts the Dapr sidecar

Write-Host "Setting up Dapr environment for debugging..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "Please create a .env file from .env.example:"
    Write-Host "Copy-Item .env.example .env"
    Write-Host ""
    Write-Host "Then edit .env and add your OpenAI API key:"
    Write-Host "OPENAI_API_KEY=sk-your-key-here"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Load environment variables from .env file
Write-Host "✅ Loading environment variables from .env file..." -ForegroundColor Green
Get-Content ".env" | ForEach-Object {
    if ($_ -and $_ -notmatch "^#" -and $_ -match "=") {
        $name, $value = $_.Split("=", 2)
        Set-Item -Path "env:$name" -Value $value
        Write-Host "   - Loaded: $name" -ForegroundColor Gray
    }
}

# Check if OPENAI_API_KEY is set
if (-not $env:OPENAI_API_KEY -or $env:OPENAI_API_KEY -eq "") {
    Write-Host "❌ OPENAI_API_KEY is not set in .env file" -ForegroundColor Red
    Write-Host "Please edit .env and add your OpenAI API key:"
    Write-Host "OPENAI_API_KEY=sk-your-key-here"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

if ($env:OPENAI_API_KEY -eq "your-openai-api-key-here") {
    Write-Host "❌ OPENAI_API_KEY is still set to placeholder value" -ForegroundColor Red
    Write-Host "Please edit .env and add your actual OpenAI API key:"
    Write-Host "OPENAI_API_KEY=sk-your-actual-key-here"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ OPENAI_API_KEY is configured" -ForegroundColor Green

Write-Host ""
Write-Host "Starting Dapr sidecar with the following configuration:" -ForegroundColor Yellow
Write-Host "- App ID: dapr-agents"
Write-Host "- HTTP Port: 3500"
Write-Host "- gRPC Port: 50001"
Write-Host "- Components Path: ./components"
Write-Host "- Config: ./components/config.yaml"
Write-Host ""

# Start Dapr sidecar
& dapr run --app-id dapr-agents --dapr-http-port 3500 --dapr-grpc-port 50001 --max-body-size 16Mi --log-level debug --resources-path ./components --config ./components/config.yaml