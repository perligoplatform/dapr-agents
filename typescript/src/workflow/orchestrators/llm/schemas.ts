/**
 * Schema definitions for LLM orchestrator message types and validation.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/schemas.py
 * 
 * Provides TypeScript equivalents for:
 * - BroadcastMessage - Messages broadcast to multiple agents
 * - AgentTaskResponse - Response messages from agents
 * - TriggerAction - Messages to trigger agent activities
 * - NextStep - Next step decisions in workflow
 * - ProgressCheckOutput - Progress evaluation results
 * - JSON schema generation for prompts
 */

import { z } from 'zod';
import { PlanStepSchema, type PlanStep } from './state';

/**
 * Base message structure for agent communication.
 * PYTHON EQUIVALENT: dapr_agents/types/message.py (BaseMessage)
 */
export const BaseMessageSchema = z.object({
  name: z.string().describe('Name of the sender'),
  role: z.string().describe('Role of the sender (e.g., "user", "assistant")'),
  content: z.string().describe('Message content'),
});

export type BaseMessage = z.infer<typeof BaseMessageSchema>;

/**
 * Represents a broadcast message from an agent.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/schemas.py:11-15 (class BroadcastMessage)
 */
export const BroadcastMessageSchema = BaseMessageSchema;
export type BroadcastMessage = BaseMessage;

/**
 * Represents a response message from an agent after completing a task.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/schemas.py:18-24 (class AgentTaskResponse)
 */
export const AgentTaskResponseSchema = BaseMessageSchema.extend({
  workflowInstanceId: z.string().optional().describe('Dapr workflow instance id from source if available'),
});

export type AgentTaskResponse = z.infer<typeof AgentTaskResponseSchema>;

/**
 * Represents a message used to trigger an agent's activity within the workflow.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/schemas.py:27-38 (class TriggerAction)
 */
export const TriggerActionSchema = z.object({
  task: z.string().optional().describe('The specific task to execute. If not provided, the agent can act based on its memory or predefined behavior'),
  workflowInstanceId: z.string().optional().describe('Dapr workflow instance id from source if available'),
});

export type TriggerAction = z.infer<typeof TriggerActionSchema>;

/**
 * Represents the next step in a workflow, including the next agent to respond,
 * an instruction message for that agent and the step id and substep id if applicable.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/schemas.py:41-59 (class NextStep)
 */
export const NextStepSchema = z.object({
  nextAgent: z.string().describe('The name of the agent selected to respond next'),
  instruction: z.string().describe('A direct message instructing the agent on their next action'),
  step: z.number().int().describe('The step number the agent will be working on'),
  substep: z.number().optional().describe('The substep number (if applicable) the agent will be working on'),
});

export type NextStep = z.infer<typeof NextStepSchema>;

/**
 * Encapsulates the structured execution plan.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/schemas.py:62-66 (class TaskPlan)
 */
export const TaskPlanSchema = z.object({
  plan: z.array(PlanStepSchema).describe('Structured execution plan'),
});

export type TaskPlan = z.infer<typeof TaskPlanSchema>;

/**
 * Represents a status update for a plan step or substep.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/schemas.py:69-78 (class PlanStatusUpdate)
 */
export const PlanStatusUpdateSchema = z.object({
  step: z.number().int().describe('Step identifier (integer)'),
  substep: z.number().optional().describe('Substep identifier (float, e.g., 1.1, 2.3). Set to undefined if updating a step'),
  status: z.enum(['not_started', 'in_progress', 'blocked', 'completed']).describe('Updated status for the step or sub-step'),
});

export type PlanStatusUpdate = z.infer<typeof PlanStatusUpdateSchema>;

/**
 * Represents the result of a progress check evaluation.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/schemas.py:81-95 (class ProgressCheckOutput)
 */
export const ProgressCheckOutputSchema = z.object({
  verdict: z.enum(['continue', 'completed', 'failed']).describe('Task status: "continue" (in progress), "completed" (done), or "failed" (unresolved issue)'),
  planNeedsUpdate: z.boolean().describe('Indicates whether the plan requires updates (true/false)'),
  planStatusUpdate: z.array(PlanStatusUpdateSchema).optional().describe('List of status updates for steps or sub-steps. Each entry must contain step, optional substep, and status'),
  planRestructure: z.array(PlanStepSchema).optional().describe('A list of restructured steps. Only one step should be modified at a time'),
});

export type ProgressCheckOutput = z.infer<typeof ProgressCheckOutputSchema>;

/**
 * JSON schema utilities for LLM prompt integration.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/schemas.py:98-121 (class Schemas)
 */
export class LLMSchemas {
  private static _instance: LLMSchemas;

  static get instance(): LLMSchemas {
    if (!this._instance) {
      this._instance = new LLMSchemas();
    }
    return this._instance;
  }

  /**
   * Get JSON schema for execution plan.
   * PYTHON EQUIVALENT: schemas.plan property
   */
  get plan(): string {
    const schema = TaskPlanSchema.shape.plan._def;
    return JSON.stringify(schema);
  }

  /**
   * Get JSON schema for progress check output.
   * PYTHON EQUIVALENT: schemas.progress_check property
   */
  get progressCheck(): string {
    const schema = ProgressCheckOutputSchema._def;
    return JSON.stringify(this.enforceStrictJsonSchema(schema));
  }

  /**
   * Get JSON schema for next step decision.
   * PYTHON EQUIVALENT: schemas.next_step property
   */
  get nextStep(): string {
    const schema = NextStepSchema._def;
    return JSON.stringify(schema);
  }

  /**
   * Enforces strict JSON schema formatting.
   * PYTHON EQUIVALENT: StructureHandler.enforce_strict_json_schema
   * 
   * @param schema - The Zod schema definition
   * @returns Formatted schema object
   */
  private enforceStrictJsonSchema(schema: any): any {
    // This is a simplified version - in practice you might want to implement
    // more sophisticated schema transformation similar to the Python version
    return schema;
  }
}

// Export singleton instance for easy access
export const schemas = LLMSchemas.instance;

/**
 * Helper function to create a BroadcastMessage.
 */
export function createBroadcastMessage(name: string, role: string, content: string): BroadcastMessage {
  return BroadcastMessageSchema.parse({ name, role, content });
}

/**
 * Helper function to create an AgentTaskResponse.
 */
export function createAgentTaskResponse(
  name: string, 
  role: string, 
  content: string, 
  workflowInstanceId?: string
): AgentTaskResponse {
  return AgentTaskResponseSchema.parse({ name, role, content, workflowInstanceId });
}

/**
 * Helper function to create a TriggerAction.
 */
export function createTriggerAction(task?: string, workflowInstanceId?: string): TriggerAction {
  return TriggerActionSchema.parse({ task, workflowInstanceId });
}

/**
 * Helper function to create a NextStep.
 */
export function createNextStep(
  nextAgent: string,
  instruction: string,
  step: number,
  substep?: number
): NextStep {
  return NextStepSchema.parse({ nextAgent, instruction, step, substep });
}