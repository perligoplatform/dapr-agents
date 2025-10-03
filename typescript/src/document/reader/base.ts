/**
 * Base reader class for reading and processing different document formats.
 * 
 * PYTHON EQUIVALENT: dapr_agents/document/reader/base.py
 * 
 * Provides the abstract interface for all reader implementations including
 * PDF readers, text readers, and other document format processors.
 */

import { z } from 'zod';
import { Document } from '../../types/document.js';

/**
 * Configuration schema for reader base class
 */
export const ReaderBaseConfigSchema = z.object({
  encoding: z.string().optional().default('utf-8').describe('Text encoding to use'),
  maxFileSize: z.number().optional().describe('Maximum file size in bytes'),
  preserveFormatting: z.boolean().optional().default(false).describe('Whether to preserve original formatting'),
}).transform(data => ({
  ...data,
  encoding: data.encoding ?? 'utf-8',
  preserveFormatting: data.preserveFormatting ?? false,
}));

export type ReaderBaseConfig = z.infer<typeof ReaderBaseConfigSchema>;

/**
 * Abstract base class for document readers.
 * 
 * Readers process files and convert them into Document objects that can be
 * used by other components in the document processing pipeline.
 * 
 * PYTHON EQUIVALENT: ReaderBase class in base.py
 */
export abstract class ReaderBase {
  protected config: ReaderBaseConfig;

  constructor(config: Partial<ReaderBaseConfig> = {}) {
    this.config = ReaderBaseConfigSchema.parse(config);
  }

  /**
   * Read and process a file from the given path.
   * 
   * PYTHON EQUIVALENT: read method in ReaderBase
   * 
   * @param filePath Path to the file to read
   * @param kwargs Additional parameters for reading
   * @returns Promise resolving to array of documents
   */
  abstract read(filePath: string, kwargs?: Record<string, any>): Promise<Document[]>;

  /**
   * Read and process content from a buffer.
   * 
   * @param buffer The buffer containing file content
   * @param filename Optional filename for metadata
   * @param kwargs Additional parameters for reading
   * @returns Promise resolving to array of documents
   */
  abstract readFromBuffer(buffer: Buffer, filename?: string, kwargs?: Record<string, any>): Promise<Document[]>;

  /**
   * Read and process content from a string.
   * 
   * @param content The string content to process
   * @param filename Optional filename for metadata
   * @param kwargs Additional parameters for reading
   * @returns Promise resolving to array of documents
   */
  async readFromString(content: string, filename?: string, kwargs?: Record<string, any>): Promise<Document[]> {
    const buffer = Buffer.from(content, this.config.encoding as any);
    return this.readFromBuffer(buffer, filename, kwargs);
  }

  /**
   * Check if this reader can handle the given file type.
   * 
   * @param filePath Path to the file or filename
   * @returns Promise resolving to boolean indicating if file can be handled
   */
  abstract canHandle(filePath: string): Promise<boolean>;

  /**
   * Get the supported file extensions for this reader.
   * 
   * @returns Array of supported file extensions (including the dot)
   */
  abstract getSupportedExtensions(): string[];

  /**
   * Get the configuration for this reader.
   */
  getConfig(): ReaderBaseConfig {
    return { ...this.config };
  }

  /**
   * Get the encoding used for text processing.
   */
  getEncoding(): string {
    return this.config.encoding!;
  }

  /**
   * Get the maximum file size limit.
   */
  getMaxFileSize(): number | undefined {
    return this.config.maxFileSize;
  }

  /**
   * Check if formatting should be preserved.
   */
  shouldPreserveFormatting(): boolean {
    return this.config.preserveFormatting!;
  }

  /**
   * Extract file extension from a file path.
   * 
   * @param filePath The file path
   * @returns The file extension (including the dot)
   */
  protected getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.');
    return lastDotIndex >= 0 ? filePath.substring(lastDotIndex).toLowerCase() : '';
  }

  /**
   * Extract filename from a file path.
   * 
   * @param filePath The file path
   * @returns The filename without path
   */
  protected getFileName(filePath: string): string {
    const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    return lastSlashIndex >= 0 ? filePath.substring(lastSlashIndex + 1) : filePath;
  }
}

/**
 * Type guard to check if an object is a reader
 */
export function isReader(obj: any): obj is ReaderBase {
  return obj instanceof ReaderBase;
}