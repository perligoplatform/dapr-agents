# Document Processing System

The document processing system provides a complete pipeline for handling documents including fetching, reading, splitting, and embedding. This is the TypeScript equivalent of the Python `dapr_agents.document` module.

## Overview

The document processing system consists of four main components:

1. **Fetchers** - Retrieve documents from various sources
2. **Readers** - Process different document formats
3. **Splitters** - Break documents into manageable chunks
4. **Embedders** - Convert text into vector representations

## Components

### Fetchers

Fetchers retrieve documents from external sources:

- **ArxivFetcher** - Fetches academic papers from arXiv.org
- **FetcherBase** - Abstract base class for implementing custom fetchers

```typescript
import { createArxivFetcher } from '@dapr/agents';

const fetcher = createArxivFetcher({
  maxResults: 10,
  includeFullMetadata: true,
});

const papers = await fetcher.fetch('machine learning');
```

### Readers

Readers process files and convert them into Document objects:

- **TextReader** - Reads plain text files and various text formats
- **ReaderBase** - Abstract base class for implementing custom readers

```typescript
import { createTextReader } from '@dapr/agents';

const reader = createTextReader({
  encoding: 'utf-8',
  maxFileSize: 10 * 1024 * 1024, // 10MB
});

const documents = await reader.read('path/to/file.txt');
```

### Splitters

Splitters break large documents into smaller chunks:

- **TextSplitter** - Splits text using hierarchical strategies
- **SplitterBase** - Abstract base class for implementing custom splitters

```typescript
import { createTextSplitter } from '@dapr/agents';

const splitter = createTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separator: '\n\n',
});

const chunks = await splitter.split(document);
```

### Embedders

Embedders convert text into vector representations:

- **OpenAIEmbedder** - Uses OpenAI's embedding models
- **EmbedderBase** - Abstract base class for implementing custom embedders

```typescript
import { createOpenAIEmbedder } from '@dapr/agents';

const embedder = createOpenAIEmbedder({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-ada-002',
});

const embedding = await embedder.embed('Hello, world!');
```

## Complete Pipeline Example

Here's a complete example of processing documents:

```typescript
import {
  createArxivFetcher,
  createTextSplitter,
  createOpenAIEmbedder,
  type Document,
} from '@dapr/agents';

async function processDocuments() {
  // 1. Fetch documents
  const fetcher = createArxivFetcher({ maxResults: 5 });
  const papers = await fetcher.fetch('neural networks');

  // 2. Split into chunks
  const splitter = createTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const allChunks: Document[] = [];
  for (const paper of papers) {
    const chunks = await splitter.split(paper);
    allChunks.push(...chunks);
  }

  // 3. Generate embeddings
  const embedder = createOpenAIEmbedder({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  const embeddings = await embedder.embedBatch(
    allChunks.map(chunk => chunk.text)
  );

  console.log(`Processed ${papers.length} papers into ${allChunks.length} chunks`);
  console.log(`Generated ${embeddings.length} embeddings`);
}
```

## Configuration

Each component accepts configuration options:

### ArxivFetcher Configuration

```typescript
interface ArxivFetcherConfig {
  maxResults?: number;           // Maximum results per query (default: 10)
  timeout?: number;             // Request timeout in ms (default: 10000)
  includeFullMetadata?: boolean; // Include all metadata (default: false)
  baseUrl?: string;             // ArXiv API base URL
}
```

### TextReader Configuration

```typescript
interface TextReaderConfig {
  encoding?: string;            // Text encoding (default: 'utf-8')
  maxFileSize?: number;        // Maximum file size in bytes
  preserveFormatting?: boolean; // Preserve original formatting (default: false)
}
```

### TextSplitter Configuration

```typescript
interface TextSplitterConfig {
  chunkSize?: number;          // Maximum chunk size (default: 1000)
  chunkOverlap?: number;       // Overlap between chunks (default: 200)
  separator?: string;          // Primary separator (default: '\n\n')
  keepSeparator?: boolean;     // Keep separators (default: false)
  fallbackSeparators?: string[]; // Fallback separators
  fallbackRegex?: string;      // Regex for fallback splitting
  reservedMetadataSize?: number; // Space for metadata (default: 0)
}
```

### OpenAIEmbedder Configuration

```typescript
interface OpenAIEmbedderConfig {
  apiKey: string;              // OpenAI API key (required)
  model?: string;              // Embedding model (default: 'text-embedding-ada-002')
  maxTokens?: number;          // Max tokens per input (default: 8191)
  chunkSize?: number;          // Batch size (default: 1000)
  normalize?: boolean;         // Normalize embeddings (default: true)
  encodingName?: string;       // Token encoding name
}
```

## Error Handling

All components include proper error handling:

```typescript
try {
  const papers = await fetcher.fetch('query');
} catch (error) {
  console.error('Fetch failed:', error.message);
}
```

## Extending the System

You can create custom components by extending the base classes:

```typescript
import { FetcherBase, type FetcherBaseConfig } from '@dapr/agents';

class CustomFetcher extends FetcherBase {
  async fetch(query: string): Promise<Document[]> {
    // Implement custom fetching logic
    return [];
  }
}
```

## Python Equivalence

This TypeScript implementation provides the same functionality as the Python version:

| Python | TypeScript |
|--------|------------|
| `dapr_agents.document.embedder.openai.OpenAIEmbedder` | `OpenAIEmbedder` |
| `dapr_agents.document.fetcher.arxiv.ArxivFetcher` | `ArxivFetcher` |
| `dapr_agents.document.reader.text.TextLoader` | `TextReader` |
| `dapr_agents.document.splitter.text.TextSplitter` | `TextSplitter` |

## Running the Examples

See the `examples/document-processing/` directory for complete working examples:

```bash
cd examples/document-processing
npm run dev document-pipeline.ts
```

## Next Steps

- Add more readers (PDF, DOCX, etc.)
- Implement additional embedders (HuggingFace, local models)
- Add more fetchers (GitHub, Wikipedia, etc.)
- Implement vector store integration
- Add document preprocessing utilities