import { z } from 'zod';
import { 
  WorkflowRuntime, 
  DaprWorkflowClient, 
  WorkflowActivityContext, 
  WorkflowContext,
  WorkflowState,
  WorkflowRuntimeStatus
} from '@dapr/dapr';
import { ChatClientBase } from '../llm/chat.js';
import { getDefaultLLM } from '../llm/utils/defaults.js';
import { DaprWorkflowStatus } from '../types/workflow.js';
import { WorkflowTask } from './task.js';

/**
 * Configuration schema for WorkflowApp
 */
export const WorkflowAppConfigSchema = z.object({
  llm: z.custom<ChatClientBase>().optional().describe('The default LLM client for tasks that explicitly require an LLM but don\'t specify one (optional).'),
  timeout: z.number().optional().default(300).describe('Default timeout duration in seconds for workflow tasks.'),
});

export type WorkflowAppConfig = z.infer<typeof WorkflowAppConfigSchema>;

/**
 * A TypeScript class to encapsulate a Dapr Workflow runtime and manage workflows and tasks.
 * 
 * This is the TypeScript equivalent of the Python WorkflowApp class from dapr_agents.workflow.base
 */
export class WorkflowApp {
  public llm?: ChatClientBase;
  public timeout: number;
  
  // Runtime components
  public wfRuntime?: WorkflowRuntime;
  public wfRuntimeIsRunning?: boolean;
  public wfClient?: DaprWorkflowClient;
  public tasks: Map<string, Function> = new Map();
  public workflows: Map<string, Function> = new Map();

  private shutdownHandlers: Set<() => void> = new Set();

  constructor(config: Partial<WorkflowAppConfig> = {}) {
    this.llm = config.llm;
    this.timeout = config.timeout ?? 300;
    
    // Initialize synchronously - runtime will be started later
    this.initializeSync();
  }

  /**
   * Synchronous initialization of basic components
   */
  private initializeSync(): void {
    // Initialize LLM first
    if (!this.llm) {
      this.llm = getDefaultLLM();
    }

    // Initialize clients and runtime
    this.wfRuntime = new WorkflowRuntime();
    this.wfRuntimeIsRunning = false;
    this.wfClient = new DaprWorkflowClient();
    
    console.log('WorkflowApp initialized; ready for workflow and task registration.');

    // Set up automatic signal handlers for graceful shutdown
    try {
      this.setupSignalHandlers();
    } catch (error) {
      console.warn(`Could not set up signal handlers: ${error}`);
    }
  }


  /**
   * Start the workflow runtime
   * PYTHON EQUIVALENT: start_runtime method in base.py line 512
   */
  public async startRuntime(): Promise<void> {
    if (this.wfRuntime && !this.wfRuntimeIsRunning) {
      try {
        await this.wfRuntime.start();
        this.wfRuntimeIsRunning = true;
        console.log('✅ Workflow runtime started successfully');
      } catch (error) {
        console.error('❌ Failed to start workflow runtime:', error);
        throw error;
      }
    }
  }

  /**
   * Stop the workflow runtime
   * PYTHON EQUIVALENT: stop_runtime method in base.py line 900
   */
  public async stopRuntime(): Promise<void> {
    if (this.wfRuntime && this.wfRuntimeIsRunning) {
      try {
        await this.wfRuntime.stop();
        this.wfRuntimeIsRunning = false;
        console.log('✅ Workflow runtime stopped successfully');
      } catch (error) {
        console.error('❌ Failed to stop workflow runtime:', error);
        throw error;
      }
    }
  }

  /**
   * Perform graceful shutdown operations for the WorkflowApp
   * PYTHON EQUIVALENT: graceful_shutdown method in base.py line 94
   */
  public async gracefulShutdown(): Promise<void> {
    console.log('Initiating graceful shutdown of WorkflowApp...');

    try {
      if (this.wfRuntimeIsRunning) {
        console.log('Shutting down workflow runtime...');
        await this.stopRuntime();
        console.log('Workflow runtime stopped successfully.');
      }

      // Execute all shutdown handlers
      for (const handler of this.shutdownHandlers) {
        try {
          handler();
        } catch (error) {
          console.error('Error in shutdown handler:', error);
        }
      }
    } catch (error) {
      console.error(`Error during workflow runtime shutdown: ${error}`);
    }
  }

