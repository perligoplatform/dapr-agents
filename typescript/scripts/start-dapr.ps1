# Start Dapr script for debugging
param(
    [string]$AppId = "dapr-agents",
    [int]$HttpPort = 3500,
    [int]$GrpcPort = 50001,
    [int]$AppPort = 3000
)

Write-Host "Starting Dapr sidecar for debugging..." -ForegroundColor Green

# Load environment from .env file if it exists
if (Test-Path ".env") {
    Write-Host "Loading environment from .env file..." -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        if ($_ -and $_ -notmatch "^#" -and $_ -match "=") {
            $name, $value = $_.Split("=", 2)
            Set-Item -Path "env:$name" -Value $value
            Write-Host "   Loaded: $name" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "No .env file found" -ForegroundColor Yellow
}

# Check if Dapr is already running
$existing = dapr list --output json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($existing) {
    $running = $existing | Where-Object { $_.appId -eq $AppId }
    if ($running) {
        Write-Host "Dapr app '$AppId' is already running, stopping it first..." -ForegroundColor Yellow
        dapr stop --app-id $AppId
        Start-Sleep -Seconds 2
    }
}

# Start Dapr
Write-Host "Starting Dapr with:" -ForegroundColor Cyan
Write-Host "   App ID: $AppId" -ForegroundColor Gray
Write-Host "   HTTP Port: $HttpPort" -ForegroundColor Gray
Write-Host "   gRPC Port: $GrpcPort" -ForegroundColor Gray
Write-Host "   App Port: $AppPort" -ForegroundColor Gray

$daprArgs = @(
    "run",
    "--app-id", $AppId,
    "--app-port", $AppPort,
    "--dapr-http-port", $HttpPort,
    "--dapr-grpc-port", $GrpcPort,
    "--max-body-size", "16Mi",
    "--log-level", "info",
    "--resources-path", "./components",
    "--config", "./components/config.yaml"
)

try {
    & dapr @daprArgs
} catch {
    Write-Host "Failed to start Dapr: $_" -ForegroundColor Red
    exit 1
}