import { z } from 'zod';

/**
 * Zod schema for function call with JSON validation
 */
export const FunctionCallSchema = z.object({
  /** Name of the function */
  name: z.string(),
  /** A JSON string containing arguments for the function */
  arguments: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, {
    message: 'arguments must be valid JSON string',
  }),
});

/**
 * TypeScript interface for FunctionCall
 */
export type FunctionCall = z.infer<typeof FunctionCallSchema>;

/**
 * Helper to create a FunctionCall with proper JSON validation
 */
export function createFunctionCall(
  name: string,
  args: Record<string, unknown>
): FunctionCall {
  return FunctionCallSchema.parse({
    name,
    arguments: JSON.stringify(args),
  });
}

/**
 * Helper to get arguments as an object from a FunctionCall
 */
export function getFunctionCallArguments(
  functionCall: FunctionCall
): Record<string, unknown> {
  try {
    return JSON.parse(functionCall.arguments);
  } catch {
    return {};
  }
}

/**
 * Zod schema for tool call
 */
export const ToolCallSchema = z.object({
  /** Unique identifier of the tool call */
  id: z.string(),
  /** Type of tool being called */
  type: z.string(),
  /** The function that should be called as part of the tool call */
  function: FunctionCallSchema,
});

/**
 * TypeScript interface for ToolCall
 */
export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Zod schema for function call chunk in streaming responses
 */
export const FunctionCallChunkSchema = z.object({
  /** The name of the function being called */
  name: z.string().optional(),
  /** The JSON string representation of the function's arguments */
  arguments: z.string().optional(),
});

/**
 * TypeScript interface for FunctionCallChunk
 */
export type FunctionCallChunk = z.infer<typeof FunctionCallChunkSchema>;

/**
 * Zod schema for tool call chunk in streaming responses
 */
export const ToolCallChunkSchema = z.object({
  /** The index of the tool call in the response */
  index: z.number(),
  /** Unique identifier for the tool call */
  id: z.string().optional(),
  /** The type of the tool call */
  type: z.string().optional(),
  /** The function call details associated with the tool call */
  function: FunctionCallChunkSchema,
});

/**
 * TypeScript interface for ToolCallChunk
 */
export type ToolCallChunk = z.infer<typeof ToolCallChunkSchema>;

/**
 * Base message schema - common attributes across all message types
 */
export const BaseMessageSchema = z.object({
  /** The main text content of the message */
  content: z.string().optional(),
  /** The role associated with the message */
  role: z.string(),
  /** An optional name identifier for the message */
  name: z.string().optional(),
});

/**
 * TypeScript interface for BaseMessage
 */
export type BaseMessage = z.infer<typeof BaseMessageSchema>;

/**
 * System message schema
 */
export const SystemMessageSchema = BaseMessageSchema.extend({
  role: z.literal('system'),
});

/**
 * TypeScript interface for SystemMessage
 */
export type SystemMessage = z.infer<typeof SystemMessageSchema>;

/**
 * User message schema
 */
export const UserMessageSchema = BaseMessageSchema.extend({
  role: z.literal('user'),
});

/**
 * TypeScript interface for UserMessage
 */
export type UserMessage = z.infer<typeof UserMessageSchema>;

/**
 * Assistant message schema - includes optional tool calls and function calls
 */
export const AssistantMessageSchema = BaseMessageSchema.extend({
  role: z.literal('assistant'),
  /** Optional refusal message */
  refusal: z.string().optional(),
  /** A list of tool calls */
  toolCalls: z.array(ToolCallSchema).optional(),
  /** A function call */
  functionCall: FunctionCallSchema.optional(),
});

/**
 * TypeScript interface for AssistantMessage
 */
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;

/**
 * Tool message schema
 */
export const ToolMessageSchema = BaseMessageSchema.extend({
  role: z.literal('tool'),
  /** Identifier for the specific tool call associated with the message */
  toolCallId: z.string(),
});

/**
 * TypeScript interface for ToolMessage
 */
export type ToolMessage = z.infer<typeof ToolMessageSchema>;

/**
 * Union of all message types
 */
export const MessageSchema = z.union([
  SystemMessageSchema,
  UserMessageSchema,
  AssistantMessageSchema,
  ToolMessageSchema,
]);

/**
 * TypeScript type for any message
 */
export type Message = z.infer<typeof MessageSchema>;

/**
 * LLM Chat Candidate schema
 */
export const LLMChatCandidateSchema = z.object({
  /** The assistant's message for this candidate */
  message: AssistantMessageSchema,
  /** Why the model stopped generating text */
  finishReason: z.string().optional(),
}).catchall(z.unknown()); // Allow extra fields for provider-specific data

/**
 * TypeScript interface for LLMChatCandidate
 */
export type LLMChatCandidate = z.infer<typeof LLMChatCandidateSchema>;

/**
 * LLM Chat Response schema
 */
export const LLMChatResponseSchema = z.object({
  /** List of candidate outputs */
  results: z.array(LLMChatCandidateSchema),
  /** Provider/model metadata (id, model, usage, etc.) */
  metadata: z.record(z.unknown()).default({}),
});

/**
 * TypeScript interface for LLMChatResponse
 */
export type LLMChatResponse = z.infer<typeof LLMChatResponseSchema>;

/**
 * Schema for LLMChatCandidateChunk (for streaming)
 */
export const LLMChatCandidateChunkSchema = z.object({
  content: z.string().optional(),
  function_call: z.record(z.any()).optional(),
  refusal: z.string().optional(),
  role: z.string().optional(),
  tool_calls: z.array(z.any()).optional(), // ToolCallChunk to be defined later
  finish_reason: z.string().optional(),
  index: z.number().optional(),
  logprobs: z.record(z.any()).optional(),
});

/**
 * TypeScript interface for LLMChatCandidateChunk
 */
export type LLMChatCandidateChunk = z.infer<typeof LLMChatCandidateChunkSchema>;

/**
 * Schema for LLMChatResponseChunk (for streaming)
 */
export const LLMChatResponseChunkSchema = z.object({
  result: LLMChatCandidateChunkSchema,
  metadata: z.record(z.any()).optional(),
});

/**
 * TypeScript interface for LLMChatResponseChunk
 */
export type LLMChatResponseChunk = z.infer<typeof LLMChatResponseChunkSchema>;

/**
 * Helper functions for creating message instances
 */

export function createSystemMessage(content: string, name?: string): SystemMessage {
  return SystemMessageSchema.parse({ role: 'system', content, name });
}

export function createUserMessage(content: string, name?: string): UserMessage {
  return UserMessageSchema.parse({ role: 'user', content, name });
}

export function createAssistantMessage(
  content?: string,
  options?: {
    name?: string;
    refusal?: string;
    toolCalls?: ToolCall[];
    functionCall?: FunctionCall;
  }
): AssistantMessage {
  return AssistantMessageSchema.parse({
    role: 'assistant',
    content,
    name: options?.name,
    refusal: options?.refusal,
    toolCalls: options?.toolCalls,
    functionCall: options?.functionCall,
  });
}

export function createToolMessage(
  content: string,
  toolCallId: string,
  name?: string
): ToolMessage {
  return ToolMessageSchema.parse({
    role: 'tool',
    content,
    toolCallId,
    name,
  });
}

/**
 * Helper to check if an assistant message has tool calls
 */
export function hasToolCalls(message: AssistantMessage): boolean {
  return Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
}

/**
 * Helper to get the first message from an LLM response
 */
export function getFirstMessage(response: LLMChatResponse): AssistantMessage | undefined {
  return response.results[0]?.message;
}