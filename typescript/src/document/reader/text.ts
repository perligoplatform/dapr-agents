/**
 * Text reader for loading plain text files.
 * 
 * PYTHON EQUIVALENT: dapr_agents/document/reader/text.py
 * 
 * Provides functionality to read and process plain text files into Document objects.
 */

import { z } from 'zod';
import { ReaderBase, ReaderBaseConfig, ReaderBaseConfigSchema } from './base.js';
import { Document } from '../../types/document.js';
import { promises as fs } from 'fs';
import { extname } from 'path';

/**
 * Configuration schema for text reader
 */
export const TextReaderConfigSchema = z.object({
  encoding: z.string().optional().default('utf-8').describe('Text encoding to use'),
  maxFileSize: z.number().optional().describe('Maximum file size in bytes'),
  preserveFormatting: z.boolean().optional().default(false).describe('Whether to preserve original formatting'),
}).transform(data => ({
  ...data,
  encoding: data.encoding ?? 'utf-8',
  preserveFormatting: data.preserveFormatting ?? false,
}));

export type TextReaderConfig = z.infer<typeof TextReaderConfigSchema>;

/**
 * Reader for plain text files.
 * 
 * PYTHON EQUIVALENT: TextLoader class in text.py
 */
export class TextReader extends ReaderBase {
  protected declare config: TextReaderConfig;

  constructor(config: Partial<TextReaderConfig> = {}) {
    super(config);
    this.config = TextReaderConfigSchema.parse(config);
  }

  /**
   * Read and process a text file from the given path.
   * 
   * PYTHON EQUIVALENT: load method in TextLoader
   * 
   * @param filePath Path to the text file to read
   * @param kwargs Additional parameters for reading
   * @returns Promise resolving to array of documents
   */
  async read(filePath: string, kwargs?: Record<string, any>): Promise<Document[]> {
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check file size if limit is set
    if (this.config.maxFileSize) {
      const stats = await fs.stat(filePath);
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File size (${stats.size} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`);
      }
    }

    const content = await fs.readFile(filePath, { encoding: this.config.encoding as any });
    const trimmedContent = content.toString().trim();

    const metadata = {
      file_path: filePath,
      file_type: 'text',
      file_name: this.getFileName(filePath),
      file_extension: this.getFileExtension(filePath),
      file_size: Buffer.byteLength(content, this.config.encoding as any),
      encoding: this.config.encoding,
      ...kwargs,
    };

    return [{
      text: trimmedContent,
      metadata,
    }];
  }

  /**
   * Read and process content from a buffer.
   * 
   * @param buffer The buffer containing text content
   * @param filename Optional filename for metadata
   * @param kwargs Additional parameters for reading
   * @returns Promise resolving to array of documents
   */
  async readFromBuffer(buffer: Buffer, filename?: string, kwargs?: Record<string, any>): Promise<Document[]> {
    // Check buffer size if limit is set
    if (this.config.maxFileSize && buffer.length > this.config.maxFileSize) {
      throw new Error(`Buffer size (${buffer.length} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`);
    }

    const content = buffer.toString(this.config.encoding as any);
    const trimmedContent = content.trim();

    const metadata = {
      file_type: 'text',
      file_name: filename || 'buffer',
      file_extension: filename ? this.getFileExtension(filename) : '.txt',
      file_size: buffer.length,
      encoding: this.config.encoding,
      source: 'buffer',
      ...kwargs,
    };

    return [{
      text: trimmedContent,
      metadata,
    }];
  }

  /**
   * Check if this reader can handle the given file type.
   * 
   * @param filePath Path to the file or filename
   * @returns Promise resolving to boolean indicating if file can be handled
   */
  async canHandle(filePath: string): Promise<boolean> {
    const extension = this.getFileExtension(filePath);
    return this.getSupportedExtensions().includes(extension);
  }

  /**
   * Get the supported file extensions for this reader.
   * 
   * @returns Array of supported file extensions (including the dot)
   */
  getSupportedExtensions(): string[] {
    return ['.txt', '.md', '.rst', '.log', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h'];
  }
}

/**
 * Factory function to create a text reader.
 * 
 * @param config Configuration for the reader
 * @returns A new text reader instance
 */
export function createTextReader(
  config: Partial<TextReaderConfig> = {}
): TextReader {
  return new TextReader(config);
}