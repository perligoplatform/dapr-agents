import { z } from 'zod';
import { WorkflowContext } from '@dapr/dapr';
import { OrchestratorWorkflowBase, OrchestratorWorkflowConfigSchema } from './base.js';
import { TriggerAction, AgentTaskResponse } from './schemas.js';

/**
 * Configuration schema for RoundRobinOrchestrator
 */
export const RoundRobinOrchestratorConfigSchema = z.object({
  currentAgentIndex: z.number().default(0).describe('Current index in the agent list for round-robin selection.'),
}).merge(OrchestratorWorkflowConfigSchema);

export type RoundRobinOrchestratorConfig = z.infer<typeof RoundRobinOrchestratorConfigSchema>;

/**
 * Implements a round-robin workflow where agents take turns performing tasks.
 * Iterates for up to `this.maxIterations` turns, then returns the last reply.
 * 
 * PYTHON EQUIVALENT: RoundRobinOrchestrator class from roundrobin.py
 */
export class RoundRobinOrchestrator extends OrchestratorWorkflowBase {
  public currentAgentIndex: number;
  private roundRobinWorkflowName: string = 'RoundRobinWorkflow';
  private agentNames: string[] = [];

  constructor(config: RoundRobinOrchestratorConfig) {
    super(config);
    this.currentAgentIndex = config.currentAgentIndex ?? 0;
    
    this.initializeRoundRobinOrchestrator();
  }

  /**
   * Initialize the round robin orchestrator
   * PYTHON EQUIVALENT: model_post_init method in roundrobin.py
   */
  private async initializeRoundRobinOrchestrator(): Promise<void> {
    // Register the main workflow
    this.registerWorkflow(this.roundRobinWorkflowName, this.mainWorkflow.bind(this));
    
    // Register required tasks
    this.registerTask('processInput', this.processInput.bind(this));
    this.registerTask('selectNextAgent', this.selectNextAgent.bind(this));
    this.registerTask('triggerAgent', this.triggerAgent.bind(this));
    this.registerTask('broadcastMessageToAgents', this.broadcastMessageToAgents.bind(this));
    
    // Initialize agent list
    await this.refreshAgentList();
  }

  /**
   * Refresh the list of available agents
   */
  private async refreshAgentList(): Promise<void> {
    try {
      const agents = await this.getAgentsMetadata(true, true); // Exclude self and orchestrator
      this.agentNames = Object.keys(agents);
      
      // Reset index if it's out of bounds
      if (this.currentAgentIndex >= this.agentNames.length) {
        this.currentAgentIndex = 0;
      }
      
      console.log(`🔄 Agent list refreshed: ${this.agentNames.join(', ')}`);
    } catch (error) {
      console.error('Error refreshing agent list:', error);
      this.agentNames = [];
    }
  }

  /**
   * Executes the round-robin workflow in up to `this.maxIterations` turns,
   * selecting agents in sequential order.
   * 
   * PYTHON EQUIVALENT: main_workflow method in roundrobin.py
   * 
   * @param ctx Workflow context
   * @param input Contains task information
   * @returns The final message content when the workflow terminates
   */
  public async mainWorkflow(ctx: WorkflowContext, input: TriggerAction): Promise<string> {
    // Step 1: Gather initial task and instance ID
    const task = input.task;
    const instanceId = (ctx as any).instanceId || 'unknown';
    let finalOutput: string | undefined;

    console.log(`🔁 Starting Round Robin Workflow for instance: ${instanceId}`);

    // Refresh agent list at the start
    await this.refreshAgentList();

    if (this.agentNames.length === 0) {
      return 'No agents available for round-robin workflow';
    }

    // Single loop from turn 1 to maxIterations inclusive
    for (let turn = 1; turn <= this.maxIterations; turn++) {
      console.log(`Round Robin workflow turn ${turn}/${this.maxIterations} (Instance ID: ${instanceId})`);

      // Step 2: On turn 1, process initial task and broadcast
      if (turn === 1) {
        const message = await (ctx as any).callActivity('processInput', { task });
        console.log(`Initial message from ${(message as any).role} -> ${this.name}`);
        
        await (ctx as any).callActivity('broadcastMessageToAgents', { message });
      }

      // Step 3: Select next agent in round-robin fashion
      const nextAgent = await (ctx as any).callActivity('selectNextAgent');
      console.log(`${this.name} selected ${nextAgent} (Turn ${turn}, Index: ${this.currentAgentIndex}).`);

      // Step 4: Trigger the agent
      await (ctx as any).callActivity('triggerAgent', { 
        name: nextAgent, 
        instanceId 
      });

      // Step 5: Await for agent response or timeout
      console.log('Waiting for agent response...');
      
      const eventData = (ctx as any).waitForExternalEvent('AgentTaskResponse');
      const timeoutTask = (ctx as any).createTimer(this.timeout * 1000); // Convert to milliseconds
      
      const result = await Promise.race([eventData, timeoutTask]);

      // Step 6: Handle response or timeout
      let agentResult: any;
      if (result === timeoutTask) {
        console.warn(`Turn ${turn}: agent response timed out (Instance ID: ${instanceId}).`);
        agentResult = {
          name: 'timeout',
          content: '⏰ Timeout occurred. Continuing...',
        };
      } else {
        agentResult = result;
        console.log(`${agentResult.name} -> ${this.name}`);
      }

      // Step 7: If this is the last allowed turn, mark final_output and break
      if (turn === this.maxIterations) {
        console.log(`Turn ${turn}: max iterations reached (Instance ID: ${instanceId}).`);
        finalOutput = agentResult.content;
        break;
      }

      // Otherwise, feed into next turn
      // task = agentResult.content; // Prepare for next iteration
    }

    // Return final output or default message
    return finalOutput || 'Round Robin workflow completed without final output';
  }

