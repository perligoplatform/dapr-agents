/**
 * Document fetcher exports.
 * 
 * This module provides fetchers for retrieving documents from various sources
 * such as ArXiv, APIs, databases, and file systems.
 */

export * from './base.js';
export * from './arxiv.js';

// Re-export commonly used types and functions
export type { FetcherBaseConfig } from './base.js';
export type { ArxivFetcherConfig, ArxivSearchParams } from './arxiv.js';

export { 
  FetcherBase,
  isFetcher 
} from './base.js';

export { 
  ArxivFetcher,
  createArxivFetcher 
} from './arxiv.js';