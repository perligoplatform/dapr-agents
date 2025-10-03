/**
 * Base embedder class for generating vector embeddings from text.
 * 
 * PYTHON EQUIVALENT: dapr_agents/document/embedder/base.py
 * 
 * Provides the abstract interface for all embedder implementations including
 * OpenAI, NVIDIA, and Sentence Transformer embedders.
 */

import { z } from 'zod';

/**
 * Configuration schema for embedder base class
 */
export const EmbedderBaseConfigSchema = z.object({
  model: z.string().optional().describe('The embedding model to use'),
  dimensions: z.number().optional().describe('The dimensions of the embedding vectors'),
});

export type EmbedderBaseConfig = z.infer<typeof EmbedderBaseConfigSchema>;

/**
 * Abstract base class for embedders.
 * 
 * Embedders convert text into vector representations that can be used for
 * semantic search, similarity matching, and other ML tasks.
 * 
 * PYTHON EQUIVALENT: EmbedderBase class in base.py
 */
export abstract class EmbedderBase {
  protected config: EmbedderBaseConfig;

  constructor(config: EmbedderBaseConfig = {}) {
    this.config = EmbedderBaseConfigSchema.parse(config);
  }

  /**
   * Generate embeddings for the given text.
   * 
   * PYTHON EQUIVALENT: embed method in EmbedderBase
   * 
   * @param query The text to embed
   * @param kwargs Additional parameters for embedding
   * @returns Promise resolving to array of embedding vectors
   */
  abstract embed(query: string, kwargs?: Record<string, any>): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts in batch.
   * 
   * @param queries Array of texts to embed
   * @param kwargs Additional parameters for embedding
   * @returns Promise resolving to array of embedding vectors for each text
   */
  async embedBatch(queries: string[], kwargs?: Record<string, any>): Promise<number[][]> {
    // Default implementation - can be overridden for more efficient batch processing
    const embeddings = await Promise.all(
      queries.map(query => this.embed(query, kwargs))
    );
    return embeddings;
  }

  /**
   * Get the configuration for this embedder.
   */
  getConfig(): EmbedderBaseConfig {
    return { ...this.config };
  }

  /**
   * Get the model name being used.
   */
  getModel(): string | undefined {
    return this.config.model;
  }

  /**
   * Get the embedding dimensions.
   */
  getDimensions(): number | undefined {
    return this.config.dimensions;
  }
}

/**
 * Type guard to check if an object is an embedder
 */
export function isEmbedder(obj: any): obj is EmbedderBase {
  return obj instanceof EmbedderBase;
}