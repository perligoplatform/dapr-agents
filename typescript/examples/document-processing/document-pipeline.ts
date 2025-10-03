/**
 * Document Processing System Example
 * 
 * This example demonstrates the complete document processing pipeline including:
 * - Fetching documents from ArXiv
 * - Reading text files
 * - Splitting documents into chunks
 * - Generating embeddings
 * 
 * PYTHON EQUIVALENT: Similar to document processing examples in quickstarts/
 */

import {
  // Fetchers
  ArxivFetcher,
  createArxivFetcher,
  type ArxivSearchParams,
  
  // Readers
  TextReader,
  createTextReader,
  
  // Splitters
  TextSplitter,
  createTextSplitter,
  
  // Embedders
  OpenAIEmbedder,
  createOpenAIEmbedder,
  
  // Types
  type Document,
} from '../../src/index.js';

async function demonstrateDocumentProcessing() {
  console.log('=== Document Processing System Demo ===\n');

  // 1. Create document components
  console.log('1. Creating document processing components...');
  
  const arxivFetcher = createArxivFetcher({
    maxResults: 5,
    includeFullMetadata: true,
  });

  const textReader = createTextReader({
    encoding: 'utf-8',
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
  });

  const textSplitter = createTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separator: '\n\n',
  });

  // Note: OpenAI embedder requires API key in real usage
  const openaiEmbedder = createOpenAIEmbedder({
    apiKey: process.env.OPENAI_API_KEY || 'demo-key',
    model: 'text-embedding-ada-002',
    normalize: true,
  });

  console.log('✓ Components created\n');

  // 2. Fetch documents from ArXiv
  console.log('2. Fetching documents from ArXiv...');
  
  try {
    const arxivDocs = await arxivFetcher.fetch('machine learning transformers', {
      maxResults: 3,
      includeSummary: true,
    });

    console.log(`✓ Fetched ${arxivDocs.length} papers from ArXiv`);
    arxivDocs.forEach((doc: Document, i: number) => {
      console.log(`   ${i + 1}. ${doc.metadata?.title || 'Untitled'}`);
    });
    console.log();

    // 3. Process text files
    console.log('3. Processing text content...');
    
    const sampleText = `
# Machine Learning Fundamentals

Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience.

## Types of Machine Learning

### Supervised Learning
In supervised learning, algorithms learn from labeled training data to make predictions or classifications on new, unseen data. Common examples include linear regression, decision trees, and neural networks.

### Unsupervised Learning
Unsupervised learning involves finding patterns in data without labeled examples. Clustering, dimensionality reduction, and association rule learning are common unsupervised techniques.

### Reinforcement Learning
Reinforcement learning is concerned with how agents ought to take actions in an environment to maximize cumulative reward. It's inspired by behavioral psychology and has applications in robotics, game playing, and autonomous systems.

## Applications

Machine learning has numerous applications across various domains including:
- Natural language processing
- Computer vision
- Recommendation systems
- Fraud detection
- Autonomous vehicles
- Medical diagnosis
- Financial trading

The field continues to evolve rapidly with new architectures, algorithms, and applications emerging regularly.
    `.trim();

    // Create a document from the sample text
    const textDoc: Document = {
      text: sampleText,
      metadata: {
        source: 'sample',
        title: 'Machine Learning Fundamentals',
        created_at: new Date().toISOString(),
      },
    };

    console.log('✓ Created sample text document');

    // 4. Split documents into chunks
    console.log('\n4. Splitting documents into chunks...');
    
    const allDocs = [textDoc, ...arxivDocs.slice(0, 1)]; // Include one ArXiv doc
    const allChunks: Document[] = [];

    for (const doc of allDocs) {
      const chunks = await textSplitter.split(doc);
      allChunks.push(...chunks);
    }

    console.log(`✓ Split ${allDocs.length} documents into ${allChunks.length} chunks`);
    allChunks.forEach((chunk, i) => {
      console.log(`   Chunk ${i + 1}: ${chunk.text.substring(0, 100)}...`);
    });

    // 5. Generate embeddings (demo only - would need real API key)
    console.log('\n5. Generating embeddings...');
    
    if (process.env.OPENAI_API_KEY) {
      try {
        const sampleChunk = allChunks[0];
        if (sampleChunk) {
          const embedding = await openaiEmbedder.embed(sampleChunk.text);
          console.log(`✓ Generated embedding with ${embedding.length} dimensions`);
          console.log(`   First 5 values: [${embedding.slice(0, 5).join(', ')}]`);
        }
      } catch (error) {
        console.log(`⚠ Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('⚠ Skipping embedding generation (no OpenAI API key)');
    }

    // 6. Component information
    console.log('\n6. Component Information:');
    console.log(`   ArXiv Fetcher: max ${arxivFetcher.getMaxResults()} results, timeout ${arxivFetcher.getTimeout()}ms`);
    console.log(`   Text Reader: encoding ${textReader.getEncoding()}, max size ${textReader.getMaxFileSize() || 'unlimited'}`);
    console.log(`   Text Splitter: chunk size ${textSplitter.getChunkSize()}, overlap ${textSplitter.getChunkOverlap()}`);
    console.log(`   OpenAI Embedder: model ${openaiEmbedder.getModel()}, normalize ${openaiEmbedder.shouldNormalize()}`);

  } catch (error) {
    console.error('Error during document processing:', error);
  }

  console.log('\n=== Demo Complete ===');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateDocumentProcessing().catch(console.error);
}

export { demonstrateDocumentProcessing };