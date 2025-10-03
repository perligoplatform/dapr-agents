import { z } from 'zod';
import { BaseMessage, BaseMessageSchema } from '../../types/message.js';

/**
 * Schema for broadcast messages from agents
 * PYTHON EQUIVALENT: BroadcastMessage class in random.py and roundrobin.py
 */
export const BroadcastMessageSchema = BaseMessageSchema.extend({
  // Additional fields can be added here as needed
});

export type BroadcastMessage = z.infer<typeof BroadcastMessageSchema>;

/**
 * Schema for agent task response messages
 * PYTHON EQUIVALENT: AgentTaskResponse class in random.py and roundrobin.py
 */
export const AgentTaskResponseSchema = BaseMessageSchema.extend({
  workflowInstanceId: z.string().optional().describe('Dapr workflow instance id from source if available'),
});

export type AgentTaskResponse = z.infer<typeof AgentTaskResponseSchema>;

/**
 * Schema for trigger action messages
 * PYTHON EQUIVALENT: TriggerAction class in random.py and roundrobin.py
 */
export const TriggerActionSchema = z.object({
  task: z.string().optional().describe('The specific task to execute. If not provided, the agent will act based on its memory or predefined behavior.'),
  workflowInstanceId: z.string().optional().describe('Dapr workflow instance id from source if available'),
});

export type TriggerAction = z.infer<typeof TriggerActionSchema>;