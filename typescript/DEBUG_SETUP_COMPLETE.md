# Dapr VS Code Debugging Setup - Complete

## What We've Built

Based on the official Dapr VS Code debugging documentation, we've created a comprehensive debugging setup that allows you to step through Dapr integration code with proper breakpoints and inspection.

## Key Files Created/Updated

### 🔧 VS Code Configuration

#### `.vscode/launch.json`
- **Debug Dapr Integration Test**: Runs Vitest with Dapr sidecar management
- **Debug Dapr Chat Client**: Runs standalone debug script with Dapr sidecar
- **Debug Dapr Setup Verification**: Environment verification without Dapr management

Each configuration includes:
- Automatic Dapr sidecar lifecycle management (start/stop)
- Proper TypeScript debugging with `npx tsx`
- Environment variables for Dapr ports
- Source map support for breakpoint accuracy

#### `.vscode/tasks.json`
- **daprd-start-agents**: Starts Dapr sidecar with proper configuration
  - App ID: `dapr-agents`
  - HTTP Port: 3500, gRPC Port: 50001
  - Components path: `./components`
  - Background task with proper problem matcher
- **daprd-stop-agents**: Cleanly stops Dapr sidecar
- **Additional tasks**: `dapr-list`, `dapr-dashboard`, `check-dapr-status`

### 🛠️ Debugging Tools

#### `debug-helper.ts`
Comprehensive debugging utility with commands:
- `verify`: Check Dapr installation and debug setup
- `test`: Test Dapr integration functionality  
- `cleanup`: Stop all Dapr instances

#### `DEBUGGING.md`
Complete documentation covering:
- Prerequisites and setup
- Debug configuration explanations
- Step-by-step debugging workflow
- Troubleshooting guide
- Manual Dapr management options

## How It Works

### Automatic Dapr Lifecycle Management

1. **Pre-Launch Task**: `daprd-start-agents`
   - Starts Dapr sidecar before debugging begins
   - Waits for "dapr initialized" message
   - Loads components from `./components` directory

2. **Debug Session**: Your code runs with debugger attached
   - Set breakpoints in `DaprChatClient.generate()`
   - Inspect `this.invoker.invoke()` calls
   - Step through real Dapr SDK integration

3. **Post-Debug Task**: `daprd-stop-agents`
   - Cleanly stops Dapr sidecar when debugging ends
   - Ensures proper cleanup

### Key Debugging Points

**In `DaprChatClient.generate()` method:**
```typescript
// Set breakpoints here to inspect:
const response = await this.invoker.invoke(
  'llm',                    // ← Component name
  'chatCompletion',         // ← Operation  
  normalizedMessages        // ← Request payload
);
```

**In integration tests:**
```typescript
// Set breakpoints to verify real vs mock calls:
const client = new DaprChatClient(realDaprInvoker);
const result = await client.generate(messages); // ← Real Dapr call
```

## Quick Start Guide

1. **Open VS Code** in the TypeScript directory
2. **Set breakpoints** in `src/llm/dapr/daprChatClient.ts` at key points:
   - Line with `this.invoker.invoke()`
   - Error handling blocks
   - Response processing
3. **Press F5** and select **"Debug Dapr Chat Client"**
4. **Step through** the code to see real Dapr integration
5. **Inspect variables** in the Variables panel
6. **Watch** request/response payloads

## Verification

Run the debug helper to verify everything is working:
```bash
npx tsx debug-helper.ts verify
```

This will:
- ✅ Check Dapr CLI installation
- ✅ List running Dapr instances  
- ✅ Test HTTP endpoint connectivity
- ✅ Show debug configuration summary

## What's Different from Before

### ❌ Previous Approach (Console Logging)
- Added `console.log` statements everywhere
- Had to manually start/stop Dapr
- No step-through debugging capability
- Hard to inspect complex objects

### ✅ New Approach (VS Code Debugging)
- **Real breakpoints** with step-through capability
- **Automatic Dapr management** via tasks
- **Full variable inspection** in VS Code panels
- **Proper TypeScript debugging** with source maps
- **Call stack navigation** to understand execution flow

## Ready to Debug!

Your Dapr debugging setup is now complete and ready to use. You can:

1. **Debug real Dapr integration** instead of mocks
2. **Step through code** line by line
3. **Inspect request/response payloads** in detail
4. **Understand the full execution flow** from your code to Dapr to external services

The setup follows official Dapr debugging best practices and provides a professional debugging experience for complex distributed applications.