import { z } from 'zod';

/**
 * Zod schema for OAI JSON Schema
 */
export const OAIJSONSchemaSchema = z.object({
  /** The name of the response format */
  name: z.string()
    .max(64, 'Name must be 64 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name must contain only alphanumeric characters, underscores, and hyphens'),
  /** Explains the purpose of this response format so the model knows how to respond */
  description: z.string().optional(),
  /** The underlying JSON Schema object describing the response format structure */
  schema: z.record(z.unknown()).optional(),
  /** Whether to enforce strict schema adherence when generating the output */
  strict: z.boolean().default(true),
});

/**
 * TypeScript interface for OAI JSON Schema
 */
export type OAIJSONSchema = z.infer<typeof OAIJSONSchemaSchema>;

/**
 * Zod schema for OAI Response Format Schema
 */
export const OAIResponseFormatSchemaSchema = z.object({
  /** Specifies that this response format is a JSON schema definition */
  type: z.literal('json_schema'),
  /** Contains metadata and the actual JSON schema for the structured output */
  jsonSchema: OAIJSONSchemaSchema,
});

/**
 * TypeScript interface for OAI Response Format Schema
 */
export type OAIResponseFormatSchema = z.infer<typeof OAIResponseFormatSchemaSchema>;

/**
 * Helper functions for creating schema objects
 */

export function createOAIJSONSchema(
  name: string,
  options?: {
    description?: string;
    schema?: Record<string, unknown>;
    strict?: boolean;
  }
): OAIJSONSchema {
  return OAIJSONSchemaSchema.parse({
    name,
    description: options?.description,
    schema: options?.schema,
    strict: options?.strict,
  });
}

export function createOAIResponseFormatSchema(
  jsonSchema: OAIJSONSchema
): OAIResponseFormatSchema {
  return OAIResponseFormatSchemaSchema.parse({
    type: 'json_schema',
    jsonSchema,
  });
}

/**
 * Helper to validate schema name format
 */
export function isValidSchemaName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length <= 64;
}