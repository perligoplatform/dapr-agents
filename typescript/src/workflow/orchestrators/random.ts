import { z } from 'zod';
import { WorkflowContext } from '@dapr/dapr';
import { OrchestratorWorkflowBase, OrchestratorWorkflowConfigSchema } from './base.js';
import { TriggerAction, TriggerActionSchema, AgentTaskResponse, AgentTaskResponseSchema, BroadcastMessage } from './schemas.js';
import { task, workflow } from '../decorators/index.js';

/**
 * Configuration schema for RandomOrchestrator
 */
export const RandomOrchestratorConfigSchema = z.object({
  currentSpeaker: z.string().optional().describe('Current speaker in the conversation, to avoid immediate repeats when possible.'),
}).merge(OrchestratorWorkflowConfigSchema);

export type RandomOrchestratorConfig = z.infer<typeof RandomOrchestratorConfigSchema>;

/**
 * Implements a random workflow where agents are selected randomly to perform tasks.
 * The workflow iterates through conversations, selecting a random agent at each step.
 * 
 * Runs in a single for-loop, breaking when max_iterations is reached.
 * 
 * PYTHON EQUIVALENT: RandomOrchestrator class from random.py
 */
export class RandomOrchestrator extends OrchestratorWorkflowBase {
  public currentSpeaker?: string;
  private randomWorkflowName: string = 'RandomWorkflow';

  constructor(config: RandomOrchestratorConfig) {
    super(config);
    this.currentSpeaker = config.currentSpeaker;
    
    // Initialize workflow name (PYTHON EQUIVALENT: model_post_init in random.py line 63)
    this.randomWorkflowName = 'RandomWorkflow';
    
    this.initializeRandomOrchestrator();
  }

  /**
   * Initialize the random orchestrator
   * PYTHON EQUIVALENT: model_post_init method in random.py line 60
   */
  private async initializeRandomOrchestrator(): Promise<void> {
    // Register the main workflow
    this.registerWorkflow(this.randomWorkflowName, this.mainWorkflow.bind(this));
    
    // Register required tasks
    this.registerTask('processInput', this.processInput.bind(this));
    this.registerTask('selectRandomSpeaker', this.selectRandomSpeaker.bind(this));
    this.registerTask('triggerAgent', this.triggerAgent.bind(this));
    this.registerTask('broadcastMessageToAgents', this.broadcastMessageToAgents.bind(this));
  }

  /**
   * Executes the random workflow in up to `this.maxIterations` turns, selecting
   * a different (or same) agent at random each turn.
   * 
   * PYTHON EQUIVALENT: main_workflow method in random.py line 67
   * 
   * @param ctx Workflow context
   * @param input Contains task information
   * @returns The final message content when the workflow terminates
   */
  public async mainWorkflow(ctx: WorkflowContext, input: TriggerAction): Promise<string> {
    // Step 1: Gather initial task and instance ID
    const task = input.task;
    const instanceId = (ctx as any).instanceId || 'unknown'; // Temporary fix for API
    let finalOutput: string | undefined;

    console.log(`🎲 Starting Random Workflow for instance: ${instanceId}`);

    // Single loop from turn 1 to maxIterations inclusive
    for (let turn = 1; turn <= this.maxIterations; turn++) {
      console.log(`Random workflow turn ${turn}/${this.maxIterations} (Instance ID: ${instanceId})`);

      // Step 2: On turn 1, process initial task and broadcast
      if (turn === 1) {
        const message = await (ctx as any).callActivity('processInput', { task });
        console.log(`Initial message from ${(message as any).role} -> ${this.name}`);
        
        await (ctx as any).callActivity('broadcastMessageToAgents', { message });
      }

      // Step 3: Select a random speaker
      const randomSpeaker = await (ctx as any).callActivity('selectRandomSpeaker');
      console.log(`${this.name} selected ${randomSpeaker} (Turn ${turn}).`);

      // Step 4: Trigger the agent
      await (ctx as any).callActivity('triggerAgent', { 
        name: randomSpeaker, 
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
    return finalOutput || 'Workflow completed without final output';
  }

  /**
   * Process the initial input and create a message
   * PYTHON EQUIVALENT: process_input task in random.py
   */
  private async processInput(context: any, input: { task?: string }): Promise<any> {
    return {
      role: 'user',
      content: input.task || 'Please proceed with the task',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Select a random speaker from available agents
   * PYTHON EQUIVALENT: select_random_speaker task in random.py
   */
  private async selectRandomSpeaker(): Promise<string> {
    try {
      const agents = await this.getAgentsMetadata(true, true); // Exclude self and orchestrator
      const agentNames = Object.keys(agents);
      
      if (agentNames.length === 0) {
        throw new Error('No agents available for selection');
      }

      // Filter out current speaker to avoid immediate repeats when possible
      let availableAgents = agentNames;
      if (this.currentSpeaker && agentNames.length > 1) {
        availableAgents = agentNames.filter(name => name !== this.currentSpeaker);
      }

      // Select random agent
      const randomIndex = Math.floor(Math.random() * availableAgents.length);
      const selectedAgent = availableAgents[randomIndex];
      
      // Update current speaker
      this.currentSpeaker = selectedAgent;
      
      return selectedAgent!; // We know it exists due to the length check
    } catch (error) {
      console.error('Error selecting random speaker:', error);
      throw error;
    }
  }

  /**
   * Process responses from agents
   * PYTHON EQUIVALENT: process_agent_response method in random.py
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
   * PYTHON EQUIVALENT: broadcast_message_to_agents method in random.py
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
   * PYTHON EQUIVALENT: trigger_agent method in random.py
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
}