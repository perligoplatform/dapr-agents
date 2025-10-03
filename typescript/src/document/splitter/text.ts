/**
 * Text splitter for breaking documents into smaller chunks.
 * 
 * PYTHON EQUIVALENT: dapr_agents/document/splitter/text.py
 * 
 * Provides functionality to split text using various strategies including
 * separators, regex patterns, and adaptive merging with overlap.
 */

import { z } from 'zod';
import { SplitterBase, SplitterBaseConfig, SplitterBaseConfigSchema } from './base.js';
import { Document } from '../../types/document.js';

/**
 * Configuration schema for text splitter
 */
export const TextSplitterConfigSchema = z.object({
  chunkSize: z.number().optional().default(1000).describe('Maximum size of each chunk'),
  chunkOverlap: z.number().optional().default(200).describe('Number of characters to overlap between chunks'),
  separator: z.string().optional().default('\n\n').describe('Separator to use for splitting'),
  keepSeparator: z.boolean().optional().default(false).describe('Whether to keep the separator in the chunks'),
  fallbackSeparators: z.array(z.string()).optional().default(['\n', ' ']).describe('Fallback separators if primary fails'),
  fallbackRegex: z.string().optional().default('[^,.;。？！]+[,.;。？！]').describe('Regex pattern for fallback splitting'),
  reservedMetadataSize: z.number().optional().default(0).describe('Space reserved for metadata'),
}).transform(data => ({
  ...data,
  chunkSize: data.chunkSize ?? 1000,
  chunkOverlap: data.chunkOverlap ?? 200,
  separator: data.separator ?? '\n\n',
  keepSeparator: data.keepSeparator ?? false,
  fallbackSeparators: data.fallbackSeparators ?? ['\n', ' '],
  fallbackRegex: data.fallbackRegex ?? '[^,.;。？！]+[,.;。？！]',
  reservedMetadataSize: data.reservedMetadataSize ?? 0,
}));

export type TextSplitterConfig = z.infer<typeof TextSplitterConfigSchema>;

/**
 * Text splitter that breaks text into chunks using hierarchical strategies.
 * 
 * PYTHON EQUIVALENT: TextSplitter class in text.py
 */
export class TextSplitter extends SplitterBase {
  protected declare config: TextSplitterConfig;

  constructor(config: Partial<TextSplitterConfig> = {}) {
    super(config);
    this.config = TextSplitterConfigSchema.parse(config);
  }

  /**
   * Split a document into smaller chunks.
   * 
   * PYTHON EQUIVALENT: split method in TextSplitter
   * 
   * @param document The document to split
   * @param kwargs Additional parameters for splitting
   * @returns Promise resolving to array of document chunks
   */
  async split(document: Document, kwargs?: Record<string, any>): Promise<Document[]> {
    const textChunks = await this.splitText(document.text, kwargs);
    
    return textChunks.map((text, index) => 
      this.createChunk(text, document, index, textChunks.length)
    );
  }

  /**
   * Split text directly into chunks without Document wrapper.
   * 
   * @param text The text to split
   * @param kwargs Additional parameters for splitting
   * @returns Promise resolving to array of text chunks
   */
  async splitText(text: string, kwargs?: Record<string, any>): Promise<string[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Step 1: Adjust effective chunk size to account for metadata space
    const effectiveChunkSize = this.config.chunkSize - this.config.reservedMetadataSize;

    // Step 2: Short-circuit for small texts
    if (this.calculateChunkSize(text) <= effectiveChunkSize) {
      return [text];
    }

    // Step 3: Use adaptive splitting strategy
    const chunks = this.splitAdaptively(text);

    // Step 4: Merge smaller chunks into valid sizes with overlap
    const mergedChunks = this.mergeSplits(chunks, effectiveChunkSize);

    return mergedChunks;
  }

  /**
   * Calculate the size of a text chunk.
   * 
   * @param text The text to measure
   * @returns The size of the text
   */
  private calculateChunkSize(text: string): number {
    // Default implementation uses character count
    // Could be extended to use token counting in the future
    return text.length;
  }

