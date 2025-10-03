/**
 * Base splitter class for chunking documents into smaller pieces.
 * 
 * PYTHON EQUIVALENT: dapr_agents/document/splitter/base.py
 * 
 * Provides the abstract interface for all splitter implementations including
 * text splitters that break documents into manageable chunks for processing.
 */

import { z } from 'zod';
import { Document } from '../../types/document.js';

/**
 * Configuration schema for splitter base class
 */
export const SplitterBaseConfigSchema = z.object({
  chunkSize: z.number().optional().default(1000).describe('Maximum size of each chunk'),
  chunkOverlap: z.number().optional().default(200).describe('Number of characters to overlap between chunks'),
  separator: z.string().optional().default('\n\n').describe('Separator to use for splitting'),
  keepSeparator: z.boolean().optional().default(false).describe('Whether to keep the separator in the chunks'),
}).transform(data => ({
  ...data,
  chunkSize: data.chunkSize ?? 1000,
  chunkOverlap: data.chunkOverlap ?? 200,
  separator: data.separator ?? '\n\n',
  keepSeparator: data.keepSeparator ?? false,
}));

export type SplitterBaseConfig = z.infer<typeof SplitterBaseConfigSchema>;

/**
 * Abstract base class for document splitters.
 * 
 * Splitters break large documents into smaller, manageable chunks that can be
 * processed more effectively by embedders and other components.
 * 
 * PYTHON EQUIVALENT: SplitterBase class in base.py
 */
export abstract class SplitterBase {
  protected config: SplitterBaseConfig;

  constructor(config: Partial<SplitterBaseConfig> = {}) {
    this.config = SplitterBaseConfigSchema.parse(config);
  }

  /**
   * Split a document into smaller chunks.
   * 
   * PYTHON EQUIVALENT: split method in SplitterBase
   * 
   * @param document The document to split
   * @param kwargs Additional parameters for splitting
   * @returns Promise resolving to array of document chunks
   */
  abstract split(document: Document, kwargs?: Record<string, any>): Promise<Document[]>;

  /**
   * Split multiple documents into chunks.
   * 
   * @param documents Array of documents to split
   * @param kwargs Additional parameters for splitting
   * @returns Promise resolving to array of document chunks from all documents
   */
  async splitBatch(documents: Document[], kwargs?: Record<string, any>): Promise<Document[]> {
    const allChunks: Document[] = [];
    for (const document of documents) {
      const chunks = await this.split(document, kwargs);
      allChunks.push(...chunks);
    }
    return allChunks;
  }

  /**
   * Split text directly into chunks without Document wrapper.
   * 
   * @param text The text to split
   * @param kwargs Additional parameters for splitting
   * @returns Promise resolving to array of text chunks
   */
  abstract splitText(text: string, kwargs?: Record<string, any>): Promise<string[]>;

  /**
   * Get the configuration for this splitter.
   */
  getConfig(): SplitterBaseConfig {
    return { ...this.config };
  }

  /**
   * Get the chunk size.
   */
  getChunkSize(): number {
    return this.config.chunkSize;
  }

  /**
   * Get the chunk overlap.
   */
  getChunkOverlap(): number {
    return this.config.chunkOverlap;
  }

  /**
   * Get the separator used for splitting.
   */
  getSeparator(): string {
    return this.config.separator;
  }

  /**
   * Check if separators should be kept in chunks.
   */
  shouldKeepSeparator(): boolean {
    return this.config.keepSeparator;
  }

  /**
   * Create a new document chunk with proper metadata.
   * 
   * @param text The chunk text
   * @param originalDocument The original document this chunk came from
   * @param chunkIndex The index of this chunk in the sequence
   * @param totalChunks The total number of chunks from the original document
   * @returns A new Document object representing the chunk
   */
  protected createChunk(
    text: string,
    originalDocument: Document,
    chunkIndex: number,
    totalChunks: number
  ): Document {
    return {
      text,
      metadata: {
        ...originalDocument.metadata,
        chunk_index: chunkIndex,
        total_chunks: totalChunks,
        chunk_size: text.length,
        source_document: originalDocument.text.substring(0, 100) + '...', // First 100 chars as reference
      },
    };
  }
}

/**
 * Type guard to check if an object is a splitter
 */
export function isSplitter(obj: any): obj is SplitterBase {
  return obj instanceof SplitterBase;
}