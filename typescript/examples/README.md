# TypeScript Dapr Agents Examples

This directory contains TypeScript examples that demonstrate the equivalent functionality of the Python dapr-agents library. These examples show how to use the TypeScript workflow system, orchestrators, and agents.

## 📁 Directory Structure

```
examples/
├── basic-usage/          # Basic client examples
│   └── pubsub-client.ts  # Publishing tasks to orchestrators
├── document-processing/  # Document processing pipeline examples
│   ├── document-pipeline.ts  # Complete document processing demo
│   └── README.md        # Document processing documentation  
├── orchestrators/        # Orchestrator service examples  
│   ├── llm-orchestrator.ts
│   ├── random-orchestrator.ts
│   └── roundrobin-orchestrator.ts
└── workflows/           # Workflow definition examples
    └── sequential-workflow.ts
```

## 🚀 Quick Start

### Prerequisites

1. Install dependencies:
```bash
cd typescript
npm install
```

2. Build the TypeScript project:
```bash
npm run build
```

3. Make sure Dapr is running locally with the required components (pubsub, state store, etc.)

### Running the Examples

#### 1. Orchestrator Services

Start different types of orchestrators:

```bash
# LLM Orchestrator (AI-driven agent selection)
node examples/orchestrators/llm-orchestrator.js

# Random Orchestrator (random agent selection)  
node examples/orchestrators/random-orchestrator.js

# Round Robin Orchestrator (sequential agent selection)
node examples/orchestrators/roundrobin-orchestrator.js
```

#### 2. Publishing Tasks

Send tasks to running orchestrators:

```bash
# Publish to LLM Orchestrator
node examples/basic-usage/pubsub-client.js --orchestrator=LLMOrchestrator

# Publish to Random Orchestrator
node examples/basic-usage/pubsub-client.js --orchestrator=RandomOrchestrator

# Publish to Round Robin Orchestrator  
node examples/basic-usage/pubsub-client.js --orchestrator=RoundRobinOrchestrator
```

#### 3. Workflow Examples

Run standalone workflow examples:

```bash
# Basic sequential workflow
node examples/workflows/sequential-workflow.js --basic

# Extended sequential workflow with analysis
node examples/workflows/sequential-workflow.js --extended
```

## 📚 Examples Overview

### 🧠 LLM Orchestrator Example

**File**: `orchestrators/llm-orchestrator.ts`  
**Python Equivalent**: `quickstarts/05-multi-agent-workflows/services/workflow-llm/app.py`

Demonstrates:
- Creating an LLM-powered orchestrator
- AI-driven task planning and agent selection
- Multi-turn conversation management
- Dynamic workflow adaptation

```typescript
const config: LLMOrchestratorConfig = {
  name: "LLMOrchestrator",
  messageBusName: "messagepubsub",
  stateStoreName: "workflowstatestore",
  maxIterations: 3,
  // ... other configuration
};

const workflowService = new LLMOrchestrator(config);
await workflowService.startRuntime();
```

### 🎲 Random Orchestrator Example

**File**: `orchestrators/random-orchestrator.ts`  
**Python Equivalent**: `quickstarts/05-multi-agent-workflows/services/workflow-random/app.py`

Demonstrates:
- Random agent selection strategy
- Simple orchestration patterns
- Load balancing across agents

### 🔄 Round Robin Orchestrator Example

**File**: `orchestrators/roundrobin-orchestrator.ts`  
**Python Equivalent**: `quickstarts/05-multi-agent-workflows/services/workflow-roundrobin/app.py`

Demonstrates:
- Sequential agent selection
- Fair task distribution
- Stateful orchestration

### 📢 Pub/Sub Client Example

**File**: `basic-usage/pubsub-client.ts`  
**Python Equivalent**: `quickstarts/05-multi-agent-workflows/services/client/pubsub_client.py`

Demonstrates:
- Publishing tasks to orchestrators
- CloudEvent message formatting
- Retry logic and error handling
- Batch task publishing

```typescript
// Simple task publishing
await publishTask('LLMOrchestrator');

// Complex task with metadata
await publishComplexTask('LLMOrchestrator');

// Batch task publishing
await publishBatchTasks('LLMOrchestrator', [
  'Analyze renewable energy trends',
  'Research battery technology',
  'Compare solar vs wind power'
]);
```

### 🔗 Sequential Workflow Example

**File**: `workflows/sequential-workflow.ts`  
**Python Equivalent**: `quickstarts/04-llm-based-workflows/sequential_workflow.py`

Demonstrates:
- Sequential task execution
- LLM-powered workflow tasks
- Task chaining and data flow
- Workflow result handling