  /**
   * Split text adaptively using hierarchical strategies.
   * 
   * @param text The text to split
   * @returns Array of text segments
   */
  private splitAdaptively(text: string): string[] {
    // Try primary separator first
    let splits = this.splitBySeparator(text, this.config.separator);
    
    // If primary separator doesn't work well, try fallback separators
    if (splits.length === 1 && splits[0] === text) {
      for (const fallbackSep of this.config.fallbackSeparators) {
        splits = this.splitBySeparator(text, fallbackSep);
        if (splits.length > 1) break;
      }
    }

    // If separators don't work, try regex splitting
    if (splits.length === 1 && splits[0] === text) {
      splits = this.splitByRegex(text, this.config.fallbackRegex);
    }

    // Final fallback: split into equal-sized chunks
    if (splits.length === 1 && splits[0] === text) {
      splits = this.splitIntoEqualChunks(text, this.config.chunkSize);
    }

    return splits.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * Split text by a separator.
   * 
   * @param text The text to split
   * @param separator The separator to use
   * @returns Array of text segments
   */
  private splitBySeparator(text: string, separator: string): string[] {
    if (!separator) return [text];
    
    const parts = text.split(separator);
    
    if (this.config.keepSeparator && parts.length > 1) {
      // Add separator back to each part except the last
      return parts.map((part, index) => 
        index < parts.length - 1 ? part + separator : part
      );
    }
    
    return parts;
  }

  /**
   * Split text using regex pattern.
   * 
   * @param text The text to split
   * @param regexPattern The regex pattern to use
   * @returns Array of text segments
   */
  private splitByRegex(text: string, regexPattern: string): string[] {
    try {
      const regex = new RegExp(regexPattern, 'g');
      const matches = text.match(regex);
      return matches || [text];
    } catch {
      return [text];
    }
  }

  /**
   * Split text into equal-sized chunks as a last resort.
   * 
   * @param text The text to split
   * @param maxChunkSize Maximum size for each chunk
   * @returns Array of text segments
   */
  private splitIntoEqualChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + maxChunkSize, text.length);
      chunks.push(text.substring(start, end));
      start = end;
    }
    
    return chunks;
  }

  /**
   * Merge smaller splits into valid-sized chunks with overlap.
   * 
   * @param splits Array of text segments to merge
   * @param maxSize Maximum size for each chunk
   * @returns Array of merged chunks
   */
  private mergeSplits(splits: string[], maxSize: number): string[] {
    if (!splits || splits.length === 0) {
      return [];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i]!;
      const testChunk = currentChunk ? currentChunk + this.config.separator + split : split;
      
      if (this.calculateChunkSize(testChunk) <= maxSize) {
        currentChunk = testChunk;
      } else {
        // Current chunk is full, save it and start a new one
        if (currentChunk) {
          chunks.push(currentChunk);
          
          // Create overlap with previous chunk if configured
          if (this.config.chunkOverlap > 0) {
            const overlapText = this.getOverlapText(currentChunk, this.config.chunkOverlap);
            currentChunk = overlapText ? overlapText + this.config.separator + split : split;
          } else {
            currentChunk = split;
          }
        } else {
          // Single split is too large, handle it separately
          if (this.calculateChunkSize(split) > maxSize) {
            const subChunks = this.splitIntoEqualChunks(split, maxSize);
            chunks.push(...subChunks.slice(0, -1)); // Add all but last
            currentChunk = subChunks[subChunks.length - 1] || '';
          } else {
            currentChunk = split;
          }
        }
      }
    }
    
    // Add the final chunk if it exists
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk.
   * 
   * @param text The text to extract overlap from
   * @param overlapSize The desired overlap size
   * @returns The overlap text
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (overlapSize <= 0 || text.length <= overlapSize) {
      return text;
    }
    
    // Try to find a good breaking point near the overlap boundary
    const startPos = text.length - overlapSize;
    const searchText = text.substring(startPos);
    
    // Look for sentence or paragraph boundaries
    const sentenceBoundary = searchText.search(/[.!?]\s+/);
    if (sentenceBoundary >= 0) {
      return text.substring(startPos + sentenceBoundary + 1).trim();
    }
    
    // Look for word boundaries
    const wordBoundary = searchText.search(/\s+/);
    if (wordBoundary >= 0) {
      return text.substring(startPos + wordBoundary + 1).trim();
    }
    
    // Fallback to character boundary
    return text.substring(startPos);
  }

  /**
   * Get the fallback separators.
   */
  getFallbackSeparators(): string[] {
    return [...this.config.fallbackSeparators];
  }

  /**
   * Get the fallback regex pattern.
   */
  getFallbackRegex(): string {
    return this.config.fallbackRegex;
  }

  /**
   * Get the reserved metadata size.
   */
  getReservedMetadataSize(): number {
    return this.config.reservedMetadataSize;
  }
}

/**
 * Factory function to create a text splitter.
 * 
 * @param config Configuration for the splitter
 * @returns A new text splitter instance
 */
export function createTextSplitter(
  config: Partial<TextSplitterConfig> = {}
): TextSplitter {
  return new TextSplitter(config);
}