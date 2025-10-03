/**
 * Base fetcher class for retrieving documents from various sources.
 * 
 * PYTHON EQUIVALENT: dapr_agents/document/fetcher/base.py
 * 
 * Provides the abstract interface for all fetcher implementations including
 * ArXiv fetcher and other document source fetchers.
 */

import { z } from 'zod';
import { Document } from '../../types/document.js';

/**
 * Configuration schema for fetcher base class
 */
export const FetcherBaseConfigSchema = z.object({
  maxResults: z.number().optional().describe('Maximum number of results to fetch'),
  timeout: z.number().optional().describe('Timeout in milliseconds for fetch operations'),
});

export type FetcherBaseConfig = z.infer<typeof FetcherBaseConfigSchema>;

/**
 * Abstract base class for document fetchers.
 * 
 * Fetchers retrieve documents from various sources such as APIs, databases,
 * file systems, or web services.
 * 
 * PYTHON EQUIVALENT: FetcherBase class in base.py
 */
export abstract class FetcherBase {
  protected config: FetcherBaseConfig;

  constructor(config: FetcherBaseConfig = {}) {
    this.config = FetcherBaseConfigSchema.parse(config);
  }

  /**
   * Fetch documents based on the given query.
   * 
   * PYTHON EQUIVALENT: fetch method in FetcherBase
   * 
   * @param query The search query or identifier
   * @param kwargs Additional parameters for fetching
   * @returns Promise resolving to array of documents
   */
  abstract fetch(query: string, kwargs?: Record<string, any>): Promise<Document[]>;

  /**
   * Fetch a single document by its identifier.
   * 
   * @param id The document identifier
   * @param kwargs Additional parameters for fetching
   * @returns Promise resolving to a single document or null if not found
   */
  async fetchById(id: string, kwargs?: Record<string, any>): Promise<Document | null> {
    const documents = await this.fetch(id, kwargs);
    return documents.length > 0 ? documents[0]! : null;
  }

  /**
   * Check if the fetcher can handle the given query or source.
   * 
   * @param query The query or source identifier
   * @returns Promise resolving to boolean indicating if query can be handled
   */
  async canHandle(query: string): Promise<boolean> {
    return true; // Default implementation - override for specific validation
  }

  /**
   * Get the configuration for this fetcher.
   */
  getConfig(): FetcherBaseConfig {
    return { ...this.config };
  }

  /**
   * Get the maximum number of results this fetcher will return.
   */
  getMaxResults(): number | undefined {
    return this.config.maxResults;
  }

  /**
   * Get the timeout for fetch operations.
   */
  getTimeout(): number | undefined {
    return this.config.timeout;
  }
}

/**
 * Type guard to check if an object is a fetcher
 */
export function isFetcher(obj: any): obj is FetcherBase {
  return obj instanceof FetcherBase;
}