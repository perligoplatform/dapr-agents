# Dapr Debugging Guide

This guide explains how to debug Dapr integration using VS Code with proper step-through debugging.

## Prerequisites

1. Ensure Dapr CLI is installed and initialized
2. Make sure the workspace has the required components configured
3. Verify that tsx is available for TypeScript execution

## Debug Configurations Available

### 1. Debug Dapr Integration Test
- **Purpose**: Debug the Vitest integration test with breakpoints
- **Dapr Management**: Automatically starts/stops Dapr sidecar via tasks
- **Environment**: Test environment with DAPR_HTTP_PORT=3500
- **Usage**: Set breakpoints in `daprChatClient.integration.test.ts` and run this configuration

### 2. Debug Dapr Chat Client
- **Purpose**: Debug the standalone chat client script
- **Dapr Management**: Automatically starts/stops Dapr sidecar via tasks
- **Environment**: Development environment
- **Usage**: Set breakpoints in `debug-dapr.ts` or the DaprChatClient and run this configuration

### 3. Debug Dapr Setup Verification
- **Purpose**: Debug the Dapr setup verification script
- **Dapr Management**: No automatic Dapr management (checks existing setup)
- **Usage**: Set breakpoints in `setup-dapr.ts` to debug environment verification

## Pre/Post Launch Tasks

The debug configurations use VS Code tasks to manage the Dapr sidecar lifecycle:

### Pre-Launch Task: `daprd-start-agents`
- Starts Dapr sidecar with app-id: `dapr-agents`
- HTTP port: 3500, gRPC port: 50001
- Loads components from `./components` directory
- Runs in background and waits for "dapr initialized" message

### Post-Debug Task: `daprd-stop-agents`
- Cleanly stops the Dapr sidecar
- Ensures proper cleanup after debugging session

## Additional Tasks

### `dapr-list`
- Lists all running Dapr applications
- Useful for checking if sidecar is running

### `dapr-dashboard`
- Starts Dapr dashboard for visual monitoring
- Access at http://localhost:8080

### `check-dapr-status`
- Runs the setup verification script
- Checks Dapr health and component availability

## Debugging Workflow

1. **Set Breakpoints**: Place breakpoints in your TypeScript code where you want to inspect execution
   
2. **Choose Debug Configuration**: 
   - For testing: "Debug Dapr Integration Test"
   - For script debugging: "Debug Dapr Chat Client"
   
3. **Start Debugging**: Press F5 or click the debug button
   - Dapr sidecar will start automatically (pre-launch task)
   - Your application will start with debugger attached
   - Execution will pause at breakpoints
   
4. **Debug**: Use standard VS Code debugging features:
   - Step through code (F10, F11)
   - Inspect variables in the Variables panel
   - Watch expressions
   - Call stack navigation
   
5. **Finish**: When you stop debugging, Dapr sidecar will stop automatically (post-debug task)

## Key Debugging Points

### DaprChatClient.generate()
Set breakpoints to inspect:
- `this.invoker.invoke()` calls
- Request/response payloads
- Error handling paths
- HTTP client behavior

### Integration Test
Set breakpoints to inspect:
- Test setup and teardown
- Mock vs real Dapr calls
- Response validation
- Error scenarios

## Troubleshooting

### Dapr Sidecar Issues
- Check if Dapr CLI is installed: `dapr version`
- Verify initialization: `dapr init --verify`
- Check running instances: `dapr list`

### Port Conflicts
- Default HTTP port: 3500
- Default gRPC port: 50001
- Change ports in both tasks.json and debug configurations if needed

### Component Loading
- Verify `./components` directory exists
- Check component YAML files are valid
- Ensure required secrets/configurations are available

### Debugging Not Stopping at Breakpoints
- Verify source maps are enabled (`"sourceMaps": true`)
- Check that TypeScript files are being transpiled correctly
- Ensure `--inspect-brk` is in runtimeArgs

## Environment Variables

The debug configurations set these environment variables:
- `NODE_ENV`: "test" or "development"
- `DAPR_HTTP_PORT`: "3500"
- `DAPR_GRPC_PORT`: "50001"

These can be modified in the launch.json configurations as needed.

## Manual Dapr Management

If you prefer to manage Dapr manually:
1. Remove `preLaunchTask` and `postDebugTask` from launch configurations
2. Start Dapr manually: `dapr run --app-id dapr-agents --app-port 3000 --dapr-http-port 3500 --components-path ./components`
3. Run debug configuration
4. Stop Dapr manually: `dapr stop --app-id dapr-agents`