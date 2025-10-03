/**
 * Document embedder exports.
 * 
 * This module provides embedders for converting text into vector representations
 * that can be used for semantic search and similarity matching.
 */

export * from './base.js';
export * from './openai.js';

// Re-export commonly used types and functions
export type { EmbedderBaseConfig } from './base.js';
export type { OpenAIEmbedderConfig } from './openai.js';

export { 
  EmbedderBase,
  isEmbedder 
} from './base.js';

export { 
  OpenAIEmbedder,
  createOpenAIEmbedder 
} from './openai.js';