/**
 * State management types and classes for LLM-based workflow orchestration.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/state.py
 * 
 * Provides TypeScript equivalents for:
 * - TaskResult - Results of agent task execution
 * - SubStep and PlanStep - Structured execution plan components
 * - LLMWorkflowMessage - Messages exchanged within workflows
 * - LLMWorkflowEntry - Individual workflow instances
 * - LLMWorkflowState - State container for multiple workflows
 */

import { z } from 'zod';

/**
 * Represents the result of an agent's task execution.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/state.py:7-25 (class TaskResult)
 */
export const TaskResultSchema = z.object({
  agent: z.string().describe('The agent who executed the task'),
  step: z.number().int().describe('The step number associated with the task'),
  substep: z.number().optional().describe('The substep number (if applicable)'),
  result: z.string().describe('The response or outcome of the task execution'),
  timestamp: z.string().datetime().default(() => new Date().toISOString()).describe('Timestamp of when the result was recorded'),
});

export type TaskResult = z.infer<typeof TaskResultSchema>;

/**
 * Represents a substep within a larger step of the execution plan.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/state.py:28-36 (class SubStep)
 */
export const SubStepSchema = z.object({
  substep: z.number().describe('Substep identifier (float, e.g., 1.1, 2.3)'),
  description: z.string().describe('Detailed action to be performed'),
  status: z.enum(['not_started', 'in_progress', 'blocked', 'completed']).describe('Current state of the sub-step'),
});

export type SubStep = z.infer<typeof SubStepSchema>;

/**
 * Represents a step in the execution plan.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/state.py:39-47 (class PlanStep)
 */
export const PlanStepSchema = z.object({
  step: z.number().int().describe('Step identifier (integer)'),
  description: z.string().describe('Detailed action to be performed'),
  status: z.enum(['not_started', 'in_progress', 'blocked', 'completed']).describe('Current state of the step'),
  substeps: z.array(SubStepSchema).optional().describe('Optional list of sub-steps'),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;

/**
 * Represents a message exchanged within the workflow.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/state.py:50-70 (class LLMWorkflowMessage)
 */
export const LLMWorkflowMessageSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()).describe('Unique identifier for the message'),
  role: z.string().describe('The role of the message sender, e.g., "user" or "assistant"'),
  content: z.string().describe('Content of the message'),
  timestamp: z.string().datetime().default(() => new Date().toISOString()).describe('Timestamp when the message was created'),
  name: z.string().optional().describe('Optional name of the assistant or user sending the message'),
});

export type LLMWorkflowMessage = z.infer<typeof LLMWorkflowMessageSchema>;

/**
 * Represents a workflow instance and its associated data.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/state.py:73-96 (class LLMWorkflowEntry)
 */
export const LLMWorkflowEntrySchema = z.object({
  input: z.string().describe('The input or description of the Workflow to be performed'),
  output: z.string().optional().describe('The output or result of the Workflow, if completed'),
  startTime: z.string().datetime().default(() => new Date().toISOString()).describe('Timestamp when the workflow was started'),
  endTime: z.string().datetime().optional().describe('Timestamp when the workflow was completed or failed'),
  messages: z.array(LLMWorkflowMessageSchema).default([]).describe('Messages exchanged during the workflow'),
  lastMessage: LLMWorkflowMessageSchema.optional().describe('Last processed message in the workflow'),
  plan: z.array(PlanStepSchema).optional().describe('Structured execution plan for the workflow'),
  taskHistory: z.array(TaskResultSchema).default([]).describe('A history of task executions and their results'),
});

export type LLMWorkflowEntry = z.infer<typeof LLMWorkflowEntrySchema>;

/**
 * Represents the state of multiple LLM workflows.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/state.py:99-106 (class LLMWorkflowState)
 */
export const LLMWorkflowStateSchema = z.object({
  instances: z.record(z.string(), LLMWorkflowEntrySchema).default({}).describe('Workflow entries indexed by their instance_id'),
});

export type LLMWorkflowState = z.infer<typeof LLMWorkflowStateSchema>;

/**
 * Helper function to create a new LLMWorkflowEntry with default values.
 * 
 * @param input - The initial input for the workflow
 * @returns A new LLMWorkflowEntry instance
 */
export function createLLMWorkflowEntry(input: string): LLMWorkflowEntry {
  return LLMWorkflowEntrySchema.parse({ input });
}

/**
 * Helper function to create a new TaskResult.
 * 
 * @param agent - The agent who executed the task
 * @param step - The step number
 * @param result - The result content
 * @param substep - Optional substep number
 * @returns A new TaskResult instance
 */
export function createTaskResult(
  agent: string, 
  step: number, 
  result: string, 
  substep?: number
): TaskResult {
  return TaskResultSchema.parse({ agent, step, result, substep });
}

/**
 * Helper function to create a new LLMWorkflowMessage.
 * 
 * @param role - The role of the message sender
 * @param content - The message content
 * @param name - Optional name of the sender
 * @returns A new LLMWorkflowMessage instance
 */
export function createLLMWorkflowMessage(
  role: string, 
  content: string, 
  name?: string
): LLMWorkflowMessage {
  return LLMWorkflowMessageSchema.parse({ role, content, name });
}

/**
 * Helper function to create a new PlanStep.
 * 
 * @param step - The step number
 * @param description - The step description
 * @param status - The initial status
 * @param substeps - Optional array of substeps
 * @returns A new PlanStep instance
 */
export function createPlanStep(
  step: number,
  description: string,
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed' = 'not_started',
  substeps?: SubStep[]
): PlanStep {
  return PlanStepSchema.parse({ step, description, status, substeps });
}

/**
 * Helper function to create a new SubStep.
 * 
 * @param substep - The substep number
 * @param description - The substep description
 * @param status - The initial status
 * @returns A new SubStep instance
 */
export function createSubStep(
  substep: number,
  description: string,
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed' = 'not_started'
): SubStep {
  return SubStepSchema.parse({ substep, description, status });
}