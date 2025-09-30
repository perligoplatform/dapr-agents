import { z } from 'zod';
import { EventEmitter } from 'events';
import { DaprClient } from '@dapr/dapr';
import { ConcreteAgent, AgentConfig } from './concreteAgent.js';
import { 
  DurableAgentWorkflowState, 
  DurableAgentWorkflowEntry,
  DurableAgentMessage,
  DaprWorkflowStatus,
  createInitialWorkflowState,
  createWorkflowEntry,
  createDurableAgentMessage
} from './durableAgentState.js';
import {
  TriggerAction,
  BroadcastMessage,
  AgentTaskResponse,
  createBroadcastMessage,
  createAgentTaskResponse
} from './durableAgentSchemas.js';
import { BaseMessage, UserMessage, AssistantMessage, ToolMessage } from '../types/message.js';
import { ToolExecutionRecord } from '../types/tools.js';

/**
 * Configuration schema for DurableAgent extending AgentConfig
 */
export const DurableAgentConfigSchema = z.object({
  // Inherit all AgentConfig properties
  name: z.string().optional(),
  role: z.string().optional(),
  goal: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  llm: z.any().optional(),
  promptTemplate: z.any().optional(),
  tools: z.array(z.any()).optional().default([]),
  toolChoice: z.string().optional(),
  maxIterations: z.number().optional().default(10),
  memory: z.any().optional(),
  templateFormat: z.enum(['f-string', 'jinja2']).optional().default('jinja2'),
  
  // DurableAgent-specific properties
  agentTopicName: z.string().optional(),
  agentMetadata: z.record(z.any()).optional(),
  workflowInstanceId: z.string().optional(),
  daprAppId: z.string().optional().default('dapr-agents'),
  daprHost: z.string().optional().default('127.0.0.1'),
  daprPort: z.string().optional().default('3500'),
  stateStoreName: z.string().optional().default('statestore'),
  pubSubName: z.string().optional().default('messagebus'),
  broadcastTopicName: z.string().optional(),
});

export type DurableAgentConfig = z.infer<typeof DurableAgentConfigSchema>;

/**
 * DurableAgent - A stateful, workflow-integrated agent that uses Dapr for state persistence and messaging
 * 
 * This agent extends ConcreteAgent with:
 * - Persistent state management via Dapr state store
 * - Workflow execution with resumption capabilities  
 * - Message routing and pub/sub integration
 * - Tool execution in workflow context
 * - Multi-agent orchestration support
 */
export class DurableAgent extends ConcreteAgent {
  public readonly agentTopicName?: string;
  public agentMetadata?: Record<string, any>;
  public workflowInstanceId?: string;
  public readonly daprClient: DaprClient;
  public readonly stateStoreName: string;
  public readonly pubSubName: string;
  public readonly broadcastTopicName?: string;
  
  // Workflow state management
  protected workflowState: DurableAgentWorkflowState;
  protected readonly workflowName = 'AgenticWorkflow';
  
  constructor(config: Partial<DurableAgentConfig> = {}) {
    super(config);
    
    const validated = DurableAgentConfigSchema.parse(config);
    
    // Set agent topic name from name if not provided
    this.agentTopicName = validated.agentTopicName || this.name;
    if (validated.agentMetadata !== undefined) {
      this.agentMetadata = validated.agentMetadata;
    }
    if (validated.workflowInstanceId !== undefined) {
      this.workflowInstanceId = validated.workflowInstanceId;
    }
    this.stateStoreName = validated.stateStoreName!;
    this.pubSubName = validated.pubSubName!;
    if (validated.broadcastTopicName !== undefined) {
      this.broadcastTopicName = validated.broadcastTopicName;
    }
    
    // Initialize Dapr client
    this.daprClient = new DaprClient({
      daprHost: validated.daprHost!,
      daprPort: validated.daprPort!,
    });
    
    // Initialize workflow state
    this.workflowState = createInitialWorkflowState();
    
    this._postInitDurable();
  }

