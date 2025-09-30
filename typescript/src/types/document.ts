import { z } from 'zod';

/**
 * Zod schema for Document
 */
export const DocumentSchema = z.object({
  /** A dictionary containing metadata about the document (e.g., source, page number) */
  metadata: z.record(z.unknown()).optional(),
  /** The main content of the document */
  text: z.string(),
});

/**
 * TypeScript interface for Document
 */
export type Document = z.infer<typeof DocumentSchema>;

/**
 * Helper functions for creating document objects
 */

export function createDocument(
  text: string,
  metadata?: Record<string, unknown>
): Document {
  return DocumentSchema.parse({
    text,
    metadata,
  });
}

/**
 * Helper to check if document has metadata
 */
export function hasMetadata(document: Document): boolean {
  return document.metadata != null && Object.keys(document.metadata).length > 0;
}

/**
 * Helper to get specific metadata value
 */
export function getMetadata(document: Document, key: string): unknown {
  return document.metadata?.[key];
}

/**
 * Helper to set metadata value
 */
export function setMetadata(document: Document, key: string, value: unknown): Document {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      [key]: value,
    },
  };
}