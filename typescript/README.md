# Dapr Agents TypeScript

TypeScript implementation of the Dapr Agents framework for building production-grade resilient AI agent systems.

## Prerequisites

- Node.js 20.x or higher
- pnpm (recommended package manager)

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