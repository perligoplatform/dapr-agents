import { WorkflowContext } from '@dapr/dapr';
import { z } from 'zod';
import { OrchestratorWorkflowBase, OrchestratorWorkflowConfig } from '../base.js';
import { 
  LLMWorkflowState, 
  PlanStep,
  LLMWorkflowMessage,
  createLLMWorkflowMessage
} from './state.js';
import { 
  NextStepSchema,
  ProgressCheckOutputSchema,
  type NextStep,
  type ProgressCheckOutput,
  type AgentTaskResponse
} from './schemas.js';
import {
  TASK_PLANNING_PROMPT,
  TASK_INITIAL_PROMPT,
  NEXT_STEP_PROMPT,
  PROGRESS_CHECK_PROMPT,
  SUMMARY_GENERATION_PROMPT,
  formatPrompt
} from './prompts.js';
import {
  findStepInPlan,
  updateStepStatuses,
  formatPlanForPrompt,
  createBroadcastMessage,
  createTriggerAction
} from './utils.js';

// Simple TriggerAction interface since it's not defined elsewhere
interface TriggerAction {
  task: string;
  instanceId?: string;
}

/**
 * Configuration for LLM Orchestrator
 */
export interface LLMOrchestratorConfig extends OrchestratorWorkflowConfig {
  maxIterations: number;
}

/**
 * LLM-driven workflow orchestrator that uses AI agents to manage complex multi-step tasks.
 * 
 * This orchestrator employs a sophisticated conversation-based approach where:
 * - Tasks are decomposed into structured execution plans
 * - Multiple AI agents collaborate on different aspects
 * - Progress is continuously monitored and adjusted
 * - Conversations are maintained across workflow iterations
 * 
 * PYTHON EQUIVALENT: LLMOrchestrator class from orchestrator.py
 */
export class LLMOrchestrator extends OrchestratorWorkflowBase {
  public readonly maxIterations: number;
  public readonly state: LLMWorkflowState;

  constructor(config: LLMOrchestratorConfig) {
    super(config);
    
    this.maxIterations = config.maxIterations;
    this.state = {
      instances: {}
    };
    
    this.initializeLLMOrchestrator();
  }

  /**
   * Initialize the LLM orchestrator with task registrations.
   * PYTHON EQUIVALENT: model_post_init method in orchestrator.py line 127
   */
  private async initializeLLMOrchestrator(): Promise<void> {
    // Register the main workflow
    this.registerWorkflow('llm_main_workflow', this.mainWorkflow.bind(this));
    
    // Register all required tasks
    this.registerTask('getAgentsMetadataAsString', this.getAgentsMetadataAsString.bind(this));
    this.registerTask('generatePlan', this.generatePlan.bind(this));
    this.registerTask('prepareInitialMessage', this.prepareInitialMessage.bind(this));
    this.registerTask('broadcastMessageToAgents', this.broadcastMessageToAgents.bind(this));
    this.registerTask('generateNextStep', this.generateNextStep.bind(this));
    this.registerTask('validateNextStep', this.validateNextStep.bind(this));
    this.registerTask('triggerAgentTask', this.triggerAgentTask.bind(this));
    this.registerTask('checkProgress', this.checkProgress.bind(this));
    this.registerTask('updateTaskHistory', this.updateTaskHistory.bind(this));
    this.registerTask('updatePlan', this.updatePlan.bind(this));
    this.registerTask('generateSummary', this.generateSummary.bind(this));
    this.registerTask('finishWorkflow', this.finishWorkflow.bind(this));
  }

