import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * OpenAI Function Definition schema
 */
export const OAIFunctionDefinitionSchema = z.object({
  /** The name of the function */
  name: z.string(),
  /** A detailed description of what the function does */
  description: z.string(),
  /** A dictionary describing the parameters that the function accepts */
  parameters: z.record(z.unknown()),
});

/**
 * TypeScript interface for OAI Function Definition
 */
export type OAIFunctionDefinition = z.infer<typeof OAIFunctionDefinitionSchema>;

/**
 * OpenAI Tool Definition schema
 */
export const OAIToolDefinitionSchema = z.object({
  /** The type of the tool */
  type: z.enum(['function', 'code_interpreter', 'file_search']),
  /** The function definition, required if type is 'function' */
  function: OAIFunctionDefinitionSchema.optional(),
}).refine((data) => {
  // If type is 'function', function definition must be provided
  if (data.type === 'function' && !data.function) {
    return false;
  }
  return true;
}, {
  message: 'Function definition must be provided for function type tools',
});

/**
 * TypeScript interface for OAI Tool Definition
 */
export type OAIToolDefinition = z.infer<typeof OAIToolDefinitionSchema>;

/**
 * Claude Tool Definition schema
 */
export const ClaudeToolDefinitionSchema = z.object({
  /** The name of the function */
  name: z.string(),
  /** A description of the function's purpose and usage */
  description: z.string(),
  /** A dictionary defining the input schema for the function */
  inputSchema: z.record(z.unknown()),
});

/**
 * TypeScript interface for Claude Tool Definition
 */
export type ClaudeToolDefinition = z.infer<typeof ClaudeToolDefinitionSchema>;

/**
 * Gemini Function Definition schema
 */
export const GeminiFunctionDefinitionSchema = z.object({
  /** The name of the function */
  name: z.string(),
  /** The description and purpose of the function */
  description: z.string(),
  /** Describes the parameters of the function in OpenAPI JSON Schema format */
  parameters: z.record(z.unknown()),
});

/**
 * TypeScript interface for Gemini Function Definition
 */
export type GeminiFunctionDefinition = z.infer<typeof GeminiFunctionDefinitionSchema>;

/**
 * Gemini Tool Definition schema
 */
export const GeminiToolDefinitionSchema = z.object({
  /** A structured representation of function declarations */
  functionDeclarations: z.array(GeminiFunctionDefinitionSchema),
});

/**
 * TypeScript interface for Gemini Tool Definition
 */
export type GeminiToolDefinition = z.infer<typeof GeminiToolDefinitionSchema>;

/**
 * SSE Server Parameters schema
 */
export const SseServerParametersSchema = z.object({
  /** The SSE endpoint URL */
  url: z.string(),
  /** Optional HTTP headers */
  headers: z.record(z.string()).optional(),
  /** Connection timeout in seconds */
  timeout: z.number().default(5.0),
  /** Timeout for SSE read operations in seconds */
  sseReadTimeout: z.number().default(300.0),
});

/**
 * TypeScript interface for SSE Server Parameters
 */
export type SseServerParameters = z.infer<typeof SseServerParametersSchema>;

/**
 * Streamable HTTP Server Parameters schema
 */
export const StreamableHTTPServerParametersSchema = z.object({
  /** The streamable HTTP endpoint URL */
  url: z.string(),
  /** Optional HTTP headers */
  headers: z.record(z.string()).optional(),
  /** Connection timeout in seconds */
  timeout: z.number().default(30),
  /** Timeout for SSE read operations in seconds */
  sseReadTimeout: z.number().default(300),
  /** Whether to terminate the connection on close */
  terminateOnClose: z.boolean().default(true),
});

/**
 * TypeScript interface for Streamable HTTP Server Parameters
 */
export type StreamableHTTPServerParameters = z.infer<typeof StreamableHTTPServerParametersSchema>;

/**
 * WebSocket Server Parameters schema
 */
export const WebSocketServerParametersSchema = z.object({
  /** The websocket endpoint URL */
  url: z.string(),
});

/**
 * TypeScript interface for WebSocket Server Parameters
 */
export type WebSocketServerParameters = z.infer<typeof WebSocketServerParametersSchema>;

/**
 * Tool Execution Record schema
 */
export const ToolExecutionRecordSchema = z.object({
  /** Unique identifier for the tool execution record */
  id: z.string().default(() => uuidv4()),
  /** Timestamp when the tool execution record was created */
  timestamp: z.date().default(() => new Date()),
  /** Unique identifier for the tool call */
  toolCallId: z.string(),
  /** Name of tool suggested by the model to run for a specific task */
  toolName: z.string(),
  /** Tool arguments suggested by the model to run for a specific task */
  toolArgs: z.record(z.unknown()).default({}),
  /** Result of the tool execution, if available */
  executionResult: z.string().optional(),
});

/**
 * TypeScript interface for Tool Execution Record
 */
export type ToolExecutionRecord = z.infer<typeof ToolExecutionRecordSchema>;

/**
 * Helper functions for creating tool definitions
 */

export function createOAIFunctionDefinition(
  name: string,
  description: string,
  parameters: Record<string, unknown>
): OAIFunctionDefinition {
  return OAIFunctionDefinitionSchema.parse({
    name,
    description,
    parameters,
  });
}

export function createOAIToolDefinition(
  type: 'function' | 'code_interpreter' | 'file_search',
  functionDef?: OAIFunctionDefinition
): OAIToolDefinition {
  return OAIToolDefinitionSchema.parse({
    type,
    function: functionDef,
  });
}

export function createToolExecutionRecord(
  toolCallId: string,
  toolName: string,
  toolArgs: Record<string, unknown> = {},
  executionResult?: string
): ToolExecutionRecord {
  return ToolExecutionRecordSchema.parse({
    toolCallId,
    toolName,
    toolArgs,
    executionResult,
  });
}