  /**
   * Post-initialization for durable agent specific setup
   */
  protected _postInitDurable(): void {
    // Set up agent metadata
    this.agentMetadata = {
      name: this.name,
      role: this.role,
      goal: this.goal,
      instructions: this.instructions,
      topicName: this.agentTopicName,
      pubSubName: this.pubSubName,
      orchestrator: false,
    };

    console.log(`🔧 DurableAgent initialized: ${this.name}`);
    console.log(`📡 Topic: ${this.agentTopicName}`);
    console.log(`🗄️  State store: ${this.stateStoreName}`);
    console.log(`📬 PubSub: ${this.pubSubName}`);
  }

  /**
   * Load workflow state from Dapr state store
   */
  public async loadState(): Promise<void> {
    try {
      const stateKey = `agent_state_${this.name}`;
      const response = await this.daprClient.state.get(this.stateStoreName, stateKey);
      
      if (response) {
        this.workflowState = response as DurableAgentWorkflowState;
        console.log(`📥 Loaded state for agent ${this.name}`);
        
        // Load current workflow instance ID if it exists
        this._loadCurrentWorkflowInstance();
      } else {
        console.log(`📝 No existing state found for agent ${this.name}, using initial state`);
      }
    } catch (error) {
      console.error(`❌ Failed to load state for agent ${this.name}:`, error);
      // Continue with initial state
    }
  }