  /**
   * Main LLM workflow that coordinates multi-agent task execution.
   * 
   * This workflow implements a sophisticated conversation loop that:
   * 1. Creates initial task plans using LLM planning
   * 2. Manages multi-turn agent conversations
   * 3. Tracks progress and adjusts plans dynamically
   * 4. Handles error recovery and workflow completion
   * 
   * PYTHON EQUIVALENT: main_workflow method in orchestrator.py line 141-286
   * 
   * @param ctx Workflow context
   * @param input Trigger action with task details
   * @returns Final workflow output as string
   */
  public async mainWorkflow(ctx: WorkflowContext, input: TriggerAction): Promise<string> {
    const task = input.task;
    const instanceId = (ctx as any).instanceId || 'unknown';

    if (!ctx.isReplaying) {
      console.log(`🧠 Starting LLM Workflow for instance: ${instanceId}`);
    }

    // Initialize workflow state
    this.state.instances[instanceId] = {
      input: task,
      messages: [],
      plan: [],
      startTime: new Date().toISOString(),
      lastMessage: undefined,
      output: undefined,
      endTime: undefined,
      taskHistory: []
    };

    // Step 1: Get available agents metadata
    const agents = await (ctx as any).callActivity('getAgentsMetadataAsString');

    // Step 2: Generate initial execution plan
    let plan: PlanStep[] = await (ctx as any).callActivity('generatePlan', {
      task,
      agents,
      planSchema: 'Execution plan schema'
    });

    // Step 3: Prepare and broadcast initial message
    const initialMessage = await (ctx as any).callActivity('prepareInitialMessage', {
      instanceId,
      task,
      agents,
      plan
    });

    await (ctx as any).callActivity('broadcastMessageToAgents', {
      instanceId,
      task: initialMessage
    });

    // Step 4: Main conversation loop
    let currentTask = task;
    for (let turn = 1; turn <= this.maxIterations; turn++) {
      if (!ctx.isReplaying) {
        console.log(`LLM workflow turn ${turn}/${this.maxIterations} (Instance ID: ${instanceId})`);
      }

      // Generate next step using LLM
      const nextStep: NextStep = await (ctx as any).callActivity('generateNextStep', {
        task: currentTask,
        agents,
        plan: formatPlanForPrompt(plan),
        nextStepSchema: 'Next step schema'
      });

      const stepId = nextStep.step;
      const substepId = nextStep.substep;

      // Validate the step exists in the plan
      const isValidStep = await (ctx as any).callActivity('validateNextStep', {
        instanceId,
        plan,
        step: stepId,
        substep: substepId
      });

      if (isValidStep) {
        // Trigger the specific agent
        plan = await (ctx as any).callActivity('triggerAgentTask', {
          instanceId,
          name: nextStep.nextAgent,
          step: stepId,
          substep: substepId
        });

        // Wait for agent response
        let eventData;
        try {
          eventData = await ctx.waitForExternalEvent('AgentTaskResponse');
        } catch (error) {
          if (!ctx.isReplaying) {
            console.warn(`Timeout waiting for agent response in turn ${turn}`);
          }
          continue;
        }

        const taskResults = eventData as unknown as AgentTaskResponse;

        // Check progress and determine next action
        const progressCheck: ProgressCheckOutput = await (ctx as any).callActivity('checkProgress', {
          task: currentTask,
          plan: formatPlanForPrompt(plan),
          lastAgentResponse: taskResults.content
        });

        // Update task history
        await (ctx as any).callActivity('updateTaskHistory', {
          instanceId,
          taskResults
        });

        // Handle progress verdict
        if (progressCheck.verdict === 'completed') {
          const summary = await (ctx as any).callActivity('generateSummary', {
            task: currentTask,
            plan: formatPlanForPrompt(plan)
          });

          await (ctx as any).callActivity('finishWorkflow', {
            instanceId,
            summary
          });

          return summary;
        } else if (progressCheck.verdict === 'continue') {
          if (progressCheck.planNeedsUpdate) {
            await (ctx as any).callActivity('updatePlan', {
              instanceId,
              currentPlan: plan,
              lastAgentResponse: taskResults.content
            });
          }
          // Prepare next turn
          currentTask = taskResults.content;
        } else {
          if (!ctx.isReplaying) {
            console.warn(`Invalid step ${stepId}/${substepId} in plan for instance ${instanceId}. Retrying...`);
          }
          // Recovery Task: No updates, just iterate again
          const recoveryResults = {
            name: this.name,
            role: 'user',
            content: `Step ${stepId}, Substep ${substepId} does not exist in the plan. Adjusting workflow...`
          };
          currentTask = recoveryResults.content;
        }
      }
    }

    // Should never reach here
    throw new Error(`LLMWorkflow ${instanceId} exited without summary`);
  }

  /**
   * Retrieves and formats metadata about available agents.
   * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/orchestrator.py:288-304 (get_agents_metadata_as_string)
   */
  public getAgentsMetadataAsString(): string {
    const agentsMetadata = this.getAgentsMetadata(true); // excludeOrchestrator = true
    if (!agentsMetadata || Object.keys(agentsMetadata).length === 0) {
      return 'No available agents to assign tasks.';
    }

    // Format agent details into a readable string
    const agentList = Object.entries(agentsMetadata)
      .map(([name, metadata]) => 
        `- ${name}: ${(metadata as any).role || 'Unknown role'} (Goal: ${(metadata as any).goal || 'Unknown'})`
      )
      .join('\n');

    return agentList;
  }

