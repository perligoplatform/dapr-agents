import { z } from 'zod';
import { WorkflowContext } from '@dapr/dapr';
import { AgentBase } from '../../base/agent.js';
import { ChatClientBase } from '../../llm/chat.js';

/**
 * Configuration for task decorator
 */
export const TaskConfigSchema = z.object({
  name: z.string().optional().describe('Optional custom task name. Defaults to the function name.'),
  description: z.string().optional().describe('Optional prompt template for LLM-based execution.'),
  agent: z.custom<AgentBase>().optional().describe('Optional agent to handle the task instead of an LLM or function.'),
  llm: z.custom<ChatClientBase>().optional().describe('Optional LLM client used to execute the task.'),
  includeChatHistory: z.boolean().default(false).describe('Whether to include prior messages in LLM calls.'),
  structuredMode: z.enum(['json', 'function_call']).default('json').describe('Mode for structured output'),
  timeout: z.number().optional().describe('Task execution timeout in seconds'),
  retryCount: z.number().default(3).describe('Number of retry attempts'),
  returnType: z.any().optional().describe('Expected return type for validation'),
});

export type TaskConfig = z.infer<typeof TaskConfigSchema>;

/**
 * Metadata attached to task functions
 */
export interface TaskMetadata {
  isTask: true;
  taskName: string;
  taskDescription?: string;
  taskAgent?: AgentBase;
  taskLlm?: ChatClientBase;
  taskIncludeChatHistory: boolean;
  explicitLlm: boolean;
  taskKwargs: Record<string, any>;
}

/**
 * Configuration for workflow decorator
 */
export const WorkflowConfigSchema = z.object({
  name: z.string().optional().describe('The name to register the workflow with.'),
});

export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;

/**
 * Metadata attached to workflow functions
 */
export interface WorkflowMetadata {
  isWorkflow: true;
  workflowName: string;
}

/**
 * Type guard to check if a function is a task
 * PYTHON EQUIVALENT: Checking for ._is_task attribute in core.py
 */
export function isTaskFunction(func: any): func is Function & TaskMetadata {
  return typeof func === 'function' && func.isTask === true;
}

/**
 * Type guard to check if a function is a workflow
 * PYTHON EQUIVALENT: Checking for ._is_workflow attribute in core.py
 */
export function isWorkflowFunction(func: any): func is Function & WorkflowMetadata {
  return typeof func === 'function' && func.isWorkflow === true;
}

/**
 * Task decorator factory function.
 * 
 * This allows configuring a task with an LLM, agent, chat history, and other options.
 * All additional keyword arguments are stored and forwarded to the WorkflowTask constructor.
 * 
 * PYTHON EQUIVALENT: @task decorator in core.py lines 6-74
 * 
 * @param config Task configuration options
 * @returns Decorator function that attaches task metadata
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const myTask = task()((input: string) => {
 *   return `Processed: ${input}`;
 * });
 * 
 * // With configuration
 * const llmTask = task({
 *   name: "analyze_data",
 *   description: "Analyze the provided data using AI",
 *   includeChatHistory: true
 * })<DataInput, AnalysisResult>((input: DataInput) => {
 *   // This will be executed by LLM due to description
 * });
 * 
 * // With agent
 * const agentTask = task({
 *   agent: myAgent,
 *   retryCount: 5
 * })((input: any) => {
 *   // This will be executed by the agent
 * });
 * ```
 */
export function task<TInput = any, TOutput = any>(
  config: Partial<TaskConfig> = {}
) {
  return function<TFunc extends (...args: any[]) => any>(
    func: TFunc
  ): TFunc & TaskMetadata {
    if (typeof func !== 'function') {
      throw new Error(`@task must be applied to a function, got ${typeof func}.`);
    }

    const taskConfig = TaskConfigSchema.partial().parse(config);
    
    // Create decorated function with metadata (similar to Python's approach)
    const decoratedFunc = func as TFunc & TaskMetadata;
    
    // Attach task metadata (PYTHON EQUIVALENT: lines 40-47 in core.py)
    decoratedFunc.isTask = true;
    decoratedFunc.taskName = taskConfig.name || func.name;
    decoratedFunc.taskDescription = taskConfig.description;
    decoratedFunc.taskAgent = taskConfig.agent;
    decoratedFunc.taskLlm = taskConfig.llm;
    decoratedFunc.taskIncludeChatHistory = taskConfig.includeChatHistory ?? false;
    decoratedFunc.explicitLlm = taskConfig.llm !== undefined || Boolean(taskConfig.description);
    decoratedFunc.taskKwargs = {
      structuredMode: taskConfig.structuredMode,
      timeout: taskConfig.timeout,
      retryCount: taskConfig.retryCount,
      returnType: taskConfig.returnType,
      ...Object.fromEntries(
        Object.entries(taskConfig).filter(([key]) => 
          !['name', 'description', 'agent', 'llm', 'includeChatHistory'].includes(key)
        )
      )
    };

    return decoratedFunc;
  };
}