  /**
   * Set up signal handlers for graceful shutdown
   * PYTHON EQUIVALENT: setup_shutdown_handlers method in base.py line 124
   */
  private setupSignalHandlers(): void {
    const handleShutdown = async () => {
      await this.gracefulShutdown();
      process.exit(0);
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    
    console.log('Shutdown signal handlers configured for WorkflowApp.');
  }

  /**
   * Add a shutdown handler
   */
  public addShutdownHandler(handler: () => void): void {
    this.shutdownHandlers.add(handler);
  }

  /**
   * Remove a shutdown handler
   */
  public removeShutdownHandler(handler: () => void): void {
    this.shutdownHandlers.delete(handler);
  }

  /**
   * Choose the appropriate LLM for a given method
   * PYTHON EQUIVALENT: _choose_llm_for method in base.py line 149
   */
  private chooseLLMFor(method: Function): ChatClientBase | undefined {
    // Implementation to choose the right LLM based on method metadata
    // This would check for method-specific LLM configuration
    return this.llm; // Default to instance LLM for now
  }

  /**
   * Register a task with the workflow runtime
   * PYTHON EQUIVALENT: register_task method in base.py line 182 and _register_tasks in line 344
   */
  public registerTask(name: string, taskFunction: Function): void {
    this.tasks.set(name, taskFunction);
    
    if (this.wfRuntime) {
      // Register with Dapr workflow runtime using the correct API
      // The activity function wrapper handles the context and input properly
      this.wfRuntime.registerActivityWithName(name, async (context: WorkflowActivityContext, input: any) => {
        console.log(`🔧 Executing task: ${name} with input:`, input);
        try {
          const result = await taskFunction(input);
          console.log(`✅ Task ${name} completed with result:`, result);
          return result;
        } catch (error) {
          console.error(`❌ Task ${name} failed:`, error);
          throw error;
        }
      });
    }
    
    console.log(`📋 Registered task: ${name}`);
  }

  /**
   * Register a workflow with the workflow runtime
   * PYTHON EQUIVALENT: _register_workflows method in base.py line 434
   */
  public registerWorkflow(name: string, workflowFunction: (context: WorkflowContext, input: any) => any): void {
    this.workflows.set(name, workflowFunction);
    
    if (this.wfRuntime) {
      // Register with Dapr workflow runtime using the correct API
      this.wfRuntime.registerWorkflowWithName(name, workflowFunction);
    }
    
    console.log(`🔄 Registered workflow: ${name}`);
  }

  /**
   * Get a registered task by name
   * PYTHON EQUIVALENT: resolve_task method in base.py line 452
   */
  public getTask(name: string): Function | undefined {
    return this.tasks.get(name);
  }

  /**
   * Get a registered workflow by name
   * PYTHON EQUIVALENT: resolve_workflow method in base.py line 480
   */
  public getWorkflow(name: string): Function | undefined {
    return this.workflows.get(name);
  }

  /**
   * Start a workflow instance
   * PYTHON EQUIVALENT: run_workflow method in base.py line 909
   */
  public async startWorkflow(
    workflowName: string,
    input?: any,
    instanceId?: string
  ): Promise<string> {
    if (!this.wfClient) {
      throw new Error('Workflow client not initialized');
    }

    try {
      const actualInstanceId = instanceId || `${workflowName}-${Date.now()}`;
      await this.wfClient.scheduleNewWorkflow(workflowName, input, actualInstanceId);
      console.log(`🚀 Started workflow '${workflowName}' with instance ID: ${actualInstanceId}`);
      return actualInstanceId;
    } catch (error) {
      console.error(`❌ Failed to start workflow '${workflowName}':`, error);
      throw error;
    }
  }

  /**
   * Get workflow status
   * PYTHON EQUIVALENT: get_workflow_state method in base.py line 1135
   */
  public async getWorkflowStatus(instanceId: string): Promise<WorkflowState | undefined> {
    if (!this.wfClient) {
      throw new Error('Workflow client not initialized');
    }

    try {
      const state = await this.wfClient.getWorkflowState(instanceId, true);
      console.log(`📊 Retrieved workflow status for ${instanceId}`);
      return state;
    } catch (error) {
      console.error(`❌ Failed to get workflow status for ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Wait for workflow completion
   * PYTHON EQUIVALENT: wait_for_workflow_completion method in base.py line 1158
   */
  public async waitForWorkflowCompletion(
    instanceId: string,
    timeoutMs?: number
  ): Promise<any> {
    if (!this.wfClient) {
      throw new Error('Workflow client not initialized');
    }

    try {
      const result = await this.wfClient.waitForWorkflowCompletion(instanceId, true, timeoutMs ? Math.floor(timeoutMs / 1000) : 60);
      console.log(`✅ Workflow ${instanceId} completed`);
      return result;
    } catch (error) {
      console.error(`❌ Workflow ${instanceId} failed or timed out:`, error);
      throw error;
    }
  }

  /**
   * Terminate a workflow instance
   * PYTHON EQUIVALENT: terminate_workflow method in base.py line 1113
   */
  public async terminateWorkflow(instanceId: string, reason?: string): Promise<void> {
    if (!this.wfClient) {
      throw new Error('Workflow client not initialized');
    }

    try {
      await this.wfClient.terminateWorkflow(instanceId, reason);
      console.log(`🛑 Terminated workflow ${instanceId}: ${reason || 'No reason provided'}`);
    } catch (error) {
      console.error(`❌ Failed to terminate workflow ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Async context manager entry
   */
  public async enter(): Promise<WorkflowApp> {
    this.setupSignalHandlers();
    return this;
  }

  /**
   * Async context manager exit
   */
  public async exit(): Promise<void> {
    await this.gracefulShutdown();
  }
}