```typescript
// Define workflow
async function taskChainWorkflow(ctx: WorkflowContext): Promise<string> {
  const character = await ctx.callActivity('get_character') as unknown as string;
  const famousLine = await ctx.callActivity('get_line', { character }) as unknown as string;
  return famousLine;
}

// Register and run
wfApp.registerWorkflow('task_chain_workflow', taskChainWorkflow);
wfApp.registerTask('get_character', getCharacter);
wfApp.registerTask('get_line', getLine);
```

### 📄 Document Processing Example

**File**: `document-processing/document-pipeline.ts`  
**Python Equivalent**: Document processing examples in `quickstarts/`

Demonstrates:
- Complete document processing pipeline
- Fetching documents from ArXiv
- Text splitting and chunking
- Embedding generation with OpenAI
- Multi-format document reading

```typescript
// Create processing components
const arxivFetcher = createArxivFetcher({
  maxResults: 5,
  includeFullMetadata: true,
});

const textSplitter = createTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separator: '\n\n',
});

const openaiEmbedder = createOpenAIEmbedder({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-ada-002',
});

// Process documents
const papers = await arxivFetcher.fetch('machine learning');
const chunks = await textSplitter.split(papers[0]);
const embeddings = await openaiEmbedder.embed(chunks[0].text);
```

Key features:
- **Fetchers**: ArXiv, web scraping, database queries
- **Readers**: Text, PDF, DOCX, HTML processing  
- **Splitters**: Intelligent text chunking with overlap
- **Embedders**: OpenAI, HuggingFace, local models

## 🔧 Configuration Examples

### Development vs Production

```typescript
// Development configuration
export function createDevelopmentConfig(): LLMOrchestratorConfig {
  return {
    name: "DevLLMOrchestrator",
    messageBusName: "dev-pubsub",
    maxIterations: 2,
    saveStateLocally: true,
    timeout: 60
  };
}

// Production configuration  
export function createProductionConfig(): LLMOrchestratorConfig {
  return {
    name: "ProdLLMOrchestrator", 
    messageBusName: "prod-pubsub",
    maxIterations: 10,
    saveStateLocally: false,
    timeout: 1800
  };
}
```

### Environment-Specific Setup

```typescript
// Load configuration based on environment
const config = process.env.NODE_ENV === 'production' 
  ? createProductionConfig()
  : createDevelopmentConfig();

const orchestrator = new LLMOrchestrator(config);
```

## 🎯 Key TypeScript Patterns

### 1. Type Safety with Zod Schemas

All configurations use Zod schemas for validation:

```typescript
import { z } from 'zod';

const configSchema = z.object({
  name: z.string(),
  maxIterations: z.number().positive(),
  // ...
});

type Config = z.infer<typeof configSchema>;
```

### 2. Factory Functions for Orchestrators

Create orchestrators using factory patterns:

```typescript
export async function createLLMOrchestrator(): Promise<LLMOrchestrator> {
  const config = { /* ... */ };
  return new LLMOrchestrator(config);
}
```

### 3. Async/Await Throughout

All asynchronous operations use modern async/await syntax:

```typescript
async function runWorkflow(): Promise<string> {
  await orchestrator.startRuntime();
  const result = await orchestrator.executeWorkflow('task');
  return result;
}
```

### 4. Error Handling

Comprehensive error handling with typed exceptions:

```typescript
try {
  await orchestrator.startRuntime();
} catch (error) {
  console.error(`❌ Failed to start orchestrator: ${error}`);
  process.exit(1);
}
```

## 🔗 Python Equivalents Mapping

| TypeScript File | Python Equivalent | Description |
|------------------|-------------------|-------------|
| `orchestrators/llm-orchestrator.ts` | `quickstarts/05-multi-agent-workflows/services/workflow-llm/app.py` | LLM orchestrator service |
| `orchestrators/random-orchestrator.ts` | `quickstarts/05-multi-agent-workflows/services/workflow-random/app.py` | Random orchestrator service |
| `orchestrators/roundrobin-orchestrator.ts` | `quickstarts/05-multi-agent-workflows/services/workflow-roundrobin/app.py` | Round robin orchestrator |
| `basic-usage/pubsub-client.ts` | `quickstarts/05-multi-agent-workflows/services/client/pubsub_client.py` | Task publishing client |
| `workflows/sequential-workflow.ts` | `quickstarts/04-llm-based-workflows/sequential_workflow.py` | Sequential workflow example |

## 📖 Next Steps

1. **Explore the source code**: Check `../src/` for the underlying implementation
2. **Read the conversion docs**: See `../WORKFLOW_CONVERSION_SUMMARY.md` for detailed conversion notes
3. **Run the tests**: Execute `npm test` to run the TypeScript test suite
4. **Create custom examples**: Use these examples as templates for your own workflows

## 🤝 Contributing

When adding new examples:

1. Follow the existing patterns and naming conventions
2. Include comprehensive documentation and Python equivalents
3. Add proper error handling and logging
4. Ensure examples compile without errors (`npm run build`)
5. Test examples work with a running Dapr environment

Happy coding! 🚀