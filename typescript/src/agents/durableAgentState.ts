import { z } from 'zod';
import { BaseMessage } from '../types/message.js';
import { ToolExecutionRecord } from '../types/tools.js';

/**
 * Workflow status enum matching Python DaprWorkflowStatus
 */
export enum DaprWorkflowStatus {
  UNKNOWN = 'Unknown',
  RUNNING = 'Running', 
  COMPLETED = 'Completed',
  CONTINUED_AS_NEW = 'ContinuedAsNew',
  FAILED = 'Failed',
  CANCELED = 'Canceled',
  TERMINATED = 'Terminated',
  PENDING = 'Pending',
  SUSPENDED = 'Suspended'
}

/**
 * Schema for durable agent messages with unique IDs and timestamps
 */
export const DurableAgentMessageSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
});

export type DurableAgentMessage = z.infer<typeof DurableAgentMessageSchema>;

/**
 * Schema for workflow entry tracking workflow execution state
 */
export const DurableAgentWorkflowEntrySchema = z.object({
  input: z.string(),
  output: z.string().optional(),
  start_time: z.date().default(() => new Date()),
  end_time: z.date().optional(),
  messages: z.array(DurableAgentMessageSchema).default([]),
  last_message: DurableAgentMessageSchema.optional(),
  tool_history: z.array(z.any()).default([]), // ToolExecutionRecord schema
  source: z.string().optional(),
  workflow_instance_id: z.string().optional(),
  triggering_workflow_instance_id: z.string().optional(),
  workflow_name: z.string().optional(),
  status: z.nativeEnum(DaprWorkflowStatus).default(DaprWorkflowStatus.PENDING),
  trace_context: z.record(z.any()).optional(),
});

export type DurableAgentWorkflowEntry = z.infer<typeof DurableAgentWorkflowEntrySchema>;

/**
 * Schema for the overall workflow state containing multiple instances
 */
export const DurableAgentWorkflowStateSchema = z.object({
  instances: z.record(DurableAgentWorkflowEntrySchema).default({}),
  chat_history: z.array(DurableAgentMessageSchema).default([]),
});

export type DurableAgentWorkflowState = z.infer<typeof DurableAgentWorkflowStateSchema>;

/**
 * Create a durable agent message
 */
export function createDurableAgentMessage(
  content: string,
  role: 'user' | 'assistant' | 'system' | 'tool' = 'user',
  name?: string,
  toolCalls?: any[],
  toolCallId?: string
): DurableAgentMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    name,
    timestamp: new Date(),
    tool_calls: toolCalls,
    tool_call_id: toolCallId,
  };
}

/**
 * Create a workflow entry
 */
export function createWorkflowEntry(
  input: string,
  workflowInstanceId?: string,
  source?: string,
  triggeringWorkflowInstanceId?: string
): DurableAgentWorkflowEntry {
  return {
    input,
    start_time: new Date(),
    messages: [],
    tool_history: [],
    source,
    workflow_instance_id: workflowInstanceId,
    triggering_workflow_instance_id: triggeringWorkflowInstanceId,
    status: DaprWorkflowStatus.PENDING,
  };
}

/**
 * Create initial workflow state
 */
export function createInitialWorkflowState(): DurableAgentWorkflowState {
  return {
    instances: {},
    chat_history: [],
  };
}