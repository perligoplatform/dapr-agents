import { z } from 'zod';
import { DaprClient } from '@dapr/dapr';
import { WorkflowApp, WorkflowAppConfigSchema } from './base.js';
import { MemoryBase } from '../base/memory.js';
import { BaseMessage } from '../types/message.js';

/**
 * Configuration schema for AgenticWorkflow
 */
export const AgenticWorkflowConfigSchema = z.object({
  name: z.string().describe('The name of the agentic system.'),
  messageBusName: z.string().describe('The name of the message bus component, defining the pub/sub base.'),
  broadcastTopicName: z.string().optional().describe('Default topic for broadcasting messages. Set explicitly for multi-agent setups.'),
  stateStoreName: z.string().describe('Dapr state store for workflow state.'),
  stateKey: z.string().default('workflow_state').describe('Dapr state key for workflow state storage.'),
  state: z.record(z.any()).default({}).describe('Current state of the workflow.'),
  stateFormat: z.any().optional().describe('Optional schema used to validate the persisted workflow state.'),
  agentsRegistryStoreName: z.string().describe('Dapr state store for agent metadata.'),
  agentsRegistryKey: z.string().default('agents_registry').describe('Key for agents registry in state store.'),
  maxIterations: z.number().int().positive().default(10).describe('Maximum iterations for workflows.'),
  memory: z.custom<MemoryBase>().optional().describe('Handles conversation history storage.'),
  saveStateLocally: z.boolean().default(true).describe('Whether to save workflow state locally.'),
  localStatePath: z.string().optional().describe('Local path for saving state files.'),
}).merge(WorkflowAppConfigSchema);

export type AgenticWorkflowConfig = z.infer<typeof AgenticWorkflowConfigSchema>;

/**
 * A class for managing agentic workflows, extending WorkflowApp.
 * Handles agent interactions, workflow execution, messaging, and metadata management.
 * 
 * This is the TypeScript equivalent of the Python AgenticWorkflow class.
 */
export class AgenticWorkflow extends WorkflowApp {
  public name: string;
  public messageBusName: string;
  public broadcastTopicName?: string;
  public stateStoreName: string;
  public stateKey: string;
  public state: Record<string, any>;
  public stateFormat?: any;
  public agentsRegistryStoreName: string;
  public agentsRegistryKey: string;
  public maxIterations: number;
  public memory?: MemoryBase;
  public saveStateLocally: boolean;
  public localStatePath?: string;
  public client?: DaprClient;

  // Private internal attributes
  private stateStoreClient?: any;
  private textFormatter?: any;
  private agentMetadata?: Record<string, any>;
  private workflowName?: string;
  private daprClient?: DaprClient;
  private isRunning: boolean = false;
  private shutdownEvent?: Promise<void>;
  private httpServer?: any;
  private subscriptions: Map<string, Function> = new Map();
  private topicHandlers: Map<string, Map<any, Function>> = new Map();

  constructor(config: AgenticWorkflowConfig) {
    super(config);
    
    this.name = config.name;
    this.messageBusName = config.messageBusName;
    if (config.broadcastTopicName !== undefined) {
      this.broadcastTopicName = config.broadcastTopicName;
    }
    this.stateStoreName = config.stateStoreName;
    this.stateKey = config.stateKey ?? 'workflow_state';
    this.state = config.state ?? {};
    this.stateFormat = config.stateFormat;
    this.agentsRegistryStoreName = config.agentsRegistryStoreName;
    this.agentsRegistryKey = config.agentsRegistryKey ?? 'agents_registry';
    this.maxIterations = config.maxIterations ?? 10;
    if (config.memory !== undefined) {
      this.memory = config.memory;
    }
    this.saveStateLocally = config.saveStateLocally ?? true;
    if (config.localStatePath !== undefined) {
      this.localStatePath = config.localStatePath;
    }

    // Initialize agent metadata
    this.agentMetadata = {
      name: this.name,
      type: 'agentic_workflow',
      messageBusName: this.messageBusName,
      broadcastTopicName: this.broadcastTopicName,
      stateStoreName: this.stateStoreName,
      agentsRegistryStoreName: this.agentsRegistryStoreName,
      timestamp: new Date().toISOString(),
    };

    this.initializeAgenticWorkflow();
  }

  /**
   * Post-initialization hook for the AgenticWorkflow.
   * 
   * This method initializes the workflow service, messaging, and metadata storage.
   * 
   * PYTHON EQUIVALENT: AgenticWorkflow.model_post_init() (lines 115-134 in agentic.py)
   */
  private async initializeAgenticWorkflow(): Promise<void> {
    try {
      this.daprClient = new DaprClient();
      console.log(`State store '${this.stateStoreName}' initialized.`);
      
      await this.initializeState();
      
      console.log('✅ AgenticWorkflow initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AgenticWorkflow:', error);
      throw error;
    }
  }

