/**
 * Document splitter exports.
 * 
 * This module provides splitters for breaking documents into smaller chunks
 * that can be processed more effectively by other components.
 */

export * from './base.js';
export * from './text.js';

// Re-export commonly used types and functions
export type { SplitterBaseConfig } from './base.js';
export type { TextSplitterConfig } from './text.js';

export { 
  SplitterBase,
  isSplitter 
} from './base.js';

export { 
  TextSplitter,
  createTextSplitter 
} from './text.js';