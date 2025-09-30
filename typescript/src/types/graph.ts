import { z } from 'zod';

/**
 * Zod schema for Node
 */
export const NodeSchema = z.object({
  /** The unique identifier of the node */
  id: z.unknown(),
  /** The primary label or type of the node */
  label: z.string(),
  /** A dictionary of properties associated with the node */
  properties: z.record(z.unknown()),
  /** Additional labels or categories associated with the node */
  additionalLabels: z.array(z.string()).default([]),
  /** Optional embedding vector for the node, useful for vector-based similarity searches */
  embedding: z.array(z.number()).optional(),
});

/**
 * TypeScript interface for Node
 */
export type Node = z.infer<typeof NodeSchema>;

/**
 * Zod schema for Relationship
 */
export const RelationshipSchema = z.object({
  /** The unique identifier of the source node in the relationship */
  sourceNodeId: z.unknown(),
  /** The unique identifier of the target node in the relationship */
  targetNodeId: z.unknown(),
  /** The type or label of the relationship, describing the connection between nodes */
  type: z.string(),
  /** Optional properties associated with the relationship */
  properties: z.record(z.unknown()).default({}),
});

/**
 * TypeScript interface for Relationship
 */
export type Relationship = z.infer<typeof RelationshipSchema>;

/**
 * Helper functions for creating graph objects
 */

export function createNode(
  id: unknown,
  label: string,
  properties: Record<string, unknown>,
  options?: {
    additionalLabels?: string[];
    embedding?: number[];
  }
): Node {
  return NodeSchema.parse({
    id,
    label,
    properties,
    additionalLabels: options?.additionalLabels,
    embedding: options?.embedding,
  });
}

export function createRelationship(
  sourceNodeId: unknown,
  targetNodeId: unknown,
  type: string,
  properties: Record<string, unknown> = {}
): Relationship {
  return RelationshipSchema.parse({
    sourceNodeId,
    targetNodeId,
    type,
    properties,
  });
}

/**
 * Helper to validate if a node has an embedding
 */
export function hasEmbedding(node: Node): boolean {
  return Array.isArray(node.embedding) && node.embedding.length > 0;
}

/**
 * Helper to get embedding dimension
 */
export function getEmbeddingDimension(node: Node): number {
  return node.embedding?.length ?? 0;
}