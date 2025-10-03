import { z } from 'zod';
import { WorkflowContext } from '@dapr/dapr';
import { AgenticWorkflow, AgenticWorkflowConfigSchema } from '../agentic.js';

/**
 * Configuration schema for OrchestratorWorkflowBase
 */
export const OrchestratorWorkflowConfigSchema = z.object({
  orchestratorTopicName: z.string().optional().describe('The topic name dedicated to this specific orchestrator, derived from the orchestrator\'s name if not provided.'),
}).merge(AgenticWorkflowConfigSchema);

export type OrchestratorWorkflowConfig = z.infer<typeof OrchestratorWorkflowConfigSchema>;

/**
 * Base class for orchestrator workflows that manage agent interactions.
 * 
 * This class extends AgenticWorkflow to provide orchestration capabilities,
 * managing multiple agents and coordinating their interactions through workflows.
 * 
 * PYTHON EQUIVALENT: OrchestratorWorkflowBase class from base.py
 */
export abstract class OrchestratorWorkflowBase extends AgenticWorkflow {
  public orchestratorTopicName?: string;
  
  protected orchestratorMetadata?: Record<string, any>;

  constructor(config: OrchestratorWorkflowConfig) {
    super(config);
    
    // Set orchestrator topic name (derive from name if not provided)
    // PYTHON EQUIVALENT: set_orchestrator_topic_name validator in base.py line 22
    this.orchestratorTopicName = config.orchestratorTopicName || config.name;
    
    this.initializeOrchestrator();
  }

  /**
   * Initialize the orchestrator after construction.
   * PYTHON EQUIVALENT: model_post_init method in base.py line 27
   */
  private async initializeOrchestrator(): Promise<void> {
    // Prepare agent metadata
    this.orchestratorMetadata = {
      name: this.name,
      topicName: this.orchestratorTopicName,
      pubsubName: this.messageBusName,
      orchestrator: true,
    };

    // Register agentic system
    await this.registerAgenticSystem();

    // Start the runtime if it's not already running
    if (!this.wfRuntimeIsRunning) {
      await this.startRuntime();
    }
  }

  /**
   * Execute the primary workflow that coordinates agent interactions.
   * 
   * This is the main orchestration method that should be implemented by concrete
   * orchestrator classes to define their specific coordination logic.
   * 
   * PYTHON EQUIVALENT: main_workflow abstract method in base.py line 46
   * 
   * @param ctx The workflow execution context
   * @param message The input for this workflow iteration
   * @returns The workflow result or continuation
   */
  abstract mainWorkflow(ctx: WorkflowContext, message: any): Promise<any>;

  /**
   * Process responses from agents.
   * 
   * This method handles responses received from individual agents and determines
   * how they should be processed within the orchestration flow.
   * 
   * PYTHON EQUIVALENT: process_agent_response abstract method in base.py line 59
   * 
   * @param message The response message from an agent
   */
  abstract processAgentResponse(message: any): Promise<void>;

  /**
   * Broadcast a message to all registered agents.
   * 
   * This method sends a message to all agents that are currently registered
   * and active within the orchestration system.
   * 
   * PYTHON EQUIVALENT: broadcast_message_to_agents abstract method in base.py line 64
   * 
   * @param kwargs Additional parameters for the broadcast
   */
  abstract broadcastMessageToAgents(kwargs?: Record<string, any>): Promise<void>;

  /**
   * Trigger a specific agent to perform an action.
   * 
   * This method directly invokes a specific agent by name to perform a task
   * or action within the workflow context.
   * 
   * PYTHON EQUIVALENT: trigger_agent abstract method in base.py line 69
   * 
   * @param name The name of the agent to trigger
   * @param instanceId The workflow instance ID
   * @param kwargs Additional parameters for the agent trigger
   */
  abstract triggerAgent(name: string, instanceId: string, kwargs?: Record<string, any>): Promise<void>;

  /**
   * Get the orchestrator metadata
   */
  public getOrchestratorMetadata(): Record<string, any> | undefined {
    return this.orchestratorMetadata;
  }

  /**
   * Check if this workflow is an orchestrator
   */
  public isOrchestrator(): boolean {
    return true;
  }
}