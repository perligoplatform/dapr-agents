# Dapr Integration Testing Setup

This guide walks through setting up Dapr for debugging the TypeScript integration tests.

## Prerequisites

1. **Dapr CLI** installed: `dapr init`
2. **OpenAI API Key** available
3. **Node.js** and **TypeScript** environment ready

## Step-by-Step Setup

### 1. Configure API Key

Update the component configuration with your OpenAI API key:

```bash
# Edit components/gpt-35-turbo.yaml
# Replace "your-openai-api-key-here" with your actual OpenAI API key
```

**Or use environment variable:**
```bash
export OPENAI_API_KEY="your-actual-api-key"
```

### 2. Start Dapr Sidecar

Open a terminal and run:

```bash
# Start Dapr with explicit configuration
dapr run \
  --app-id dapr-agents-app \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --dapr-grpc-port 50001 \
  --components-path ./components \
  --log-level debug
```

**Key Parameters:**
- `--app-id dapr-agents-app`: Application identifier
- `--dapr-http-port 3500`: HTTP API port (default)
- `--dapr-grpc-port 50001`: gRPC API port (default)  
- `--components-path ./components`: Load our LLM component
- `--log-level debug`: Verbose logging for debugging

### 3. Verify Dapr Setup

Run the setup verification script:

```bash
npx tsx setup-dapr.ts
```

This will:
- ✅ Check if Dapr HTTP endpoint is available
- ✅ List available components
- ✅ Test the conversation API directly
- ✅ Provide debugging guidance

### 4. Debug Integration Tests

#### Option A: Debug via VS Code

1. Open VS Code in the `typescript` directory
2. Set breakpoints in the test file or implementation
3. Go to **Run and Debug** (Ctrl+Shift+D)
4. Select **"Debug Dapr Integration Test"**
5. Press **F5** to start debugging

#### Option B: Debug the Standalone Script

1. Set breakpoints in `debug-dapr.ts`
2. Select **"Debug Dapr Script"** in VS Code
3. Press **F5** to start debugging

#### Option C: Debug the Setup Script

1. Set breakpoints in `setup-dapr.ts`
2. Select **"Debug Dapr Setup"** in VS Code  
3. Press **F5** to start debugging

## Protocol Configuration

The DaprClient is configured to use:
- **Protocol**: HTTP (explicit)
- **Host**: localhost
- **Port**: 3500
- **Endpoint**: `http://localhost:3500`

## Debugging Flow

### 1. Client Initialization
```typescript
// Set breakpoint here to inspect client creation
const client = new DaprChatClient({
  componentName: 'gpt-35-turbo',
  // ... other config
});
```

### 2. Generate Call
```typescript
// Set breakpoint here to step into the call
const response = await client.generate(messages);
```

### 3. Dapr API Call
```typescript
// In callDaprConversationAPI() - the actual Dapr call
const response = await this._daprClient.invoker.invoke(
  this._llmComponent!,  // 'gpt-35-turbo'
  'converse',           // API method
  'POST',               // HTTP method
  requestPayload        // Message data
);
```

## Common Issues & Solutions

### ❌ "Connection refused" or "ECONNREFUSED"
- **Cause**: Dapr sidecar not running
- **Solution**: Start Dapr with the command above

### ❌ "Component not found"  
- **Cause**: Component not loaded or misconfigured
- **Solution**: Check `--components-path` and YAML syntax

### ❌ "API key invalid"
- **Cause**: OpenAI API key not set or incorrect
- **Solution**: Verify API key in component or environment

### ❌ "Conversation API not found"
- **Cause**: LLM component doesn't support conversation API
- **Solution**: Verify component type and Dapr version

## Testing Endpoints

### Health Check
```bash
curl http://localhost:3500/v1.0/healthz
```

### Component Metadata  
```bash
curl http://localhost:3500/v1.0/metadata
```

### Direct Conversation API Test
```bash
curl -X POST http://localhost:3500/v1.0/invoke/gpt-35-turbo/method/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "role": "user", 
        "content": "Hello, this is a test."
      }
    ],
    "temperature": 0.7
  }'
```

## Debug Session Tips

1. **Set multiple breakpoints** at key points:
   - Client initialization
   - Message conversion
   - Dapr API call
   - Response processing

2. **Inspect variables**:
   - `apiParams` - Request parameters
   - `response` - Raw Dapr response
   - `llmResponse` - Converted response

3. **Watch expressions**:
   - `this._daprClient` - Dapr client instance
   - `this._llmComponent` - Component name
   - `messages` - Input messages

4. **Step through execution**:
   - F10: Step over
   - F11: Step into
   - F5: Continue

## Success Indicators

When everything is working:
- ✅ Dapr sidecar logs show component loaded
- ✅ Setup script reports all checks passed
- ✅ Integration test makes successful API call  
- ✅ Response contains valid assistant message
- ✅ No connection or authentication errors