/**
 * Alternative task decorator that accepts description as first parameter
 * PYTHON EQUIVALENT: Supports @task("some description") syntax from core.py
 */
export function taskWithDescription(description: string, config: Partial<TaskConfig> = {}) {
  return task({ description, ...config });
}

/**
 * Workflow decorator factory function.
 * 
 * Attaches workflow metadata for discovery and registration.
 * Works seamlessly with standalone functions, instance methods, and class methods.
 * 
 * PYTHON EQUIVALENT: @workflow decorator in core.py lines 76-119
 * 
 * @param config Workflow configuration options
 * @returns Decorator function that attaches workflow metadata
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const myWorkflow = workflow()((ctx: WorkflowContext, input: any) => {
 *   // workflow logic
 *   return "result";
 * });
 * 
 * // With custom name
 * const namedWorkflow = workflow({
 *   name: "custom_workflow_name"
 * })((ctx: WorkflowContext, input: WorkflowInput) => {
 *   // workflow logic with typed input
 *   return processWorkflow(input);
 * });
 * ```
 */
export function workflow<TInput = any, TOutput = any>(
  config: Partial<WorkflowConfig> = {}
) {
  return function<TFunc extends (ctx: WorkflowContext, input: TInput) => TOutput>(
    func: TFunc
  ): TFunc & WorkflowMetadata {
    if (typeof func !== 'function') {
      throw new Error(`@workflow must be applied to a function, got ${typeof func}.`);
    }

    const workflowConfig = WorkflowConfigSchema.partial().parse(config);
    
    // Create decorated function with metadata (similar to Python's approach)
    const decoratedFunc = func as TFunc & WorkflowMetadata;
    
    // Attach workflow metadata (PYTHON EQUIVALENT: lines 100-103 in core.py)
    decoratedFunc.isWorkflow = true;
    decoratedFunc.workflowName = workflowConfig.name || func.name;

    return decoratedFunc;
  };
}

/**
 * Extract task configuration from a decorated function
 * PYTHON EQUIVALENT: Reading ._task_* attributes from decorated functions
 */
export function getTaskConfig(func: Function & TaskMetadata): TaskConfig {
  return {
    name: func.taskName,
    description: func.taskDescription,
    agent: func.taskAgent,
    llm: func.taskLlm,
    includeChatHistory: func.taskIncludeChatHistory,
    structuredMode: func.taskKwargs.structuredMode || 'json',
    retryCount: func.taskKwargs.retryCount || 3,
    timeout: func.taskKwargs.timeout,
    returnType: func.taskKwargs.returnType,
    ...func.taskKwargs
  };
}

/**
 * Extract workflow configuration from a decorated function
 * PYTHON EQUIVALENT: Reading ._workflow_* attributes from decorated functions
 */
export function getWorkflowConfig(func: Function & WorkflowMetadata): WorkflowConfig {
  return {
    name: func.workflowName
  };
}

/**
 * Discover all task functions from an object or module
 * PYTHON EQUIVALENT: WorkflowApp._discover_tasks() method in base.py line 168
 */
export function discoverTasks(target: any): Record<string, Function & TaskMetadata> {
  const tasks: Record<string, Function & TaskMetadata> = {};
  
  if (!target || typeof target !== 'object') {
    return tasks;
  }
  
  // Get all property names including inherited ones
  const allProps = new Set<string>();
  let current = target;
  
  while (current && current !== Object.prototype) {
    Object.getOwnPropertyNames(current).forEach(prop => allProps.add(prop));
    current = Object.getPrototypeOf(current);
  }
  
  for (const prop of Array.from(allProps)) {
    try {
      const value = target[prop];
      if (isTaskFunction(value)) {
        tasks[value.taskName] = value;
      }
    } catch (error) {
      // Skip properties that can't be accessed
      continue;
    }
  }
  
  return tasks;
}

/**
 * Discover all workflow functions from an object or module
 * PYTHON EQUIVALENT: WorkflowApp._discover_workflows() method in base.py line 422
 */
export function discoverWorkflows(target: any): Record<string, Function & WorkflowMetadata> {
  const workflows: Record<string, Function & WorkflowMetadata> = {};
  
  if (!target || typeof target !== 'object') {
    return workflows;
  }
  
  // Get all property names including inherited ones
  const allProps = new Set<string>();
  let current = target;
  
  while (current && current !== Object.prototype) {
    Object.getOwnPropertyNames(current).forEach(prop => allProps.add(prop));
    current = Object.getPrototypeOf(current);
  }
  
  for (const prop of Array.from(allProps)) {
    try {
      const value = target[prop];
      if (isWorkflowFunction(value)) {
        workflows[value.workflowName] = value;
      }
    } catch (error) {
      // Skip properties that can't be accessed
      continue;
    }
  }
  
  return workflows;
}