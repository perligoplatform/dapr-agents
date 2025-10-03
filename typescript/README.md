# Dapr Agents TypeScript

TypeScript implementation of the Dapr Agents framework for building production-grade resilient AI agent systems.

## 📚 Documentation

For comprehensive guides and architecture documentation, see:
- **[Complete Documentation](./docs/README.md)** - Main documentation index
- **[Dapr Configuration Guide](./docs/architecture/dapr-configuration-guide.md)** - Detailed system architecture and setup
- **[Pub/Sub Configuration](./PUBSUB_GUIDE.md)** - Dynamic pub/sub backend switching

## Prerequisites

- Node.js 20.x or higher
- pnpm (recommended package manager)
- Dapr CLI and runtime
- OpenAI API key (for LLM integration testing)

## Quick Start

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage
```

## Debugging with Dapr Integration

### Setup Environment

1. **Create .env file**: Copy the environment template and configure your API keys
   ```bash
   copy .env.example .env
   # Edit .env with your actual API key
   ```

2. **Configure API Keys in .env**:
   ```env
   # Required for Dapr LLM component testing
   OPENAI_API_KEY=sk-your-actual-api-key-here
   
   # Optional Dapr configuration
   DAPR_HTTP_PORT=3500
   DAPR_GRPC_PORT=50001
   DAPR_LOG_LEVEL=debug
   ```

   > **Note**: The `.env` file is automatically loaded by the application and tests. No need to set environment variables manually.

### Start Debugging with VS Code (Recommended)

**Option 1: VS Code Debugger** 🎯 **Recommended**
1. Open the project in VS Code
2. Set breakpoints in your code
3. Press `F5` or go to `Run and Debug` panel
4. Select debug configuration:
   - **Debug Dapr Integration Test** - Main integration testing
   - **Debug Dapr Connection Test** - Basic connectivity testing
   - **Debug Dapr Chat Client** - Chat client debugging
   - **Debug Full Dapr Integration** - Comprehensive debugging

**Features**:
- ✅ Automatic `.env` file loading
- ✅ Automatic Dapr sidecar management
- ✅ Visual debugging with breakpoints
- ✅ Integrated terminal output
- ✅ TypeScript source map support

> 📖 **See [VSCODE_DEBUGGING_GUIDE.md](./VSCODE_DEBUGGING_GUIDE.md) for detailed VS Code debugging instructions**

**Option 2: Use Helper Scripts**
```bash
# Windows Command Prompt
start-dapr-debug.bat

# Windows PowerShell
.\start-dapr-debug.ps1

# These scripts automatically load .env file and validate configuration
```

### Run Integration Tests

With Dapr sidecar running:
```bash
# Run specific integration test
pnpm test src/llm/dapr/__tests__/daprChatClient.integration.test.ts

# Or run all tests
pnpm test
```

### Common Debugging Issues Fixed

1. **Fixed**: `--dapr-http-max-request-size` flag error → Updated to `--max-body-size`
2. **Fixed**: Missing `config.yaml` → Created with conversation API enabled
3. **Fixed**: Component type mismatch → Updated to `conversation.openai`
4. **Fixed**: Environment configuration → Uses `.env` file with automatic loading

### Dapr Endpoints (when running)

- **HTTP API**: http://localhost:3500
- **gRPC API**: localhost:50001
- **Dashboard**: Run `dapr dashboard` (separate command)

## Development

```bash
# Watch mode for building
pnpm build:watch

# Watch mode for testing
pnpm test

# Lint and format
pnpm lint
pnpm format
```

## Project Structure

```
src/
├── types/          # Core type definitions
├── agents/         # Agent implementations
├── workflow/       # Workflow engine
├── llm/           # LLM client integrations
├── storage/       # Storage abstractions
├── memory/        # Memory systems
├── tool/          # Tool management
├── executors/     # Code execution
└── utils/         # Utilities
```

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details.