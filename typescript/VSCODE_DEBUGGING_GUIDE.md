# VS Code Debugging Guide for Dapr Agents

This guide shows you how to debug your Dapr Agents project using VS Code's integrated debugger instead of external scripts.

## 🚀 Quick Start

1. **Ensure your `.env` file is configured**:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

2. **Start debugging**:
   - Press `F5` or go to `Run and Debug` panel
   - Select one of the available configurations
   - Set breakpoints in your code
   - Debug with full VS Code features!

## 🎯 Available Debug Configurations

### 1. **Debug Dapr Integration Test**
- **Purpose**: Debug the main integration test with OpenAI
- **File**: `src/llm/dapr/__tests__/daprChatClient.integration.test.ts`
- **Features**: 
  - Automatically starts Dapr sidecar
  - Loads `.env` configuration
  - Stops Dapr when debugging ends
  - Full test debugging with breakpoints

### 2. **Debug Dapr Chat Client**
- **Purpose**: Debug the chat client implementation
- **File**: `debug-dapr.ts`
- **Features**:
  - Direct debugging of Dapr chat functionality
  - Environment loaded from `.env`
  - Automatic Dapr lifecycle management

### 3. **Debug Dapr Connection Test**
- **Purpose**: Debug basic Dapr connectivity
- **File**: `test-dapr-connection.ts`
- **Features**:
  - Test Dapr HTTP/gRPC endpoints
  - Validate component loading
  - Check environment configuration

### 4. **Debug Dapr Setup Verification**
- **Purpose**: Debug Dapr setup and configuration
- **File**: `setup-dapr.ts`
- **Features**:
  - Verify Dapr installation
  - Check component configuration
  - Validate environment setup

### 5. **Debug Full Dapr Integration** (Compound)
- **Purpose**: Debug multiple configurations simultaneously
- **Features**:
  - Runs connection test and integration test together
  - Useful for comprehensive debugging sessions

## 🔧 How It Works

### Automatic Environment Loading
All debug configurations include:
```json
"envFile": "${workspaceFolder}/.env"
```
This automatically loads your API keys and configuration from the `.env` file.

### Automatic Dapr Lifecycle
Each configuration includes:
```json
"preLaunchTask": "daprd-start-agents",    // Starts Dapr before debugging
"postDebugTask": "daprd-stop-agents"      // Stops Dapr after debugging
```

### Smart Debugging Features
- **Source Maps**: Full TypeScript debugging support
- **Smart Step**: Skips over generated code
- **Skip Files**: Ignores node_modules for cleaner debugging
- **Integrated Terminal**: All output in VS Code

## 🎯 Setting Breakpoints

### In Integration Tests
```typescript
// Set breakpoints on these lines in the integration test:
const config = client.getConfig();        // Line 56: Inspect config
const response = await client.generate(messages);  // Line 59: Step into API call
expect(response).toBeDefined();           // Line 62: Inspect response
```

### In Chat Client Code
```typescript
// Set breakpoints in DaprChatClient:
public async generate(messages: BaseMessage[]) {
    // Breakpoint here to inspect input
    const daprMessages = this.convertMessagesToDaprFormat(messages);
    // Breakpoint here to see converted messages
    const response = await this.chatCompletionAlpha2(apiParams);
    // Breakpoint here to inspect Dapr response
    return this.convertResponseToLLMChatResponse(response);
}
```

## 🐛 Debugging Tips

### 1. **Environment Issues**
If debugging fails with environment errors:
- Check your `.env` file exists and has correct values
- Verify `OPENAI_API_KEY` is set properly
- Look at the integrated terminal for environment loading messages

### 2. **Dapr Connection Issues**
If Dapr fails to start:
- Check if port 3500/50001 are available
- Look at Dapr logs in the integrated terminal
- Ensure Dapr CLI is installed: `dapr --version`

### 3. **Test Debugging**
For integration test debugging:
- Use "Debug Dapr Integration Test" configuration
- Set breakpoints before starting
- Use the Debug Console to inspect variables
- Step through the code with F10/F11

### 4. **Multiple Debug Sessions**
To debug multiple things at once:
- Use "Debug Full Dapr Integration" compound configuration
- Or start multiple debug sessions manually
- Each gets its own terminal

## 📝 Debug Console Commands

While debugging, you can use the Debug Console to:
```javascript
// Inspect variables
client.getConfig()
process.env.OPENAI_API_KEY
messages
response

// Call methods
client.isStructuredModeSupported('json')
await client.validateComponent()
```

## 🔄 Workflow

1. **Set breakpoints** in your code
2. **Press F5** or select debug configuration
3. **Dapr starts automatically** (watch terminal output)
4. **Code executes** and stops at breakpoints
5. **Debug interactively** using VS Code features
6. **Dapr stops automatically** when debugging ends

## 🎉 Benefits Over Script Debugging

- ✅ **Visual debugging** with breakpoints and variable inspection
- ✅ **Integrated terminal** with all output in one place
- ✅ **Source maps** for TypeScript debugging
- ✅ **Environment loading** handled automatically
- ✅ **Dapr lifecycle** managed by VS Code
- ✅ **No external scripts** needed
- ✅ **Full IDE integration** with IntelliSense and error highlighting

Ready to debug! Just press F5 and start stepping through your Dapr integration code! 🚀