  /**
   * Save workflow state to Dapr state store
   */
  public async saveState(): Promise<void> {
    try {
      const stateKey = `agent_state_${this.name}`;
      await this.daprClient.state.save(this.stateStoreName, [
        {
          key: stateKey,
          value: this.workflowState,
        }
      ]);
      console.log(`💾 Saved state for agent ${this.name}`);
    } catch (error) {
      console.error(`❌ Failed to save state for agent ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Load current workflow instance ID from state
   */
  private _loadCurrentWorkflowInstance(): void {
    const instances = this.workflowState.instances;
    for (const [instanceId, instance] of Object.entries(instances)) {
      if (instance.workflow_name === this.workflowName && 
          instance.status === DaprWorkflowStatus.RUNNING) {
        this.workflowInstanceId = instanceId;
        console.log(`🔄 Loaded running workflow instance: ${instanceId}`);
        break;
      }
    }
  }

  /**
   * Override run method to use workflow execution
   */
  public async run(inputData?: string | Record<string, any>): Promise<any> {
    console.log(`🚀 DurableAgent.run() called with input:`, inputData);
    
    // Load latest state
    await this.loadState();
    
    // Prepare input payload for workflow
    let inputPayload: Record<string, any>;
    if (typeof inputData === 'string') {
      inputPayload = { task: inputData };
    } else if (inputData && typeof inputData === 'object') {
      inputPayload = inputData;
    } else {
      inputPayload = { task: 'Process user request' };
    }

    try {
      // For now, simulate workflow execution until we have full Dapr workflow integration
      const result = await this.simulateWorkflowExecution(inputPayload);
      return result;
    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Simulate workflow execution (placeholder for actual Dapr workflow integration)
   */
  private async simulateWorkflowExecution(input: Record<string, any>): Promise<any> {
    // Generate a workflow instance ID
    const instanceId = crypto.randomUUID();
    this.workflowInstanceId = instanceId;
    
    console.log(`🔄 Starting simulated workflow instance: ${instanceId}`);
    
    // Create workflow entry
    const workflowEntry = createWorkflowEntry(
      input.task || 'Simulated workflow task',
      instanceId,
      'direct'
    );
    workflowEntry.workflow_name = this.workflowName;
    workflowEntry.status = DaprWorkflowStatus.RUNNING;
    
    // Add to state
    this.workflowState.instances[instanceId] = workflowEntry;
    
    try {
      // Process user message
      if (input.task) {
        const userMessage = createDurableAgentMessage(input.task, 'user');
        workflowEntry.messages.push(userMessage);
        this.memory.addMessage({
          role: 'user',
          content: input.task,
          timestamp: new Date(),
        } as BaseMessage);
      }

      // Generate LLM response if available
      if (this.llm) {
        const messages = this._constructMessagesFromWorkflowHistory(instanceId);
        
        // Simple LLM call simulation
        const assistantMessage = createDurableAgentMessage(
          `I processed your request: "${input.task}". As a DurableAgent, I maintain state across interactions and can resume workflows.`,
          'assistant',
          this.name
        );
        
        workflowEntry.messages.push(assistantMessage);
        workflowEntry.last_message = assistantMessage;
        
        this.memory.addMessage({
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: new Date(),
        } as BaseMessage);
        
        // Mark as completed
        workflowEntry.status = DaprWorkflowStatus.COMPLETED;
        workflowEntry.end_time = new Date();
        workflowEntry.output = assistantMessage.content;
        
        // Save state
        await this.saveState();
        
        console.log(`✅ Workflow ${instanceId} completed successfully`);
        
        return {
          role: 'assistant',
          content: assistantMessage.content,
          workflow_instance_id: instanceId,
          timestamp: assistantMessage.timestamp,
        };
      } else {
        throw new Error('No LLM client configured for this durable agent');
      }
    } catch (error) {
      // Mark workflow as failed
      workflowEntry.status = DaprWorkflowStatus.FAILED;
      workflowEntry.end_time = new Date();
      await this.saveState();
      throw error;
    }
  }

  /**
   * Construct messages from workflow history instead of global memory
   */
  private _constructMessagesFromWorkflowHistory(instanceId: string): any[] {
    const instance = this.workflowState.instances[instanceId];
    if (!instance) {
      return [];
    }

    // Convert durable messages to format expected by LLM
    return instance.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      name: msg.name,
      tool_calls: msg.tool_calls,
      tool_call_id: msg.tool_call_id,
    }));
  }

  /**
   * Broadcast message to other agents
   */
  public async broadcastMessage(message: BroadcastMessage): Promise<void> {
    if (!this.broadcastTopicName) {
      console.warn('⚠️ No broadcast topic configured, skipping broadcast');
      return;
    }

    try {
      await this.daprClient.pubsub.publish(
        this.pubSubName,
        this.broadcastTopicName,
        message
      );
      console.log(`📡 Broadcasted message to topic: ${this.broadcastTopicName}`);
    } catch (error) {
      console.error('❌ Failed to broadcast message:', error);
      throw error;
    }
  }

  /**
   * Send message to specific agent
   */
  public async sendMessageToAgent(agentName: string, message: AgentTaskResponse): Promise<void> {
    try {
      await this.daprClient.pubsub.publish(
        this.pubSubName,
        agentName, // Topic name is the agent name
        message
      );
      console.log(`📤 Sent message to agent: ${agentName}`);
    } catch (error) {
      console.error(`❌ Failed to send message to agent ${agentName}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow instances
   */
  public getWorkflowInstances(): Record<string, DurableAgentWorkflowEntry> {
    return this.workflowState.instances;
  }

  /**
   * Get current workflow instance
   */
  public getCurrentWorkflowInstance(): DurableAgentWorkflowEntry | undefined {
    if (!this.workflowInstanceId) {
      return undefined;
    }
    return this.workflowState.instances[this.workflowInstanceId];
  }

  /**
   * Reset workflow state
   */
  public async resetWorkflowState(): Promise<void> {
    this.workflowState = createInitialWorkflowState();
    if (this.workflowInstanceId !== undefined) {
      (this as any).workflowInstanceId = undefined;
    }
    await this.saveState();
    console.log(`🔄 Reset workflow state for agent: ${this.name}`);
  }

  /**
   * Cleanup resources
   */
  public async shutdown(): Promise<void> {
    console.log(`🛑 Shutting down DurableAgent: ${this.name}`);
    
    // Save final state
    try {
      await this.saveState();
    } catch (error) {
      console.error('❌ Failed to save final state during shutdown:', error);
    }

    // Note: DaprClient doesn't have a close method in the current version
    // The client will be cleaned up when the process exits

    // Call parent cleanup
    if (this._shutdownResolver) {
      this._shutdownResolver();
    }
  }
}