  /**
   * Generates a structured execution plan for the given task.
   * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/orchestrator.py:306-322 (generate_plan)
   */
  public async generatePlan(input: {
    task: string;
    agents: string;
    planSchema: string;
  }): Promise<PlanStep[]> {
    // This is a placeholder - in real implementation, this would call the LLM
    // to generate a plan based on the task and available agents
    
    // For now, return a simple default plan structure
    return [
      {
        step: 1,
        description: `Analyze the task: ${input.task}`,
        status: 'not_started'
      },
      {
        step: 2,
        description: 'Execute the main task components',
        status: 'not_started'
      },
      {
        step: 3,
        description: 'Review and finalize results',
        status: 'not_started'
      }
    ];
  }

  /**
   * Initializes the workflow entry and sends the first task briefing to all agents.
   * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/orchestrator.py:324-347 (prepare_initial_message)
   */
  public async prepareInitialMessage(input: {
    instanceId: string;
    task: string;
    agents: string;
    plan: PlanStep[];
  }): Promise<string> {
    // Format Initial Message with the Plan
    const formattedMessage = formatPrompt(TASK_INITIAL_PROMPT, {
      task: input.task,
      agents: input.agents,
      plan: formatPlanForPrompt(input.plan)
    });

    // Save initial plan using updateWorkflowState for consistency
    await this.updateWorkflowState({
      instanceId: input.instanceId,
      plan: input.plan
    });

    // Return formatted prompt
    return formattedMessage;
  }

  /**
   * Saves message to workflow state and broadcasts it to all registered agents.
   * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/orchestrator.py:349-370 (broadcast_message_to_agents)
   */
  public async broadcastMessageToAgents(input: {
    instanceId: string;
    task: string;
  }): Promise<void> {
    // Ensure message is a string
    if (typeof input.task !== 'string') {
      throw new Error('Message must be a string.');
    }

    // Store message in workflow state
    await this.updateWorkflowState({
      instanceId: input.instanceId,
      message: {
        name: this.name,
        role: 'user',
        content: input.task
      }
    });

    // Format message for broadcasting
    const taskMessage = createBroadcastMessage(this.name, 'user', input.task);

    // Send broadcast message
    await this.broadcastMessage(taskMessage);
  }

  /**
   * Determines the next agent to respond in a workflow.
   * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/orchestrator.py:372-388 (generate_next_step)
   */
  public async generateNextStep(input: {
    task: string;
    agents: string;
    plan: string;
    nextStepSchema: string;
  }): Promise<NextStep> {
    // This is a placeholder - in real implementation, this would call the LLM
    // to determine the next step based on the current state
    
    // For now, return a simple next step
    return {
      nextAgent: 'default-agent',
      instruction: 'Continue with the next step in the plan',
      step: 1,
      substep: undefined
    };
  }

  /**
   * Validates if the next step exists in the current execution plan.
   * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/orchestrator.py:390-408 (validate_next_step)
   */
  public async validateNextStep(input: {
    instanceId: string;
    plan: PlanStep[];
    step: number;
    substep?: number;
  }): Promise<boolean> {
    const stepEntry = findStepInPlan(input.plan, input.step, input.substep);
    if (!stepEntry) {
      console.error(
        `Step ${input.step}, Substep ${input.substep} not found in plan for instance ${input.instanceId}.`
      );
      return false;
    }
    return true;
  }

