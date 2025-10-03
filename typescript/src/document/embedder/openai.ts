/**
 * OpenAI-based embedder for generating text embeddings.
 * 
 * PYTHON EQUIVALENT: dapr_agents/document/embedder/openai.py
 * 
 * Provides embedding functionality using OpenAI's embedding models with
 * support for chunking long texts and batch processing.
 */

import { z } from 'zod';
import { EmbedderBase, EmbedderBaseConfig, EmbedderBaseConfigSchema } from './base.js';

/**
 * Configuration schema for OpenAI embedder
 */
export const OpenAIEmbedderConfigSchema = EmbedderBaseConfigSchema.extend({
  apiKey: z.string().describe('OpenAI API key'),
  model: z.string().optional().default('text-embedding-ada-002').describe('OpenAI embedding model to use'),
  maxTokens: z.number().optional().default(8191).describe('Maximum tokens allowed per input'),
  chunkSize: z.number().optional().default(1000).describe('Batch size for embedding requests'),
  normalize: z.boolean().optional().default(true).describe('Whether to normalize embeddings'),
  encodingName: z.string().optional().describe('Token encoding name (if provided)'),
}).transform(data => ({
  ...data,
  model: data.model ?? 'text-embedding-ada-002',
  maxTokens: data.maxTokens ?? 8191,
  chunkSize: data.chunkSize ?? 1000,
  normalize: data.normalize ?? true,
}));

export type OpenAIEmbedderConfig = z.infer<typeof OpenAIEmbedderConfigSchema>;

/**
 * OpenAI embedding response structure
 */
interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI-based embedder for generating text embeddings with handling for long inputs.
 * 
 * PYTHON EQUIVALENT: OpenAIEmbedder class in openai.py
 */
export class OpenAIEmbedder extends EmbedderBase {
  protected declare config: OpenAIEmbedderConfig;

  constructor(config: Partial<OpenAIEmbedderConfig>) {
    super(config);
    this.config = OpenAIEmbedderConfigSchema.parse(config);
  }

  /**
   * Generate embeddings for the given text.
   * 
   * PYTHON EQUIVALENT: embed method in OpenAIEmbedder
   * 
   * @param query The text to embed
   * @param kwargs Additional parameters for embedding
   * @returns Promise resolving to array of embedding vectors
   */
  async embed(query: string, kwargs?: Record<string, any>): Promise<number[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query must contain valid text');
    }

    const response = await this.callOpenAIEmbeddingAPI([query], kwargs);

    if (response.data.length === 0) {
      throw new Error('No embeddings returned from OpenAI');
    }

    let embedding = response.data[0]!.embedding;

    // Normalize if requested
    if (this.config.normalize) {
      embedding = this.normalizeEmbedding(embedding);
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts in batch.
   * 
   * @param queries Array of texts to embed
   * @param kwargs Additional parameters for embedding
   * @returns Promise resolving to array of embedding vectors for each text
   */
  async embedBatch(queries: string[], kwargs?: Record<string, any>): Promise<number[][]> {
    if (!queries || queries.length === 0) {
      throw new Error('Queries array must not be empty');
    }

    // Filter out empty queries
    const validQueries = queries.filter(q => q && q.trim().length > 0);
    if (validQueries.length === 0) {
      throw new Error('At least one query must contain valid text');
    }

    // Process in chunks to respect batch size limits
    const results: number[][] = [];
    const batchSize = this.config.chunkSize;

    for (let i = 0; i < validQueries.length; i += batchSize) {
      const batch = validQueries.slice(i, i + batchSize);
      
      const response = await this.callOpenAIEmbeddingAPI(batch, kwargs);

      let embeddings = response.data.map((item: any) => item.embedding);

      // Normalize if requested
      if (this.config.normalize) {
        embeddings = embeddings.map((embedding: number[]) => this.normalizeEmbedding(embedding));
      }

      results.push(...embeddings);
    }

    return results;
  }

  /**
   * Call the OpenAI embedding API.
   * 
   * @param inputs Array of text inputs to embed
   * @param kwargs Additional parameters
   * @returns Promise resolving to OpenAI embedding response
   */
  private async callOpenAIEmbeddingAPI(
    inputs: string[],
    kwargs?: Record<string, any>
  ): Promise<OpenAIEmbeddingResponse> {
    const url = 'https://api.openai.com/v1/embeddings';
    
    const requestBody = {
      input: inputs,
      model: this.config.model,
      ...kwargs,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<OpenAIEmbeddingResponse>;
  }

  /**
   * Normalize an embedding vector to unit length.
   * 
   * @param embedding The embedding vector to normalize
   * @returns Normalized embedding vector
   */
  private normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? embedding.map(val => val / norm) : embedding;
  }

  /**
   * Get the maximum number of tokens allowed per input.
   */
  getMaxTokens(): number {
    return this.config.maxTokens;
  }

  /**
   * Get the batch size for embedding requests.
   */
  getChunkSize(): number {
    return this.config.chunkSize;
  }

  /**
   * Check if embeddings should be normalized.
   */
  shouldNormalize(): boolean {
    return this.config.normalize;
  }

  /**
   * Get the encoding name being used.
   */
  getEncodingName(): string | undefined {
    return this.config.encodingName;
  }

  /**
   * Get the API key being used.
   */
  getApiKey(): string {
    return this.config.apiKey;
  }
}

/**
 * Factory function to create an OpenAI embedder.
 * 
 * @param config Configuration for the embedder including API key
 * @returns A new OpenAI embedder instance
 */
export function createOpenAIEmbedder(
  config: Partial<OpenAIEmbedderConfig> & { apiKey: string }
): OpenAIEmbedder {
  return new OpenAIEmbedder(config);
}