  /**
   * Initialize the workflow state from storage or create new state
   */
  private async initializeState(): Promise<void> {
    try {
      // Try to load existing state from Dapr state store
      const existingState = await this.getDataFromStore(this.stateStoreName, this.stateKey);
      
      if (existingState) {
        // Validate state format if specified
        if (this.stateFormat && this.stateFormat.parse) {
          try {
            this.state = this.stateFormat.parse(existingState);
          } catch (error) {
            console.warn('⚠️ State validation failed, using raw state:', error);
            this.state = existingState;
          }
        } else {
          this.state = existingState;
        }
        
        console.log(`📥 Loaded workflow state from store: ${this.stateKey}`);
      } else {
        // Initialize with default state
        this.state = {};
        await this.saveState();
        console.log(`📤 Initialized new workflow state: ${this.stateKey}`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize state:', error);
      // Continue with empty state
      this.state = {};
    }
  }

  /**
   * Retrieves the chat history from memory as a list of messages.
   * 
   * PYTHON EQUIVALENT: AgenticWorkflow.get_chat_history() (lines 136-163 in agentic.py)
   */
  public getChatHistory(task?: string): BaseMessage[] {
    if (!this.memory) {
      return [];
    }

    try {
      // If memory supports vector search and task is provided
      if (task && 'search' in this.memory) {
        // Use vector search if available
        return (this.memory as any).search(task);
      } else {
        // Get all messages
        return this.memory.getMessages() as BaseMessage[];
      }
    } catch (error) {
      console.error('❌ Failed to retrieve chat history:', error);
      return [];
    }
  }

  /**
   * Returns the full chat history as a list of messages.
   * 
   * PYTHON EQUIVALENT: AgenticWorkflow.chat_history property (lines 165-172 in agentic.py)
   */
  public get chatHistory(): BaseMessage[] {
    return this.getChatHistory();
  }

  /**
   * Retrieves data from the Dapr state store using the given key.
   * 
   * PYTHON EQUIVALENT: AgenticWorkflow.get_data_from_store() (lines 174-195 in agentic.py)
   */
  public async getDataFromStore(storeName: string, key: string): Promise<any | undefined> {
    if (!this.daprClient) {
      throw new Error('Dapr client not initialized');
    }

    try {
      const response = await this.daprClient.state.get(storeName, key);
      return response ? JSON.parse(response.toString()) : undefined;
    } catch (error) {
      console.warn(`⚠️ Error retrieving data for key '${key}' from store '${storeName}':`, error);
      return undefined;
    }
  }

  /**
   * Saves data to the Dapr state store with the given key.
   */
  public async saveDataToStore(storeName: string, key: string, data: any): Promise<void> {
    if (!this.daprClient) {
      throw new Error('Dapr client not initialized');
    }

    try {
      const serializedData = JSON.stringify(data);
      await this.daprClient.state.save(storeName, [{ key, value: serializedData }]);
      console.log(`💾 Saved data to store '${storeName}' with key '${key}'`);
    } catch (error) {
      console.error(`❌ Failed to save data to store '${storeName}' with key '${key}':`, error);
      throw error;
    }
  }

  /**
   * Save the current workflow state to the store
   */
  public async saveState(): Promise<void> {
    try {
      await this.saveDataToStore(this.stateStoreName, this.stateKey, this.state);
      
      // Also save locally if configured
      if (this.saveStateLocally && this.localStatePath) {
        await this.saveStateLocally_(this.state);
      }
    } catch (error) {
      console.error('❌ Failed to save workflow state:', error);
      throw error;
    }
  }

  /**
   * Save state to local file system
   */
  private async saveStateLocally_(state: any): Promise<void> {
    if (!this.localStatePath) {
      return;
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure directory exists
      const dir = path.dirname(this.localStatePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write state to file
      const stateJson = JSON.stringify(state, null, 2);
      await fs.writeFile(this.localStatePath, stateJson, 'utf-8');
      
      console.log(`💾 Saved state locally to: ${this.localStatePath}`);
    } catch (error) {
      console.error('❌ Failed to save state locally:', error);
    }
  }

  /**
   * Get metadata for registered agents
   * 
   * PYTHON EQUIVALENT: AgenticWorkflow.get_agents_metadata() (lines 197-243 in agentic.py)
   */
  public async getAgentsMetadata(excludeSelf: boolean = true, excludeOrchestrator: boolean = false): Promise<Record<string, any>> {
    try {
      const metadata = await this.getDataFromStore(this.agentsRegistryStoreName, this.agentsRegistryKey) || {};
      
      let filteredMetadata = { ...metadata };
      
      if (excludeSelf) {
        delete filteredMetadata[this.name];
      }
      
      if (excludeOrchestrator) {
        // Filter out orchestrator agents (assuming they have a specific type)
        filteredMetadata = Object.fromEntries(
          Object.entries(filteredMetadata).filter(([_, agent]: [string, any]) => 
            agent.type !== 'orchestrator'
          )
        );
      }
      
      return filteredMetadata;
    } catch (error) {
      console.error('❌ Failed to get agents metadata:', error);
      return {};
    }
  }

  /**
   * Register this agent in the agents registry
   */
  public async registerAgent(metadata: Record<string, any> = {}): Promise<void> {
    try {
      const existingRegistry = await this.getDataFromStore(this.agentsRegistryStoreName, this.agentsRegistryKey) || {};
      
      const agentMetadata = {
        name: this.name,
        type: 'agentic_workflow',
        messageBusName: this.messageBusName,
        broadcastTopicName: this.broadcastTopicName,
        timestamp: new Date().toISOString(),
        ...metadata,
      };
      
      existingRegistry[this.name] = agentMetadata;
      
      await this.saveDataToStore(this.agentsRegistryStoreName, this.agentsRegistryKey, existingRegistry);
      
      console.log(`🔐 Registered agent '${this.name}' in registry`);
    } catch (error) {
      console.error('❌ Failed to register agent:', error);
      throw error;
    }
  }

  /**
   * Unregister this agent from the agents registry
   */
  public async unregisterAgent(): Promise<void> {
    try {
      const existingRegistry = await this.getDataFromStore(this.agentsRegistryStoreName, this.agentsRegistryKey) || {};
      
      delete existingRegistry[this.name];
      
      await this.saveDataToStore(this.agentsRegistryStoreName, this.agentsRegistryKey, existingRegistry);
      
      console.log(`🔓 Unregistered agent '${this.name}' from registry`);
    } catch (error) {
      console.error('❌ Failed to unregister agent:', error);
    }
  }

  /**
   * Publish a message to a topic
   */
  public async publishMessage(topic: string, data: any, metadata?: Record<string, string>): Promise<void> {
    if (!this.daprClient) {
      throw new Error('Dapr client not initialized');
    }

    try {
      await this.daprClient.pubsub.publish(this.messageBusName, topic, data, metadata);
      console.log(`📢 Published message to topic '${topic}'`);
    } catch (error) {
      console.error(`❌ Failed to publish message to topic '${topic}':`, error);
      throw error;
    }
  }

  /**
   * Broadcast a message to the default broadcast topic
   */
  public async broadcastMessage(data: any, metadata?: Record<string, string>): Promise<void> {
    if (!this.broadcastTopicName) {
      throw new Error('Broadcast topic name not configured');
    }

    await this.publishMessage(this.broadcastTopicName, data, metadata);
  }

  /**
   * Wait for specified milliseconds
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
  /**
   * Stop the agentic workflow

   * Stop the agentic workflow
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ AgenticWorkflow is not running');
      return;
    }

    try {
      await this.unregisterAgent();
      await this.stopRuntime();
      
      this.isRunning = false;
      console.log(`🛑 AgenticWorkflow '${this.name}' stopped successfully`);
    } catch (error) {
      console.error('❌ Failed to stop AgenticWorkflow:', error);
      throw error;
    }
  }

  /**
   * Register an agent in the agents registry with transactional consistency
   * 
   * PYTHON EQUIVALENT: AgenticWorkflow.register_agent() (lines 266-336 in agentic.py)
   */
  public async registerAgentInRegistry(
    storeName: string, 
    storeKey: string, 
    agentName: string, 
    agentMetadata: Record<string, any>
  ): Promise<void> {
    if (!this.daprClient) {
      throw new Error('Dapr client not initialized');
    }

    // Retry logic similar to Python version
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Get current state with etag for optimistic concurrency
        const response = await this.daprClient.state.get(storeName, storeKey);
        
        let existingData: Record<string, any> = {};
        let etag: string | undefined;
        
        if (response) {
          existingData = typeof response === 'string' ? JSON.parse(response) : response;
          // Note: Dapr Node.js client doesn't expose etag in the same way as Python
          // This is a simplified version - in production you'd need proper etag handling
        }
        
        // Check if agent is already registered
        if (existingData[agentName]) {
          console.log(`🔄 Agent ${agentName} already registered.`);
          return;
        }
        
        // Merge new agent data
        const mergedData = {
          ...existingData,
          [agentName]: agentMetadata,
        };
        
        console.log(`📋 Registering agent data:`, { agentName, mergedData });
        
        // Save with transactional consistency
        await this.daprClient.state.save(storeName, [{ 
          key: storeKey, 
          value: JSON.stringify(mergedData),
          // Note: Node.js client doesn't support etag in the same way
          // This would need to be enhanced for production use
        }]);
        
        console.log(`✅ Successfully registered agent ${agentName} in registry`);
        return;
        
      } catch (error) {
        console.error(`❌ Error on registration attempt ${attempt}:`, error);
        if (attempt < maxAttempts) {
          console.log('⏳ Sleeping for 1 second before retrying...');
          await this.wait(1000);
        }
      }
    }
    
    throw new Error(`Failed to register agent ${agentName} after ${maxAttempts} attempts`);
  }

  /**
   * Register this agentic system in the agents registry
   * 
   * PYTHON EQUIVALENT: AgenticWorkflow.register_agentic_system() (lines 337-353 in agentic.py)
   */
  public async registerAgenticSystem(): Promise<void> {
    try {
      if (!this.agentMetadata) {
        throw new Error('Agent metadata not initialized');
      }
      
      await this.registerAgentInRegistry(
        this.agentsRegistryStoreName,
        this.agentsRegistryKey,
        this.name,
        this.agentMetadata
      );
      
      console.log(`🔐 Registered agentic system '${this.name}' successfully`);
    } catch (error) {
      console.error(`❌ Failed to register metadata for agent ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Pretty-print an interaction between two agents
   * 
   * PYTHON EQUIVALENT: AgenticWorkflow.print_interaction() (lines 245-264 in agentic.py)
   */
  public printInteraction(
    senderAgentName: string, 
    recipientAgentName: string, 
    message: string
  ): void {
    const separator = '-'.repeat(80);
    
    // Simple colored output (in a real implementation, you'd use a proper color library)
    console.log(`\n${senderAgentName} -> ${recipientAgentName}\n`);
    console.log(`${message}\n`);
    console.log(`${separator}\n`);
  }

  /**
   * Run a workflow instance triggered by HTTP request data
   * 
   * PYTHON EQUIVALENT: AgenticWorkflow.run_workflow_from_request() (lines 355-406 in agentic.py)
   */
  public async runWorkflowFromRequest(requestData: {
    query?: { name?: string };
    body?: any;
    headers?: Record<string, string>;
  }): Promise<{ success: boolean; data?: any; error?: string; status: number }> {
    try {
      const workflowName = requestData.query?.name || this.workflowName;
      
      if (!workflowName) {
        return {
          success: false,
          error: 'No workflow name specified.',
          status: 400
        };
      }

      if (!this.getWorkflow(workflowName)) {
        return {
          success: false,
          error: `Unknown workflow '${workflowName}'. Available: ${Array.from(this.workflows.keys()).join(', ')}`,
          status: 400
        };
      }

      let inputData: any;
      try {
        // Try to parse as CloudEvent or regular JSON
        inputData = requestData.body || {};
      } catch (error) {
        inputData = {};
      }

      console.log(`🚀 Starting workflow '${workflowName}' with input:`, inputData);
      
      const instanceId = await this.startWorkflow(workflowName, inputData);
      
      // Monitor workflow completion in background
      this.monitorWorkflowCompletion(instanceId);

      return {
        success: true,
        data: {
          message: 'Workflow initiated successfully.',
          workflowInstanceId: instanceId,
        },
        status: 202
      };
      
    } catch (error) {
      console.error(`❌ Error starting workflow:`, error);
      return {
        success: false,
        error: 'Failed to start workflow',
        data: { details: (error as Error).message },
        status: 500
      };
    }
  }

  /**
   * Monitor workflow completion and handle results
   */
  private async monitorWorkflowCompletion(instanceId: string): Promise<void> {
    try {
      console.log(`👀 Monitoring workflow completion for instance: ${instanceId}`);
      
      const result = await this.waitForWorkflowCompletion(instanceId);
      
      console.log(`✅ Workflow ${instanceId} completed with result:`, result);
      
      // You can add custom completion handling here
      // e.g., publishing results, updating state, etc.
      
    } catch (error) {
      console.error(`❌ Error monitoring workflow ${instanceId}:`, error);
    }
  }

  /**
   * Enhanced start method that includes agent registration
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ AgenticWorkflow is already running');
      return;
    }

    try {
      await this.startRuntime();
      await this.registerAgenticSystem(); // This was the missing critical piece!
      
      this.isRunning = true;
      console.log(`🚀 AgenticWorkflow '${this.name}' started successfully`);
    } catch (error) {
      console.error('❌ Failed to start AgenticWorkflow:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown with cleanup
   */
  public async gracefulShutdown(): Promise<void> {
    console.log('🔄 Initiating graceful shutdown of AgenticWorkflow...');
    
    try {
      await this.saveState();
      await this.stop();
      await super.gracefulShutdown();
      
      console.log('✅ AgenticWorkflow graceful shutdown completed');
    } catch (error) {
      console.error('❌ Error during AgenticWorkflow shutdown:', error);
      throw error;
    }
  }
}