  /**
   * Process the initial input and create a message
   * PYTHON EQUIVALENT: process_input task in roundrobin.py
   */
  private async processInput(context: any, input: { task?: string }): Promise<any> {
    return {
      role: 'user',
      content: input.task || 'Please proceed with the task',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Select the next agent in round-robin order
   * PYTHON EQUIVALENT: select_next_agent task in roundrobin.py
   */
  private async selectNextAgent(): Promise<string> {
    if (this.agentNames.length === 0) {
      throw new Error('No agents available for round-robin selection');
    }

    // Get current agent
    const selectedAgent = this.agentNames[this.currentAgentIndex];
    
    if (!selectedAgent) {
      throw new Error(`No agent found at index ${this.currentAgentIndex}`);
    }
    
    // Advance to next agent (wrap around if at end)
    this.currentAgentIndex = (this.currentAgentIndex + 1) % this.agentNames.length;
    
    return selectedAgent;
  }

  /**
   * Process responses from agents
   * PYTHON EQUIVALENT: process_agent_response method in roundrobin.py
   */
  public async processAgentResponse(message: AgentTaskResponse): Promise<void> {
    console.log(`📨 Processing agent response from ${message.role}: ${message.content}`);
    
    // Store the response in memory if memory is available
    if (this.memory) {
      // TODO: Implement proper memory storage interface
      console.log('Memory storage not yet implemented for agent responses');
    }
  }

  /**
   * Broadcast a message to all registered agents
   * PYTHON EQUIVALENT: broadcast_message_to_agents method in roundrobin.py
   */
  public async broadcastMessageToAgents(kwargs?: { message?: any }): Promise<void> {
    if (!kwargs?.message) {
      console.warn('No message provided for broadcasting');
      return;
    }

    try {
      console.log(`📢 Broadcasting message: ${kwargs.message.content}`);
      
      // Get all registered agents
      const agents = await this.getAgentsMetadata(true, true); // Exclude self and orchestrator
      
      // Broadcast to each agent
      for (const [agentName, agentMetadata] of Object.entries(agents)) {
        try {
          await this.publishMessage(
            agentMetadata.topic || `${agentName}.events`,
            kwargs.message,
            {
              sender: this.name,
              broadcast: 'true',
            }
          );
          console.log(`✅ Broadcasted to ${agentName}`);
        } catch (error) {
          console.error(`❌ Failed to broadcast to ${agentName}:`, error);
        }
      }
    } catch (error) {
      console.error('Error broadcasting message to agents:', error);
      throw error;
    }
  }

  /**
   * Trigger a specific agent to perform an action
   * PYTHON EQUIVALENT: trigger_agent method in roundrobin.py
   */
  public async triggerAgent(name: string, instanceId: string, kwargs?: Record<string, any>): Promise<void> {
    try {
      console.log(`🎯 Triggering agent: ${name} for instance: ${instanceId}`);
      
      const triggerMessage: TriggerAction = {
        task: kwargs?.task,
        workflowInstanceId: instanceId,
      };

      // Get agent metadata to find the correct topic
      const agents = await this.getAgentsMetadata(false, false);
      const agentMetadata = agents[name];
      
      if (!agentMetadata) {
        throw new Error(`Agent ${name} not found in registry`);
      }

      // Publish trigger message to agent's topic
      await this.publishMessage(
        agentMetadata.topic || `${name}.trigger`,
        triggerMessage,
        {
          sender: this.name,
          targetAgent: name,
          workflowInstanceId: instanceId,
        }
      );
      
      console.log(`✅ Successfully triggered ${name}`);
    } catch (error) {
      console.error(`❌ Failed to trigger agent ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get the current agent index for debugging
   */
  public getCurrentAgentIndex(): number {
    return this.currentAgentIndex;
  }

  /**
   * Get the list of agent names
   */
  public getAgentNames(): string[] {
    return [...this.agentNames]; // Return a copy
  }

  /**
   * Reset the round-robin index to start from the beginning
   */
  public resetIndex(): void {
    this.currentAgentIndex = 0;
    console.log('🔄 Round-robin index reset to 0');
  }
}