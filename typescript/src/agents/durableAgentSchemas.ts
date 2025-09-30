import { z } from 'zod';
import { BaseMessage } from '../types/message.js';

/**
 * Schema for broadcast messages from agents
 */
export const BroadcastMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  timestamp: z.date().optional(),
});

export type BroadcastMessage = z.infer<typeof BroadcastMessageSchema> & BaseMessage;

/**
 * Schema for agent task responses
 */
export const AgentTaskResponseSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  timestamp: z.date().optional(),
  workflow_instance_id: z.string().optional(),
});

export type AgentTaskResponse = z.infer<typeof AgentTaskResponseSchema> & BaseMessage;

/**
 * Schema for trigger actions that start agent workflows
 */
export const TriggerActionSchema = z.object({
  task: z.string().optional(),
  workflow_instance_id: z.string().optional(),
  source: z.string().optional(),
  _message_metadata: z.record(z.any()).optional(),
  _otel_span_context: z.record(z.any()).optional(),
});

export type TriggerAction = z.infer<typeof TriggerActionSchema>;

/**
 * Create a broadcast message
 */
export function createBroadcastMessage(
  content: string,
  name?: string,
  role: 'user' | 'assistant' | 'system' | 'tool' = 'assistant'
): BroadcastMessage {
  return {
    role,
    content,
    name,
    timestamp: new Date(),
  };
}

/**
 * Create an agent task response
 */
export function createAgentTaskResponse(
  content: string,
  workflowInstanceId?: string,
  name?: string,
  role: 'user' | 'assistant' | 'system' | 'tool' = 'assistant'
): AgentTaskResponse {
  return {
    role,
    content,
    name,
    timestamp: new Date(),
    workflow_instance_id: workflowInstanceId,
  };
}

/**
 * Create a trigger action
 */
export function createTriggerAction(
  task?: string,
  workflowInstanceId?: string,
  source?: string,
  metadata?: Record<string, any>
): TriggerAction {
  return {
    task,
    workflow_instance_id: workflowInstanceId,
    source,
    _message_metadata: metadata,
  };
}