  /**
   * Updates step status and triggers the specified agent to perform its activity.
   * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/orchestrator.py:410-455 (trigger_agent)
   */
  public async triggerAgentTask(input: {
    instanceId: string;
    name: string;
    step: number;
    substep?: number;
  }): Promise<PlanStep[]> {
    console.log(
      `Triggering agent ${input.name} for step ${input.step}, substep ${input.substep} (Instance ID: ${input.instanceId})`
    );

    // Get the workflow entry from state
    const workflowEntry = this.state.instances[input.instanceId];
    if (!workflowEntry) {
      throw new Error(`No workflow entry found for instance_id: ${input.instanceId}`);
    }

    const plan = workflowEntry.plan || [];

    // Ensure step or substep exists
    const stepEntry = findStepInPlan(plan, input.step, input.substep);
    if (!stepEntry) {
      if (input.substep !== undefined) {
        throw new Error(
          `Substep ${input.substep} in Step ${input.step} not found in the current plan.`
        );
      }
      throw new Error(`Step ${input.step} not found in the current plan.`);
    }

    // Mark step or substep as "in_progress"
    stepEntry.status = 'in_progress';
    console.log(`Marked step ${input.step}, substep ${input.substep} as 'in_progress'`);

    // Apply global status updates to maintain consistency
    const updatedPlan = updateStepStatuses(plan);

    // Save updated plan state
    await this.updateWorkflowState({
      instanceId: input.instanceId,
      plan: updatedPlan
    });

    // Send message to agent
    // TODO: Implement direct messaging to agents
    console.log(`Would send direct message to agent ${input.name} with trigger action`);

    return updatedPlan;
  }

  /**
   * Implementation of the abstract method from base class.
   * PYTHON EQUIVALENT: Inherited from OrchestratorWorkflowBase
   */
  public async processAgentResponse(message: AgentTaskResponse): Promise<void> {
    try {
      const workflowInstanceId = message.workflowInstanceId;

      if (!workflowInstanceId) {
        console.error(
          `${this.name} received an agent response without a valid workflow_instance_id. Ignoring.`
        );
        return;
      }
      
      // Log the received response
      console.debug(`${this.name} received response for workflow ${workflowInstanceId}`);
      console.debug(`Full response: ${JSON.stringify(message)}`);
      
      // Raise a workflow event with the Agent's Task Response
      // Note: This would need to be implemented based on the Dapr workflow SDK
      // this.raiseWorkflowEvent(workflowInstanceId, 'AgentTaskResponse', message);

    } catch (error) {
      console.error(`Error processing agent response: ${error}`);
    }
  }

  /**
   * Implementation of the abstract method from base class.
   * Triggers a specific agent to perform an action.
   */
  public async triggerAgent(name: string, instanceId: string, kwargs?: Record<string, any>): Promise<void> {
    // Delegate to the internal triggerAgentTask method
    await this.triggerAgentTask({
      instanceId,
      name,
      step: kwargs?.step || 1,
      substep: kwargs?.substep
    });
  }

  // Additional placeholder methods that would need LLM implementation
  public async checkProgress(input: any): Promise<ProgressCheckOutput> {
    // Placeholder implementation
    return {
      verdict: 'continue',
      planNeedsUpdate: false
    };
  }

  public async updateTaskHistory(input: any): Promise<void> {
    // Placeholder implementation
    console.log('Updating task history...');
  }

  public async updatePlan(input: any): Promise<void> {
    // Placeholder implementation
    console.log('Updating plan...');
  }

  public async generateSummary(input: any): Promise<string> {
    // Placeholder implementation
    return 'Task summary generated.';
  }

  public async finishWorkflow(input: any): Promise<void> {
    // Placeholder implementation
    console.log('Finishing workflow...');
  }

  /**
   * Updates the workflow state with new data.
   * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/orchestrator.py:725-786 (update_workflow_state)
   */
  private async updateWorkflowState(input: {
    instanceId: string;
    message?: { name: string; role: string; content: string };
    finalOutput?: string;
    plan?: PlanStep[];
  }): Promise<void> {
    const workflowEntry = this.state.instances[input.instanceId];
    if (!workflowEntry) {
      throw new Error(
        `No workflow entry found for instance_id ${input.instanceId} in local state.`
      );
    }

    // Only update the provided fields
    if (input.plan) {
      workflowEntry.plan = input.plan;
    }
    
    if (input.message) {
      const serializedMessage = createLLMWorkflowMessage(
        input.message.role,
        input.message.content,
        input.message.name
      );

      // Update workflow state messages
      workflowEntry.messages.push(serializedMessage);
      workflowEntry.lastMessage = serializedMessage;

      // Update the local chat history
      if (this.memory?.addMessage) {
        this.memory.addMessage(input.message);
      }
    }

    if (input.finalOutput) {
      workflowEntry.output = input.finalOutput;
      workflowEntry.endTime = new Date().toISOString();
    }

    // Persist updated state (if available)
    if (this.saveState) {
      await this.saveState();
    }
  }
}