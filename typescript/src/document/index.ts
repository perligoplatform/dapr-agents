/**
 * Document processing system exports.
 * 
 * This module provides a complete document processing pipeline including:
 * - Embedders: Convert text to vector representations
 * - Fetchers: Retrieve documents from various sources
 * - Readers: Process different document formats
 * - Splitters: Break documents into manageable chunks
 * 
 * PYTHON EQUIVALENT: dapr_agents/document/__init__.py
 */

// Export all sub-modules
export * from './embedder/index.js';
export * from './fetcher/index.js';
export * from './reader/index.js';
export * from './splitter/index.js';

// Re-export base classes for convenience
export { EmbedderBase } from './embedder/base.js';
export { FetcherBase } from './fetcher/base.js';
export { ReaderBase } from './reader/base.js';
export { SplitterBase } from './splitter/base.js';

// Re-export concrete implementations
export { OpenAIEmbedder, createOpenAIEmbedder } from './embedder/openai.js';
export { ArxivFetcher, createArxivFetcher } from './fetcher/arxiv.js';
export { TextReader, createTextReader } from './reader/text.js';
export { TextSplitter, createTextSplitter } from './splitter/text.js';

// Re-export common types
export type { Document } from '../types/document.js';
export type { EmbedderBaseConfig } from './embedder/base.js';
export type { FetcherBaseConfig } from './fetcher/base.js';
export type { ReaderBaseConfig } from './reader/base.js';
export type { SplitterBaseConfig } from './splitter/base.js';