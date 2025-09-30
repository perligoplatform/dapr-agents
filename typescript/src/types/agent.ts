import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enumeration of possible agent statuses for standardized tracking.
 */
export enum AgentStatus {
  /** The agent is actively working on tasks */
  ACTIVE = 'active',
  /** The agent is idle and waiting for tasks */
  IDLE = 'idle',
  /** The agent is temporarily paused */
  PAUSED = 'paused',
  /** The agent has completed all assigned tasks */
  COMPLETE = 'complete',
  /** The agent encountered an error and needs attention */
  ERROR = 'error',
}

/**
 * Enumeration of possible task statuses for standardizing task tracking.
 */
export enum AgentTaskStatus {
  /** Task is currently in progress */
  IN_PROGRESS = 'in-progress',
  /** Task has been completed successfully */
  COMPLETE = 'complete',
  /** Task has failed to complete as expected */
  FAILED = 'failed',
  /** Task is awaiting to be started */
  PENDING = 'pending',
  /** Task was canceled and will not be completed */
  CANCELED = 'canceled',
}

/**
 * Zod schema for AgentTaskEntry
 */
export const AgentTaskEntrySchema = z.object({
  /** Unique identifier for the task */
  taskId: z.string().default(() => uuidv4()),
  /** The input or description of the task to be performed */
  input: z.string(),
  /** The output or result of the task, if completed */
  output: z.string().optional(),
  /** Current status of the task */
  status: z.nativeEnum(AgentTaskStatus),
  /** Timestamp of task initiation or update */
  timestamp: z.date().default(() => new Date()),
});

/**
 * TypeScript interface for AgentTaskEntry
 */
export type AgentTaskEntry = z.infer<typeof AgentTaskEntrySchema>;

/**
 * Creates a new AgentTaskEntry with default values
 */
export function createAgentTaskEntry(
  input: string,
  status: AgentTaskStatus = AgentTaskStatus.PENDING
): AgentTaskEntry {
  return AgentTaskEntrySchema.parse({
    input,
    status,
  });
}

/**
 * Validates and parses an AgentTaskEntry from unknown input
 */
export function parseAgentTaskEntry(data: unknown): AgentTaskEntry {
  return AgentTaskEntrySchema.parse(data);
}