/**
 * Document reader exports.
 * 
 * This module provides readers for processing different document formats
 * and converting them into Document objects.
 */

export * from './base.js';
export * from './text.js';

// Re-export commonly used types and functions
export type { ReaderBaseConfig } from './base.js';
export type { TextReaderConfig } from './text.js';

export { 
  ReaderBase,
  isReader 
} from './base.js';

export { 
  TextReader,
  createTextReader 
} from './text.js';